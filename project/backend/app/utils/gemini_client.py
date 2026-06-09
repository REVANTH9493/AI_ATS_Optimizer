import os
import json
from openai import OpenAI
from pydantic import ValidationError
from typing import Dict, Any, Optional

from app.config import settings
from app.schemas.resume_schema import ParsedResumeSchema

# Initialize OpenAI client targeting Gemini
if not settings.GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY must be configured.")

client = OpenAI(
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    api_key=settings.GEMINI_API_KEY
)
print("Gemini client initialized successfully.")

def generate_chat_completion(
    messages: list,
    response_format: Optional[Dict[str, Any]] = None,
    temperature: float = 0.2,
    max_tokens: int = 2048
) -> Any:
    """
    Tries to generate completion using primary model, then falls back to other responsive models if needed.
    """
    models = [settings.GEMINI_MODEL]
    fallbacks = [
        "gemini-2.5-flash-lite",
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite-preview",
        "gemini-flash-lite-latest"
    ]
    for fb in fallbacks:
        if fb not in models:
            models.append(fb)

    last_error = None
    for model in models:
        try:
            print(f"Gemini: Attempting completion with model: {model}")
            completion = client.chat.completions.create(
                model=model,
                messages=messages,
                response_format=response_format,
                temperature=temperature,
                max_tokens=max_tokens
            )
            # Ensure content is not None to avoid downstream issues
            if completion.choices and completion.choices[0].message.content is not None:
                return completion
            else:
                raise ValueError(f"Model {model} returned empty/null content.")
        except Exception as e:
            print(f"Gemini: Model {model} failed with error: {e}")
            last_error = e
            continue

    if last_error:
        raise last_error
    raise RuntimeError("All configured Gemini models failed to respond.")

# Compact JSON template response to send to Qwen
SCHEMA_JSON = """{
  "full_name": "string (Full name of candidate)",
  "email": "string or null (Primary email)",
  "phone": "string or null (Phone number)",
  "location": "string or null (City, State, Country)",
  "linkedin_url": "string or null (LinkedIn URL)",
  "github_url": "string or null (GitHub URL)",
  "portfolio_url": "string or null (Portfolio URL)",
  "skills": ["string (skills)"],
  "education": [
    {
      "institution": "string or null (School name)",
      "degree": "string or null (Degree/field)",
      "year": "string or null (Year of study)",
      "gpa": "string or null (CGPA/percentage, e.g. 8.5 CGPA or 82%)"
    }
  ],
  "experience": [
    {
      "company": "string or null",
      "role": "string or null",
      "duration": "string or null",
      "description": "string or null (Key duties/achievements)"
    }
  ],
  "projects": [
    {
      "name": "string or null",
      "description": "string or null",
      "url": "string or null"
    }
  ],
  "certifications": [
    {
      "name": "string or null",
      "issuer": "string or null",
      "date": "string or null"
    }
  ],
  "achievements": ["string"],
  "total_experience_years": float or null,
  "preferred_job_roles": ["string"]
}"""

SYSTEM_PROMPT = f"""You are a professional resume parser. Analyze the resume text and extract all candidate information into a single structured JSON object matching the structure template below.
Return ONLY valid JSON. No markdown wraps (like ```json), commentary, or notes.

Structure Template:
{SCHEMA_JSON}

Follow these rules strictly:
1. Ensure the candidate's full name is mapped to "full_name". Do NOT use "name".
2. Under "skills", extract a list of technical and soft skills.
3. Under "experience", "education", "projects", and "certifications", populate lists of objects exactly matching the template structure.
4. Estimate "total_experience_years" as a floating-point number.
5. Identify "preferred_job_roles" based on their title and target keywords.
6. Factual accuracy is critical. Do not hallucinate or guess fields if they are not present. Leave missing values as null.
"""

def parse_resume_text(text: str, email: str) -> ParsedResumeSchema:
    """
    Sends raw extracted resume text to Gemini.
    Validates the result against Pydantic schema and retries on errors with self-correction.
    """
    prompt = f"Resume Text to Parse:\n\n{text}"
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt}
    ]

    max_retries = 3
    for attempt in range(max_retries):
        try:
            print(f"Gemini: Requesting resume parsing (attempt {attempt + 1}/{max_retries})...")
            completion = generate_chat_completion(
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.1,  # Low temp for structured factual precision
                max_tokens=2048   # Enforce sufficient token length to avoid truncation
            )
            
            response_text = completion.choices[0].message.content
            # Clean up potential markdown formatting in case model ignores instructions
            response_text = response_text.strip()
            if response_text.startswith("```json"):
                response_text = response_text.replace("```json", "", 1)
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            # Validate JSON schema using Pydantic
            parsed_data = ParsedResumeSchema.model_validate_json(response_text)
            print("Gemini: Successfully parsed and validated resume JSON.")
            return parsed_data

        except ValidationError as val_err:
            print(f"Gemini: Pydantic Validation Error (attempt {attempt + 1}): {val_err}")
            # Self-corrective prompt adjustment: Feed error details back to model
            error_details = str(val_err)
            messages.append({"role": "assistant", "content": response_text if 'response_text' in locals() else "{}"})
            messages.append({
                "role": "user",
                "content": f"The JSON you returned violated the validation rules:\n{error_details}\n\nPlease fix the JSON formatting and return only a fully valid JSON matching the schema."
            })
            
        except Exception as e:
            print(f"Gemini: API Connection/Request failed (attempt {attempt + 1}): {e}")
            if attempt == max_retries - 1:
                raise RuntimeError(f"Parser API connection failed: {e}")
            
    # Final fallback if all retries failed
    raise RuntimeError("Failed to parse the resume structure correctly after multiple attempts.")
