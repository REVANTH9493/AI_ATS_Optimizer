from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ApplicationBase(BaseModel):
    job_title: str = Field(..., description="Job title or role")
    company: str = Field(..., description="Name of the company")
    location: Optional[str] = Field(None, description="Job location (e.g. Remote, City, State)")
    status: str = Field("Applied", description="Status of application: Applied, Interviewing, Offered, Rejected")
    salary: Optional[float] = Field(None, description="Annual base salary offered/expected")
    url: Optional[str] = Field(None, description="URL to the job post or description")
    notes: Optional[str] = Field(None, description="Personal notes about the application")

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    job_title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    salary: Optional[float] = None
    url: Optional[str] = None
    notes: Optional[str] = None

class ApplicationResponse(ApplicationBase):
    id: str
    profile_id: str
    applied_at: datetime

    class Config:
        from_attributes = True

class ApplicationStats(BaseModel):
    total: int
    applied: int
    interviewing: int
    offered: int
    rejected: int
    response_rate: float
