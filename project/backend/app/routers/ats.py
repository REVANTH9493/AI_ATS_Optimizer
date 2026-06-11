import os
import json
import httpx
import re
import time
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ValidationError
from typing import Optional, Dict, Any

from app.config import settings
from app.routers.auth import get_current_user
from app.supabase_client import supabase_client
from app.schemas.ats_schema import ATSOptimizeResponse
from app.utils.gemini_client import client as gemini_client, generate_chat_completion

router = APIRouter(prefix="/ats", tags=["ATS Optimization"])

def sanitize_filename_part(name: str) -> str:
    if not name:
        return "unknown"
    # Keep alphanumeric, dashes, and underscores
    sanitized = re.sub(r"[^\w\s\-]", "", name)
    sanitized = re.sub(r"\s+", "_", sanitized.strip())
    # Replace double underscores with single underscore
    sanitized = re.sub(r"__+", "_", sanitized)
    return sanitized or "unknown"

def _split_degree_and_gpa(degree_val: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    if not degree_val:
        return "", ""
    match = re.search(r"\(([^)]*(?:GPA|CGPA|%|gpa|cgpa|score|Grade|grade|\d+(?:\.\d+)?)[^)]*)\)$", degree_val)
    if match:
        gpa_val = match.group(1).strip()
        cleaned_degree = degree_val[:match.start()].strip()
        return cleaned_degree, gpa_val
    return degree_val, ""

def clean_and_truncate_jd(text: str, max_chars: int = 6000) -> str:
    """
    Cleans and prunes a job description text/markdown to minimize token count:
    - Removes markdown links/images syntax (converts [label](url) to label).
    - Removes raw URLs.
    - Strips lines that are just navigation, header/footer boilerplate.
    - Extracts core sections or truncates if it exceeds max_chars.
    """
    if not text:
        return ""
        
    # 1. Remove image markdown: ![alt](url) -> empty
    text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
    
    # 2. Convert links: [label](url) -> label
    text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
    
    # 3. Remove raw URLs
    text = re.sub(r'https?://\S+', '', text)
    
    # 4. Filter lines
    cleaned_lines = []
    lines = text.split('\n')
    for line in lines:
        line_strip = line.strip()
        if not line_strip:
            if cleaned_lines and cleaned_lines[-1]:
                cleaned_lines.append("")
            continue
            
        if re.search(r'^(Share on|Apply Now|Back to|Search Jobs|Jobs at|Cookie Policy|Privacy Policy|Terms of Service)', line_strip, re.IGNORECASE):
            continue
            
        if re.search(r'^(LinkedIn|Twitter|Facebook|Glassdoor|Instagram|YouTube)', line_strip, re.IGNORECASE):
            continue
            
        cleaned_lines.append(line_strip)
        
    text = "\n".join(cleaned_lines)
    
    # 5. Extract core sections if still too long
    if len(text) > max_chars:
        sections = []
        current_section = None
        is_relevant = False
        
        relevant_headers = re.compile(
            r'(responsibilit|requirement|qualification|what you|skills|about the role|description|essential|experience|role summary|duties|stack|technolog)', 
            re.IGNORECASE
        )
        irrelevant_headers = re.compile(
            r'(current openings|featured jobs|all jobs|privacy|office locations|culture|benefits|perks|about canonical|about the company)', 
            re.IGNORECASE
        )
        
        for line in text.split('\n'):
            line_strip = line.strip()
            if not line_strip:
                if current_section and current_section[-1]:
                    current_section.append("")
                continue
                
            is_header = line_strip.startswith('#') or (line_strip.isupper() and len(line_strip) < 50)
            
            if is_header:
                if relevant_headers.search(line_strip):
                    is_relevant = True
                    current_section = [line_strip]
                    sections.append(current_section)
                elif irrelevant_headers.search(line_strip):
                    is_relevant = False
                else:
                    if is_relevant:
                        current_section = [line_strip]
                        sections.append(current_section)
            else:
                if is_relevant and current_section is not None:
                    current_section.append(line_strip)
                    
        if sections:
            extracted_text = ""
            for sec in sections:
                extracted_text += "\n".join(sec) + "\n\n"
            if len(extracted_text.strip()) > 200:
                text = extracted_text
                
    if len(text) > max_chars:
        text = text[:max_chars] + "... [Truncated to save tokens]"
        
    return text.strip()

class ATSOptimizeRequest(BaseModel):
    resume_json: Optional[Dict[str, Any]] = None
    job_description_text: Optional[str] = None
    job_url: Optional[str] = None

async def scrape_job_description(url: str) -> str:
    """
    Sends the job posting URL to jina.ai reader endpoint (https://r.jina.ai/<url>)
    to get markdown representation of the job description.
    """
    jina_endpoint = f"https://r.jina.ai/{url}"
    headers = {}
    if settings.JINA_API_KEY:
        headers["Authorization"] = f"Bearer {settings.JINA_API_KEY}"
        
    try:
        async with httpx.AsyncClient() as client:
            print(f"Jina.ai Scraper: Scraping job listing from {jina_endpoint}...")
            response = await client.get(jina_endpoint, headers=headers, timeout=20.0)
            if response.status_code == 451:
                raise ValueError("This website cannot be crawled due to legal/anti-scraping restrictions. Please copy the job description manually and paste it into the 'Paste Description Text' tab.")
            elif response.status_code != 200:
                raise ValueError(f"Failed to fetch job description. Status code {response.status_code}")
            return response.text
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to read job description from URL: {str(e)}"
        )

