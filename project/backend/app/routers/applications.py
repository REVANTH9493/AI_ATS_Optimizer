from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any

from app.routers.auth import get_current_user
from app.supabase_client import supabase_client
from app.schemas.application_schema import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
    ApplicationStats
)

router = APIRouter(prefix="/applications", tags=["Applications"])

@router.get("", response_model=List[ApplicationResponse])
async def get_applications(current_user: dict = Depends(get_current_user)):
    try:
        response = supabase_client.table("applications")\
            .select("*")\
            .eq("profile_id", current_user["id"])\
            .order("applied_at", desc=True)\
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query failed: {str(e)}"
        )

@router.post("", response_model=ApplicationResponse)
async def create_application(
    app_in: ApplicationCreate,
    current_user: dict = Depends(get_current_user)
):
    try:
        app_data = app_in.model_dump()
        app_data["profile_id"] = current_user["id"]
        
        response = supabase_client.table("applications")\
            .insert(app_data)\
            .execute()
            
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create application."
            )
        return response.data[0]
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database insert failed: {str(e)}"
        )

@router.put("/{id}", response_model=ApplicationResponse)
async def update_application(
    id: str,
    app_in: ApplicationUpdate,
    current_user: dict = Depends(get_current_user)
):
    try:
        # Check ownership
        existing = supabase_client.table("applications")\
            .select("*")\
            .eq("id", id)\
            .eq("profile_id", current_user["id"])\
            .execute()
            
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found or unauthorized."
            )
            
        update_data = app_in.model_dump(exclude_unset=True)
        if not update_data:
            return existing.data[0]
            
        response = supabase_client.table("applications")\
            .update(update_data)\
            .eq("id", id)\
            .execute()
            
        return response.data[0]
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database update failed: {str(e)}"
        )

@router.delete("/{id}")
async def delete_application(id: str, current_user: dict = Depends(get_current_user)):
    try:
        # Check ownership
        existing = supabase_client.table("applications")\
            .select("*")\
            .eq("id", id)\
            .eq("profile_id", current_user["id"])\
            .execute()
            
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found or unauthorized."
            )
            
        supabase_client.table("applications")\
            .delete()\
            .eq("id", id)\
            .execute()
            
        return {"status": "success", "message": "Application deleted successfully."}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database delete failed: {str(e)}"
        )

@router.get("/stats", response_model=ApplicationStats)
async def get_application_stats(current_user: dict = Depends(get_current_user)):
    try:
        response = supabase_client.table("applications")\
            .select("*")\
            .eq("profile_id", current_user["id"])\
            .execute()
            
        apps = response.data
        total = len(apps)
        applied = sum(1 for a in apps if a["status"].lower() == "applied")
        interviewing = sum(1 for a in apps if a["status"].lower() == "interviewing")
        offered = sum(1 for a in apps if a["status"].lower() == "offered")
        rejected = sum(1 for a in apps if a["status"].lower() == "rejected")
        
        # Response rate calculation
        positive_responses = interviewing + offered
        response_rate = (positive_responses / total * 100) if total > 0 else 0.0
        
        return {
            "total": total,
            "applied": applied,
            "interviewing": interviewing,
            "offered": offered,
            "rejected": rejected,
            "response_rate": round(response_rate, 2)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate application stats: {str(e)}"
        )
