from pydantic import BaseModel, Field
from typing import List, Optional

class JobAnalysisSchema(BaseModel):
    company: str = Field(..., description="Name of the company hiring")
    job_title: str = Field(..., description="Target job title")
    required_skills: List[str] = Field(default_factory=list, description="Core required skills list")
    preferred_skills: List[str] = Field(default_factory=list, description="Bonus/preferred skills list")
    experience_required: str = Field(..., description="Description of the experience requirements")
    education_required: str = Field(..., description="Description of the education requirements")
    keywords: List[str] = Field(default_factory=list, description="Core ATS keywords found in the job description")

class ATSAnalysisSchema(BaseModel):
    ats_score_before: int = Field(..., description="Overall ATS Score out of 100 before optimization")
    ats_score_after: int = Field(..., description="Expected overall ATS Score out of 100 after optimization")
    skill_match_percentage: int = Field(..., description="Score 0-100 indicating percentage match of candidate skills to job required skills")
    experience_match_percentage: int = Field(..., description="Score 0-100 indicating experience alignment")
    keyword_match_percentage: int = Field(..., description="Score 0-100 indicating keyword alignment")
    project_relevance_percentage: int = Field(..., description="Score 0-100 indicating project relevance alignment")
    job_title_match_percentage: int = Field(..., description="Score 0-100 indicating job title match/alignment")
    education_match_percentage: int = Field(..., description="Score 0-100 indicating education alignment")
    certification_match_percentage: int = Field(..., description="Score 0-100 indicating certification alignment")
    formatting_score_percentage: int = Field(..., description="Score 0-100 indicating resume formatting quality")
    missing_keywords: List[str] = Field(default_factory=list, description="List of important keywords present in the JD but missing in the resume")
    missing_skills: List[str] = Field(default_factory=list, description="List of required skills present in the JD but missing in the resume")
    strengths: List[str] = Field(default_factory=list, description="Key alignments and strengths of the candidate for this role")
    weaknesses: List[str] = Field(default_factory=list, description="Key gaps or weaknesses identified in the candidate profile")

class TailoredExperienceSchema(BaseModel):
    company: Optional[str] = Field(None, description="Name of the company or organization")
    role: Optional[str] = Field(None, description="Tailored job title or role matching the JD context if valid")
    duration: Optional[str] = Field(None, description="Start and End date, e.g. Jan 2020 - Present")
    description: List[str] = Field(default_factory=list, description="Professionally rewritten bullet points using action verbs and ATS keywords, retaining complete factual truthfulness")

class TailoredProjectSchema(BaseModel):
    name: Optional[str] = Field(None, description="Name of the project")
    description: List[str] = Field(default_factory=list, description="Rewritten bullet points highlighting context relevant to the JD, retaining factual accuracy")
    url: Optional[str] = Field(None, description="URL of the project")

class TailoredEducationSchema(BaseModel):
    institution: Optional[str] = Field(None, description="Name of the school or university")
    degree: Optional[str] = Field(None, description="Degree or field of study")
    year: Optional[str] = Field(None, description="Graduation year")
    gpa: Optional[str] = Field(None, description="CGPA or percentage acquired (e.g. 8.5 CGPA or 82%)")

class TailoredCertificationSchema(BaseModel):
    name: Optional[str] = Field(None, description="Name of the certification")
    issuer: Optional[str] = Field(None, description="Issuing organization")
    date: Optional[str] = Field(None, description="Date of issuance")

class TailoredResumeSchema(BaseModel):
    professional_summary: str = Field(..., description="Optimized professional profile summary matching the JD context")
    skills: List[str] = Field(default_factory=list, description="Reordered and prioritized list of skills")
    experience: List[TailoredExperienceSchema] = Field(default_factory=list, description="Work history with tailored bullet points")
    projects: List[TailoredProjectSchema] = Field(default_factory=list, description="Tailored projects highlighting relevant technical stack")
    education: List[TailoredEducationSchema] = Field(default_factory=list, description="Candidate education details")
    certifications: List[TailoredCertificationSchema] = Field(default_factory=list, description="Candidate certifications details")

class OptimizationReportSchema(BaseModel):
    sections_modified: List[str] = Field(default_factory=list, description="List of sections updated (e.g., Summary, Experience, Skills)")
    keywords_added: List[str] = Field(default_factory=list, description="List of keywords added to the tailored resume")
    improvements_made: List[str] = Field(default_factory=list, description="Explanations of improvements applied")
    recommended_skills_to_learn: List[str] = Field(default_factory=list, description="Skills present in the JD that the candidate lacks, recommended to learn")
    actionable_suggestions: List[str] = Field(default_factory=list, description="Specific recommendations on what the user should add to their resume (e.g., projects on specific topics, missing achievements, certifications, etc.) to boost selection chances.")

class ATSOptimizeResponse(BaseModel):
    job_analysis: JobAnalysisSchema
    ats_analysis: ATSAnalysisSchema
    tailored_resume: TailoredResumeSchema
    optimization_report: OptimizationReportSchema