# Compact JSON template response to send to Qwen
RESPONSE_SCHEMA_JSON = """{
  "job_analysis": {
    "company": "string (Name of company)",
    "job_title": "string (Target job title)",
    "required_skills": ["string (Core required skills)"],
    "preferred_skills": ["string (Preferred/bonus skills)"],
    "experience_required": "string (Description of experience requirements)",
    "education_required": "string (Description of education requirements)",
    "keywords": ["string (Core ATS keywords in job description)"]
  },
  "ats_analysis": {
    "ats_score_before": int (0-100),
    "ats_score_after": int (0-100),
    "skill_match_percentage": int (0-100),
    "experience_match_percentage": int (0-100),
    "keyword_match_percentage": int (0-100),
    "project_relevance_percentage": int (0-100),
    "job_title_match_percentage": int (0-100),
    "education_match_percentage": int (0-100),
    "certification_match_percentage": int (0-100),
    "formatting_score_percentage": int (0-100),
    "missing_keywords": ["string (Keywords present in JD but missing in resume)"],
    "missing_skills": ["string (Skills present in JD but missing in resume)"],
    "strengths": ["string (Candidate's key strengths for this role)"],
    "weaknesses": ["string (Candidate's key gaps or weaknesses for this role)"]
  },
  "tailored_resume": {
    "professional_summary": "string (Optimized profile summary tailored to the target Job Description, highlighting matching experience and skills, contextually embedding raw keywords with flawless grammar)",
    "skills": ["string (Original skills + missing skills grouped under broad subject domains)"],
    "experience": [
      {
        "company": "string or null",
        "role": "string or null",
        "duration": "string or null",
        "description": ["string (Professionally rewritten bullet points integrating keywords)"]
      }
    ],
    "projects": [
      {
        "name": "string or null",
        "description": ["string (Rewritten bullet points matching JD)"],
        "url": "string or null"
      }
    ],
    "education": [
      {
        "institution": "string or null",
        "degree": "string or null",
        "year": "string or null",
        "gpa": "string or null (CGPA/percentage, e.g. 8.5 CGPA or 82%)"
      }
    ],
    "certifications": [
      {
        "name": "string or null",
        "issuer": "string or null",
        "date": "string or null"
      }
    ]
  },
  "optimization_report": {
    "sections_modified": ["string (Modified section names)"],
    "keywords_added": ["string (Keywords added to tailored resume)"],
    "improvements_made": ["string (Applied improvements)"],
    "recommended_skills_to_learn": ["string (Skills candidate lacks)"],
    "actionable_suggestions": ["string (MUST suggest internship recommendations and project ideas, capped at 4 projects max)"]
  }
}"""

SYSTEM_PROMPT = f"""You are an expert ATS Optimization Specialist. Analyze the Candidate Resume and Job Description, and output a detailed match calculation and tailored resume in JSON.
Return ONLY valid JSON matching the structure template below. No markdown wraps, commentary, or notes.

Structure Template:
{RESPONSE_SCHEMA_JSON}

RULES:
1. Skills: Do NOT add raw tool/library/package names (e.g. Snowflake, AWS, Pandas) directly to skills. Group them under academic/technical subject domains (e.g. Cloud Computing, Data Warehousing, Data Pipelines) and add only those domains to tailored skills. Retain original skills.
2. Experience: Keep original company names, roles, durations, and project names. Only enrich/rewrite bullet points contextually with target keywords.
3. Summary: Rewrite and generate the professional summary (3-4 sentences max) to be highly tailored to the specific Job Description. It should directly emphasize the candidate's core qualifications, skills, and experience that align with the role's responsibilities, and contextually embed key target keywords with flawless grammar and executive tone.
4. Scoring: Calculate ats_score_before and ats_score_after using this formula:
   Overall Score = (Skill * 0.40) + (Experience * 0.20) + (Keyword * 0.10) + (ProjectRelevance * 0.10) + (JobTitleMatch * 0.05) + (Education * 0.05) + (Certification * 0.05) + (Formatting * 0.05)
5. Suggestions: Provide actionable project ideas (max 4) and internship recommendations in high-value domains.
6. Education: Populate the gpa field with the candidate's CGPA or percentage (e.g., '8.5 CGPA' or '82%').
"""

