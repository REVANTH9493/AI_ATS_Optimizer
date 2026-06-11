from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from pydantic import BaseModel
import os
import shutil
import json
from typing import Dict, Any

from app.routers.auth import get_current_user
from app.supabase_client import supabase_client
from app.db import UserDB
from app.utils.layout_extractor import extract_document_content
from app.utils.gemini_client import parse_resume_text

router = APIRouter(prefix="/resume", tags=["Resumes"])

ALLOWED_EXTENSIONS = {".pdf", ".docx"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB in bytes

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    # 1. Validate File Extension
    filename = file.filename
    _, ext = os.path.splitext(filename)
    if ext.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Only PDF and DOCX files are allowed."
        )

    # 2. Read content and validate file size
    try:
        content = await file.read()
        file_size = len(content)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum allowed size is 5MB."
            )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not read upload file: {str(e)}"
        )

    user_email = current_user["email"]
    # 3. Upload to Supabase Storage
    try:
        # Bucket name is 'resumes'
        storage_path = f"{user_email}/{filename}"
        
        # Upload the file with upsert=True to overwrite old resumes
        supabase_client.storage.from_("resumes").upload(
            path=storage_path,
            file=content,
            file_options={"content-type": file.content_type, "upsert": "true"}
        )
        
        # Retrieve public URL
        resume_url = supabase_client.storage.from_("resumes").get_public_url(storage_path)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage upload failed: {str(e)}"
        )

    # 4. Update user profile with the resume URL
    UserDB.update_profile(user_email, {"resume_url": resume_url})
    
    return {
        "status": "success",
        "message": "Resume uploaded successfully.",
        "filename": filename,
        "resume_url": resume_url,
        "file_size": file_size
    }

@router.post("/parse")
async def parse_resume(
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    user_email = current_user["email"]
    user_profile = UserDB.get_by_email(user_email)
    
    if not user_profile or not user_profile.get("resume_url"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No uploaded resume found. Please upload a resume first."
        )
        
    resume_url = user_profile["resume_url"]
    file_bytes = b""
    filename = "resume.pdf"  # default fallback
    
    # 1. Download file bytes from Supabase Storage
    try:
        path_split = resume_url.split("/resumes/")
        if len(path_split) > 1:
            storage_path = path_split[1]
            filename = os.path.basename(storage_path)
            
            print(f"Downloading resume {storage_path} from Supabase Storage...")
            file_bytes = supabase_client.storage.from_("resumes").download(storage_path)
        else:
            raise ValueError("Invalid storage URL format.")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download resume from storage: {str(e)}"
        )

    # 2. Extract Document Content (LayoutLMv3 OCR or fallback)
    try:
        extracted_text = extract_document_content(file_bytes, filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract document text: {str(e)}"
        )

    # 3. Parse with Qwen 2.5 on Hugging Face Router
    try:
        parsed_data = parse_resume_text(extracted_text, user_email)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Parsing failed: {str(e)}"
        )

    # 4. Save parsed details relationally in Supabase
    try:
        updated_profile = UserDB.save_parsed_resume(user_email, parsed_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save profile details: {str(e)}"
        )

    # 5. Store parsed JSON file in Supabase Storage
    parsed_json_bytes = json.dumps(parsed_data.model_dump(), indent=2).encode("utf-8")
    json_filename = f"{os.path.splitext(filename)[0]}_parsed.json"
    
    try:
        storage_path = f"{user_email}/{json_filename}"
        supabase_client.storage.from_("resumes").upload(
            path=storage_path,
            file=parsed_json_bytes,
            file_options={"content-type": "application/json", "upsert": "true"}
        )
    except Exception as e:
        print(f"Failed to upload parsed JSON file to Supabase: {e}")

    return {
        "status": "success",
        "message": "Resume parsed and profile updated successfully.",
        "parsed_data": parsed_data.model_dump()
    }


class SelectResumeRequest(BaseModel):
    filename: str


@router.get("/list")
async def list_resumes(
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    user_email = current_user["email"]
    try:
        # List files in resumes bucket under user folder
        files = supabase_client.storage.from_("resumes").list(user_email)
        
        # Filter for PDF and DOCX files
        resume_files = []
        for f in (files or []):
            name = f.get("name", "")
            if name.lower().endswith((".pdf", ".docx")):
                # Get public URL
                public_url = supabase_client.storage.from_("resumes").get_public_url(f"{user_email}/{name}")
                resume_files.append({
                    "name": name,
                    "url": public_url,
                    "size": f.get("metadata", {}).get("size") or 0,
                    "created_at": f.get("created_at"),
                    "updated_at": f.get("updated_at")
                })
        
        return {
            "status": "success",
            "resumes": resume_files
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list resumes: {str(e)}"
        )


@router.post("/select")
async def select_resume(
    req: SelectResumeRequest,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    user_email = current_user["email"]
    filename = req.filename
    
    # 1. Download file bytes from storage to verify it exists and to extract/parse it
    try:
        storage_path = f"{user_email}/{filename}"
        print(f"Downloading selected resume {storage_path} from Supabase Storage...")
        file_bytes = supabase_client.storage.from_("resumes").download(storage_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Selected resume file not found in storage: {str(e)}"
        )

    # Get the public URL of the selected file
    resume_url = supabase_client.storage.from_("resumes").get_public_url(storage_path)

    # 2. Update user profile resume_url in local DB/cache
    try:
        UserDB.update_profile(user_email, {"resume_url": resume_url})
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile resume URL: {str(e)}"
        )

    # 3. Extract Document Content (OCR or fallback)
    try:
        extracted_text = extract_document_content(file_bytes, filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract document text: {str(e)}"
        )

    # 4. Parse with Gemini
    try:
        parsed_data = parse_resume_text(extracted_text, user_email)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Parsing failed: {str(e)}"
        )

    # 5. Save parsed details relationally in Supabase
    try:
        updated_profile = UserDB.save_parsed_resume(user_email, parsed_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save profile details: {str(e)}"
        )

    # 6. Store parsed JSON file in Supabase Storage
    parsed_json_bytes = json.dumps(parsed_data.model_dump(), indent=2).encode("utf-8")
    json_filename = f"{os.path.splitext(filename)[0]}_parsed.json"
    
    try:
        storage_path = f"{user_email}/{json_filename}"
        supabase_client.storage.from_("resumes").upload(
            path=storage_path,
            file=parsed_json_bytes,
            file_options={"content-type": "application/json", "upsert": "true"}
        )
    except Exception as e:
        print(f"Failed to upload parsed JSON file to Supabase: {e}")

    return {
        "status": "success",
        "message": "Resume selected and parsed successfully.",
        "resume_url": resume_url,
        "parsed_data": parsed_data.model_dump()
    }


@router.delete("/delete/{filename}")
async def delete_resume(
    filename: str,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    user_email = current_user["email"]
    try:
        storage_path = f"{user_email}/{filename}"
        supabase_client.storage.from_("resumes").remove(storage_path)
        
        # Also clean up the parsed JSON file if it exists
        json_filename = f"{os.path.splitext(filename)[0]}_parsed.json"
        try:
            supabase_client.storage.from_("resumes").remove(f"{user_email}/{json_filename}")
        except Exception:
            pass
            
        # If this was their active resume, clear it from profile
        profile = UserDB.get_by_email(user_email)
        if profile and profile.get("resume_url"):
            active_url = profile["resume_url"]
            if filename in active_url:
                UserDB.update_profile(user_email, {"resume_url": None})
                
        return {
            "status": "success",
            "message": "Resume deleted successfully."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete resume: {str(e)}"
        )


