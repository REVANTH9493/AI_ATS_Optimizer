import json
import os
from typing import Optional, Dict, Any, List
import uuid

from app.supabase_client import supabase_client

class UserDB:
    @staticmethod
    def get_by_email(email: str) -> Optional[Dict[str, Any]]:
        email_key = email.lower()
        response = supabase_client.table("profiles").select("*").eq("email", email_key).execute()
        if response.data:
            return response.data[0]
        return None

    @staticmethod
    def create(email: str, password_hash: Optional[str], name: Optional[str] = None, avatar: Optional[str] = None, provider: str = "credentials") -> Dict[str, Any]:
        email_key = email.lower()
        
        user_data = {
            "id": str(uuid.uuid4()),
            "email": email_key,
            "password_hash": password_hash,
            "name": name or email.split("@")[0].capitalize(),
            "avatar": avatar,
            "provider": provider,
        }
        
        response = supabase_client.table("profiles").insert(user_data).execute()
        if response.data:
            return response.data[0]
        raise RuntimeError("Failed to create user profile in Supabase.")

    @staticmethod
    def update_profile(email: str, profile_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        email_key = email.lower()
        
        response = supabase_client.table("profiles").select("*").eq("email", email_key).execute()
        if response.data:
            # Exists in Supabase, update it
            response = supabase_client.table("profiles").update(profile_data).eq("email", email_key).execute()
        else:
            # Not in Supabase, insert it
            insert_data = {
                "id": str(uuid.uuid4()),
                "email": email_key,
                "name": email.split("@")[0].capitalize(),
                "provider": "credentials",
                **profile_data
            }
            response = supabase_client.table("profiles").insert(insert_data).execute()
        
        if response.data:
            return response.data[0]
        return None

    @staticmethod
    def save_parsed_resume(email: str, data: Any) -> Optional[Dict[str, Any]]:
        email_key = email.lower()
        
        # Get profile record to retrieve profile_id
        response = supabase_client.table("profiles").select("id").eq("email", email_key).execute()
        if not response.data:
            # User profile doesn't exist, create it first
            user_data = UserDB.create(email=email, password_hash=None, name=data.full_name)
            profile_id = user_data["id"]
        else:
            profile_id = response.data[0]["id"]

        # Update main profiles record
        profile_updates = {
            "name": data.full_name,
            "phone": data.phone,
            "location": data.location,
            "linkedin_url": data.linkedin_url,
            "github_url": data.github_url,
            "portfolio_url": data.portfolio_url,
            "total_experience_years": data.total_experience_years,
            "preferred_job_roles": data.preferred_job_roles,
            "title": getattr(data, "title", None) or (data.preferred_job_roles[0] if data.preferred_job_roles else None)
        }
        supabase_client.table("profiles").update(profile_updates).eq("id", profile_id).execute()

        # Clear previous child records (to support overwrites/re-uploads)
        supabase_client.table("experience").delete().eq("profile_id", profile_id).execute()
        supabase_client.table("education").delete().eq("profile_id", profile_id).execute()
        supabase_client.table("projects").delete().eq("profile_id", profile_id).execute()
        supabase_client.table("certifications").delete().eq("profile_id", profile_id).execute()
        supabase_client.table("skills").delete().eq("profile_id", profile_id).execute()

        # Insert new child records
        # Experience
        if data.experience:
            exp_rows = [
                {
                    "profile_id": profile_id,
                    "company": exp.company,
                    "role": exp.role,
                    "duration": exp.duration,
                    "description": exp.description
                } for exp in data.experience
            ]
            supabase_client.table("experience").insert(exp_rows).execute()

        # Education
        if data.education:
            edu_rows = [
                {
                    "profile_id": profile_id,
                    "institution": edu.institution,
                    "degree": f"{edu.degree} ({edu.gpa})" if getattr(edu, "gpa", None) else edu.degree,
                    "year": edu.year
                } for edu in data.education
            ]
            supabase_client.table("education").insert(edu_rows).execute()

        # Projects
        if data.projects:
            proj_rows = [
                {
                    "profile_id": profile_id,
                    "name": proj.name,
                    "description": proj.description,
                    "url": proj.url
                } for proj in data.projects
            ]
            supabase_client.table("projects").insert(proj_rows).execute()

        # Certifications
        if data.certifications:
            cert_rows = [
                {
                    "profile_id": profile_id,
                    "name": cert.name,
                    "issuer": cert.issuer,
                    "date": cert.date
                } for cert in data.certifications
            ]
            supabase_client.table("certifications").insert(cert_rows).execute()

        # Skills
        if data.skills:
            skills_rows = [
                {
                    "profile_id": profile_id,
                    "name": skill.strip()
                } for skill in set(data.skills) if skill.strip()
            ]
            if skills_rows:
                supabase_client.table("skills").insert(skills_rows).execute()

        # Return the updated profile
        res = supabase_client.table("profiles").select("*").eq("id", profile_id).execute()
        if res.data:
            return res.data[0]
        raise RuntimeError("Failed to retrieve updated profile from Supabase.")