@router.post("/optimize", response_model=ATSOptimizeResponse)
async def optimize_resume(
    req: ATSOptimizeRequest,
    current_user: dict = Depends(get_current_user)
):
    # 1. Scrape or Parse Job Description
    job_desc = ""
    if req.job_url:
        job_desc = await scrape_job_description(req.job_url)
    elif req.job_description_text:
        job_desc = req.job_description_text
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either job_description_text or job_url must be provided."
        )
        
    job_desc = clean_and_truncate_jd(job_desc, max_chars=3000)
    if not job_desc.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description text is empty."
        )

    # 2. Retrieve Candidate Resume JSON if not provided
    resume_data = req.resume_json
    if not resume_data:
        user_email = current_user["email"]
        try:
            # Get profile record to retrieve profile_id
            profile_res = supabase_client.table("profiles").select("*").eq("email", user_email.lower()).execute()
            if not profile_res.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User profile not found. Please setup your profile and upload a resume first."
                )
            
            profile = profile_res.data[0]
            profile_id = profile["id"]
            
            # Fetch experience
            exp_res = supabase_client.table("experience").select("*").eq("profile_id", profile_id).execute()
            # Fetch education
            edu_res = supabase_client.table("education").select("*").eq("profile_id", profile_id).execute()
            # Fetch projects
            proj_res = supabase_client.table("projects").select("*").eq("profile_id", profile_id).execute()
            # Fetch certifications
            cert_res = supabase_client.table("certifications").select("*").eq("profile_id", profile_id).execute()
            # Fetch skills
            skills_res = supabase_client.table("skills").select("name").eq("profile_id", profile_id).execute()
            
            skills = [s["name"] for s in skills_res.data] if skills_res.data else []
            
            # Compile Resume JSON
            resume_data = {
                "full_name": profile.get("name", ""),
                "email": profile.get("email", ""),
                "phone": profile.get("phone", ""),
                "location": profile.get("location", ""),
                "linkedin_url": profile.get("linkedin_url", ""),
                "github_url": profile.get("github_url", ""),
                "portfolio_url": profile.get("portfolio_url", ""),
                "skills": skills,
                "experience": [
                    {
                        "company": exp.get("company", ""),
                        "role": exp.get("role", ""),
                        "duration": exp.get("duration", ""),
                        "description": exp.get("description", "")
                    } for exp in (exp_res.data or [])
                ],
                "projects": [
                    {
                        "name": proj.get("name", ""),
                        "description": proj.get("description", ""),
                        "url": proj.get("url", "")
                    } for proj in (proj_res.data or [])
                ],
                "education": [
                    {
                        "institution": edu.get("institution", ""),
                        "degree": edu.get("degree", ""),
                        "year": edu.get("year", "")
                    } for edu in (edu_res.data or [])
                ],
                "certifications": [
                    {
                        "name": cert.get("name", ""),
                        "issuer": cert.get("issuer", ""),
                        "date": cert.get("date", "")
                    } for cert in (cert_res.data or [])
                ],
                "total_experience_years": profile.get("total_experience_years", 0),
                "preferred_job_roles": profile.get("preferred_job_roles", [])
            }
        except HTTPException as he:
            raise he
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch profile details: {str(e)}"
            )

    # Preprocess resume_data education to split and clean degree & gpa
    if resume_data and "education" in resume_data:
        normalized_edu = []
        for edu in resume_data["education"]:
            deg = edu.get("degree", "")
            cleaned_deg, parsed_gpa = _split_degree_and_gpa(deg)
            normalized_edu.append({
                "institution": edu.get("institution", ""),
                "degree": cleaned_deg,
                "gpa": edu.get("gpa") or parsed_gpa or "",
                "year": edu.get("year", "")
            })
        resume_data["education"] = normalized_edu

    # 3. Call Qwen on Hugging Face Router
    user_prompt = f"Resume:{json.dumps(resume_data)}\nJD:{job_desc}"
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            print(f"Gemini: Running optimization (attempt {attempt + 1}/{max_retries})...")
            completion = generate_chat_completion(
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.2,  # Low temperature for analytical accuracy and structural compliance
                max_tokens=4000   # Large context for resume details
            )
            
            response_text = completion.choices[0].message.content.strip()
            # Clean possible markdown wrap
            if response_text.startswith("```json"):
                response_text = response_text.replace("```json", "", 1)
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            # Validate schema
            validated_response = ATSOptimizeResponse.model_validate_json(response_text)
            print("Gemini: Resume tailored and validated successfully.")
            
            # Save to search history in Supabase Storage
            try:
                user_email = current_user["email"]
                company = validated_response.job_analysis.company
                role = validated_response.job_analysis.job_title
                score = validated_response.ats_analysis.ats_score_after
                
                company_safe = sanitize_filename_part(company)
                role_safe = sanitize_filename_part(role)
                timestamp = int(time.time())
                
                filename = f"{company_safe}__{role_safe}__{score}__{timestamp}.json"
                storage_path = f"{user_email}/history/{filename}"
                
                history_payload = {
                    "company": company,
                    "role": role,
                    "score": score,
                    "timestamp": timestamp,
                    "job_url": req.job_url,
                    "job_description_text": req.job_description_text or job_desc,
                    "resume_json": resume_data,
                    "optimized_response": validated_response.model_dump()
                }
                
                payload_bytes = json.dumps(history_payload, indent=2).encode("utf-8")
                supabase_client.storage.from_("resumes").upload(
                    path=storage_path,
                    file=payload_bytes,
                    file_options={"content-type": "application/json", "upsert": "true"}
                )
                print(f"ATS optimization result saved to history: {storage_path}")
            except Exception as history_err:
                print(f"Failed to save ATS optimization history: {history_err}")

            return validated_response
            
        except ValidationError as val_err:
            print(f"Gemini: Schema validation error on attempt {attempt + 1}: {val_err}")
            messages.append({"role": "assistant", "content": response_text if 'response_text' in locals() else "{}"})
            messages.append({
                "role": "user",
                "content": f"The response JSON violated validation rules:\n{str(val_err)}\n\nPlease rewrite the JSON block and strictly follow the target schema."
            })
        except Exception as e:
            print(f"Gemini: Request failed on attempt {attempt + 1}: {e}")
            if attempt == max_retries - 1:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Resume tailoring request failed: {str(e)}"
                )
                
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to format the tailored resume correctly. Please try again."
    )


