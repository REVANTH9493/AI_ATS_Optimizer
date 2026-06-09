from pydantic import BaseModel, Field
from typing import Optional, List

class ExperienceSchema(BaseModel):
    company: Optional[str] = Field(None, description="Name of the company or organization")
    role: Optional[str] = Field(None, description="Job title or role")
    duration: Optional[str] = Field(None, description="Start and End date, e.g. Jan 2020 - Present")
    description: Optional[str] = Field(None, description="Key achievements, duties, and technologies used")

class EducationSchema(BaseModel):
    institution: Optional[str] = Field(None, description="Name of the school, college, or university")
    degree: Optional[str] = Field(None, description="Degree name, certification, or field of study")
    year: Optional[str] = Field(None, description="Year of graduation or study period")
    gpa: Optional[str] = Field(None, description="CGPA or percentage acquired (e.g. 8.5 CGPA or 82%) if present in raw resume")

class ProjectSchema(BaseModel):
    name: Optional[str] = Field(None, description="Name of the project")
    description: Optional[str] = Field(None, description="Brief summary of the project and technologies used")
    url: Optional[str] = Field(None, description="URL to project source code, demo, or documentation")

class CertificationSchema(BaseModel):
    name: Optional[str] = Field(None, description="Name of the certificate or credential")
    issuer: Optional[str] = Field(None, description="Organization that issued the certificate")
    date: Optional[str] = Field(None, description="Date of issuance or validity")

class ParsedResumeSchema(BaseModel):
    full_name: str = Field(..., description="Full name of the candidate")
    email: Optional[str] = Field(None, description="Primary email address")
    phone: Optional[str] = Field(None, description="Contact phone number")
    location: Optional[str] = Field(None, description="City, State, or Country of residence")
    linkedin_url: Optional[str] = Field(None, description="LinkedIn profile URL")
    github_url: Optional[str] = Field(None, description="GitHub profile URL")
    portfolio_url: Optional[str] = Field(None, description="Personal website or portfolio URL")
    skills: List[str] = Field(default_factory=list, description="List of technical and soft skills")
    education: List[EducationSchema] = Field(default_factory=list, description="Academic background entries")
    experience: List[ExperienceSchema] = Field(default_factory=list, description="Professional work history entries")
    projects: List[ProjectSchema] = Field(default_factory=list, description="Personal or professional projects")
    certifications: List[CertificationSchema] = Field(default_factory=list, description="Certificates, courses, and credentials")
    achievements: List[str] = Field(default_factory=list, description="List of awards, milestones, or honors")
    total_experience_years: Optional[float] = Field(None, description="Calculated total years of professional experience")
    preferred_job_roles: List[str] = Field(default_factory=list, description="Identified preferred job titles or target roles")
