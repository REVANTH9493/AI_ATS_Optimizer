from pydantic import BaseModel, Field
from typing import List, Optional

class LocationSchema(BaseModel):
    address: Optional[str] = Field(None, description="Street address")
    postalCode: Optional[str] = Field(None, description="Postal code")
    city: Optional[str] = Field(None, description="City")
    countryCode: Optional[str] = Field(None, description="Country code (ISO 3166-1 alpha-2)")
    region: Optional[str] = Field(None, description="State, province, or region")

class ProfileSchema(BaseModel):
    network: Optional[str] = Field(None, description="Social network name (e.g. LinkedIn, GitHub)")
    username: Optional[str] = Field(None, description="Social network username")
    url: Optional[str] = Field(None, description="Social network link")

class BasicsSchema(BaseModel):
    name: Optional[str] = Field(None, description="Full name")
    label: Optional[str] = Field(None, description="Professional title or role")
    image: Optional[str] = Field(None, description="URL to profile picture")
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    url: Optional[str] = Field(None, description="Personal website or portfolio URL")
    summary: Optional[str] = Field(None, description="Professional summary")
    location: Optional[LocationSchema] = Field(default_factory=LocationSchema, description="Location details")
    profiles: List[ProfileSchema] = Field(default_factory=list, description="Social profiles links")

class WorkSchema(BaseModel):
    name: Optional[str] = Field(None, description="Company or organization name")
    position: Optional[str] = Field(None, description="Job role or position")
    url: Optional[str] = Field(None, description="Company website URL")
    startDate: Optional[str] = Field(None, description="Start date (YYYY-MM-DD or readable string)")
    endDate: Optional[str] = Field(None, description="End date (YYYY-MM-DD or readable string)")
    summary: Optional[str] = Field(None, description="Brief summary of the role")
    highlights: List[str] = Field(default_factory=list, description="Bullet points of achievements")

class VolunteerSchema(BaseModel):
    organization: Optional[str] = Field(None, description="Organization name")
    position: Optional[str] = Field(None, description="Role name")
    url: Optional[str] = Field(None, description="Organization website URL")
    startDate: Optional[str] = Field(None, description="Start date")
    endDate: Optional[str] = Field(None, description="End date")
    summary: Optional[str] = Field(None, description="Brief summary")
    highlights: List[str] = Field(default_factory=list, description="Bullet points")

class EducationSchema(BaseModel):
    institution: Optional[str] = Field(None, description="Name of the school or university")
    url: Optional[str] = Field(None, description="Institution website URL")
    area: Optional[str] = Field(None, description="Major or field of study")
    studyType: Optional[str] = Field(None, description="Degree type (e.g. B.S., M.S.)")
    startDate: Optional[str] = Field(None, description="Start date")
    endDate: Optional[str] = Field(None, description="End date/Graduation year")
    score: Optional[str] = Field(None, description="GPA or grade")
    courses: List[str] = Field(default_factory=list, description="List of courses")

class AwardSchema(BaseModel):
    title: Optional[str] = Field(None, description="Award title")
    date: Optional[str] = Field(None, description="Date of the award")
    awarder: Optional[str] = Field(None, description="Awarding organization")
    summary: Optional[str] = Field(None, description="Award description")

class CertificateSchema(BaseModel):
    name: Optional[str] = Field(None, description="Certificate name")
    date: Optional[str] = Field(None, description="Date issued")
    issuer: Optional[str] = Field(None, description="Issuing organization")
    url: Optional[str] = Field(None, description="Certificate link")

class PublicationSchema(BaseModel):
    name: Optional[str] = Field(None, description="Publication name")
    publisher: Optional[str] = Field(None, description="Publisher name")
    releaseDate: Optional[str] = Field(None, description="Release date")
    url: Optional[str] = Field(None, description="Publication URL")
    summary: Optional[str] = Field(None, description="Brief summary")

class SkillSchema(BaseModel):
    name: Optional[str] = Field(None, description="Category of skills")
    level: Optional[str] = Field(None, description="Skill proficiency level")
    keywords: List[str] = Field(default_factory=list, description="Individual skills list")

class LanguageSchema(BaseModel):
    language: Optional[str] = Field(None, description="Language name")
    fluency: Optional[str] = Field(None, description="Proficiency description")

class InterestSchema(BaseModel):
    name: Optional[str] = Field(None, description="Interest category")
    keywords: List[str] = Field(default_factory=list, description="Associated keywords")

class ReferenceSchema(BaseModel):
    name: Optional[str] = Field(None, description="Reference name")
    reference: Optional[str] = Field(None, description="Reference detail")

class ProjectSchema(BaseModel):
    name: Optional[str] = Field(None, description="Project name")
    description: Optional[str] = Field(None, description="Project overview")
    highlights: List[str] = Field(default_factory=list, description="Project bullet points")
    keywords: List[str] = Field(default_factory=list, description="Technologies used")
    startDate: Optional[str] = Field(None, description="Start date")
    endDate: Optional[str] = Field(None, description="End date")
    url: Optional[str] = Field(None, description="Project demo or repository URL")
    roles: List[str] = Field(default_factory=list, description="Roles in the project")
    entity: Optional[str] = Field(None, description="Entity/Company associated")
    type: Optional[str] = Field(None, description="Project type (e.g. personal, professional)")

class JSONResumeSchema(BaseModel):
    basics: BasicsSchema = Field(default_factory=BasicsSchema)
    work: List[WorkSchema] = Field(default_factory=list)
    volunteer: List[VolunteerSchema] = Field(default_factory=list)
    education: List[EducationSchema] = Field(default_factory=list)
    awards: List[AwardSchema] = Field(default_factory=list)
    certificates: List[CertificateSchema] = Field(default_factory=list)
    publications: List[PublicationSchema] = Field(default_factory=list)
    skills: List[SkillSchema] = Field(default_factory=list)
    languages: List[LanguageSchema] = Field(default_factory=list)
    interests: List[InterestSchema] = Field(default_factory=list)
    references: List[ReferenceSchema] = Field(default_factory=list)
    projects: List[ProjectSchema] = Field(default_factory=list)