@router.get("/history")
async def list_history(
    current_user: dict = Depends(get_current_user)
) -> dict:
    user_email = current_user["email"]
    try:
        # List files under f"{user_email}/history" folder
        files = supabase_client.storage.from_("resumes").list(f"{user_email}/history")
        
        history_items = []
        for f in (files or []):
            name = f.get("name", "")
            if name.endswith(".json"):
                parts = name.replace(".json", "").split("__")
                if len(parts) >= 4:
                    company = parts[0].replace("_", " ")
                    role = parts[1].replace("_", " ")
                    try:
                        score = int(parts[2])
                    except ValueError:
                        score = 0
                    try:
                        timestamp = int(parts[3])
                    except ValueError:
                        timestamp = 0
                    
                    history_items.append({
                        "filename": name,
                        "company": company,
                        "role": role,
                        "score": score,
                        "timestamp": timestamp,
                        "created_at": f.get("created_at") or f.get("updated_at")
                    })
        
        # Sort history by timestamp descending
        history_items.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return {
            "status": "success",
            "history": history_items
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch history: {str(e)}"
        )


@router.get("/history/{filename}")
async def get_history_detail(
    filename: str,
    current_user: dict = Depends(get_current_user)
) -> dict:
    user_email = current_user["email"]
    try:
        storage_path = f"{user_email}/history/{filename}"
        file_bytes = supabase_client.storage.from_("resumes").download(storage_path)
        history_data = json.loads(file_bytes.decode("utf-8"))
        return {
            "status": "success",
            "data": history_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"History record not found: {str(e)}"
        )


@router.delete("/history/{filename}")
async def delete_history_item(
    filename: str,
    current_user: dict = Depends(get_current_user)
) -> dict:
    user_email = current_user["email"]
    try:
        storage_path = f"{user_email}/history/{filename}"
        supabase_client.storage.from_("resumes").remove(storage_path)
        return {
            "status": "success",
            "message": "History item deleted successfully."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete history item: {str(e)}"
        )
