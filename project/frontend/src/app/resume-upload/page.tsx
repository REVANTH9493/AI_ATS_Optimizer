"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  FileUp, Upload, CheckCircle2, AlertCircle, Compass, LogOut, 
  FileText, Trash2, ArrowRight, Loader2, Sparkles, RefreshCw,
  Mail, Phone, MapPin, ExternalLink, Code, Briefcase, GraduationCap, Award, ClipboardList, Database, Key, Lock, X, Cpu
} from "lucide-react";


export default function ResumeUploadPage() {
  const router = useRouter();
  
  // User profile cache
  const [userProfile, setUserProfile] = useState<{ email: string; name: string; avatar?: string; resume_url?: string; provider?: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Dropdown & Reset Modal states
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  
  // Reset password form states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState("");
  
  // File upload state
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  // API flow state
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");

  // Parsing states
  const [parsing, setParsing] = useState(false);
  const [parseStage, setParseStage] = useState<"extracting" | "analyzing" | "saving" | "">("");
  const [parsedResume, setParsedResume] = useState<any | null>(null);
  const [showJsonInspector, setShowJsonInspector] = useState(false);

  // Load session and verify redirect status
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    
    if (!token || !storedUser) {
      router.push("/login");
      return;
    }

    const checkResumeRedirect = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/auth/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (response.ok) {
          localStorage.setItem("user", JSON.stringify(data));
          setUserProfile(data);
          if (data.resume_url) {
            setResumeUrl(data.resume_url);
          }
          
          // Check query parameters
          const params = new URLSearchParams(window.location.search);
          const forceUpload = params.get("force") === "true";

          if (data.resume_url && !forceUpload) {
            router.replace("/");
            return;
          }
        } else {
          // Fallback to local cache
          const parsedUser = JSON.parse(storedUser);
          setUserProfile(parsedUser);
          if (parsedUser.resume_url) {
            setResumeUrl(parsedUser.resume_url);
          }
        }
      } catch (err) {
        // Fallback to local cache
        const parsedUser = JSON.parse(storedUser);
        setUserProfile(parsedUser);
        if (parsedUser.resume_url) {
          setResumeUrl(parsedUser.resume_url);
        }
      } finally {
        setLoadingProfile(false);
      }
    };

    checkResumeRedirect();
  }, [router]);

  // Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess(false);

    if (newPassword !== confirmNewPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    setResetting(true);
    try {
      const response = await fetch("http://localhost:8000/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          old_password: oldPassword || null,
          new_password: newPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to reset password.");
      }

      setResetSuccess(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      
      setTimeout(() => {
        setShowResetModal(false);
        setResetSuccess(false);
      }, 1500);

    } catch (err: any) {
      setResetError(err.message || "An error occurred while resetting password.");
    } finally {
      setResetting(false);
    }
  };

  // Log Out
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  // File size and extension validation
  const validateAndSetFile = (selectedFile: File) => {
    setErrorMsg("");
    const allowedExtensions = ["pdf", "docx"];
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    
    if (!ext || !allowedExtensions.includes(ext)) {
      setErrorMsg("Invalid file type. Only PDF and DOCX files are allowed.");
      return;
    }
    
    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrorMsg("File is too large. Maximum allowed size is 5MB.");
      return;
    }

    setFile(selectedFile);
  };

  // File Removal
  const handleRemoveFile = () => {
    setFile(null);
    setErrorMsg("");
  };

  // Trigger Resume Parsing API
  const handleParseResume = async () => {
    setParsing(true);
    setParseStage("extracting");

    const token = localStorage.getItem("token");
    if (!token) return;

    // Simulate stages for smooth UX since OCR + LLM takes a few seconds
    const stage1Timeout = setTimeout(() => setParseStage("analyzing"), 2000);
    const stage2Timeout = setTimeout(() => setParseStage("saving"), 6000);

    try {
      const response = await fetch("http://localhost:8000/api/resume/parse", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      // Clear intervals
      clearTimeout(stage1Timeout);
      clearTimeout(stage2Timeout);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to parse resume.");
      }

      setParseStage("");
      setParsedResume(data.parsed_data);

      // Update user cache in localStorage with resume URL and parsed details
      if (userProfile) {
        const updatedUser = { ...userProfile, resume_url: resumeUrl, parsed_resume: data.parsed_data };
        setUserProfile(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

    } catch (err: any) {
      setErrorMsg(err.message || "AI parsing failed. Please check server logs.");
      setParsing(false);
    }
  };

  // Upload API Trigger
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setErrorMsg("");
    setSuccess(false);

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/api/resume/upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to upload resume.");
      }

      setSuccess(true);
      setResumeUrl(data.resume_url);
      
      // Update local storage user profile cache
      if (userProfile) {
        const updatedUser = { ...userProfile, resume_url: data.resume_url };
        setUserProfile(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      // Automatically trigger parser!
      await handleParseResume();

    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during upload.");
      setUploading(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#05050a] text-white">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05050a] text-white py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Blurs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className={`mx-auto relative z-10 transition-all duration-500 ${parsedResume ? "max-w-5xl" : "max-w-3xl"}`}>
        
        {/* Navigation / Header */}
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/10 border border-indigo-500/20">
              <Compass className="h-6 w-6 text-indigo-400" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-gradient">
              AI ATS Optimizer
            </span>
          </div>

          <div className="flex items-center gap-4">
            {userProfile && (
              <div className="relative">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-3 bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] rounded-2xl py-1.5 pl-3 pr-4 transition-all text-left outline-none"
                >
                  {userProfile.avatar ? (
                    <img src={userProfile.avatar} alt="avatar" className="w-8 h-8 rounded-full border border-white/10" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400">
                      {userProfile.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden sm:block text-left text-xs">
                    <p className="font-semibold text-zinc-200">{userProfile.name}</p>
                    <p className="text-zinc-500 text-[10px]">{userProfile.email}</p>
                  </div>
                </button>

                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl z-30 p-2 space-y-1 backdrop-blur-sm animate-scale-in">
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        router.push("/resume-upload?force=true");
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition-all text-left"
                    >
                      <FileText className="h-4 w-4 text-indigo-400" />
                      <span>Reupload Resume</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setShowResetModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition-all text-left"
                    >
                      <Key className="h-4 w-4 text-indigo-400" />
                      <span>Reset Password</span>
                    </button>
                  </div>
                )}
              </div>
            )}



            <button
              onClick={() => router.push("/")}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] transition-all text-xs font-semibold text-zinc-300"
            >
              <Cpu className="h-4 w-4 text-indigo-400" />
              <span>ATS Optimizer</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-red-950/20 hover:text-red-400 border border-white/5 hover:border-red-500/20 active:scale-95 transition-all text-zinc-400"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Workflow Title */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/5 text-xs text-indigo-400 font-semibold mb-3">
            <Sparkles className="h-3 w-3" />
            <span>Onboarding Stage - Resume Analysis</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {parsedResume ? "AI Parsing Completed!" : "Upload & Analyze Resume"}
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            {parsedResume 
              ? "Profile details have been successfully prepared and analyzed. Verify details below."
              : "Our smart parsing tool reads document structure and formats your profile."}
          </p>
        </div>

        {/* PARSING LOADER STATE */}
        {parsing && !parsedResume ? (
          <div className="glass-panel rounded-3xl p-12 text-center border border-white/10 relative overflow-hidden space-y-8 min-h-[350px] flex flex-col justify-center items-center">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-purple-500/20"></div>
            
            <div className="relative">
              {/* Spinning Ring */}
              <div className="absolute -inset-4 rounded-full border border-dashed border-indigo-500/30 animate-spin-slow"></div>
              {/* Pulse Sphere */}
              <div className="h-16 w-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            </div>

            <div className="space-y-3 max-w-sm">
              <h3 className="text-lg font-bold text-white tracking-wide">
                {parseStage === "extracting" && "Document Structure Scan"}
                {parseStage === "analyzing" && "Information Extraction & Verification"}
                {parseStage === "saving" && "Saving Profile Information"}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed min-h-[40px]">
                {parseStage === "extracting" && "Analyzing document layouts, text flow, and formatting..."}
                {parseStage === "analyzing" && "Identifying and cataloging skills, work history, and certificates..."}
                {parseStage === "saving" && "Writing details and synchronizing your user profile..."}
              </p>
            </div>

            {/* Simulated Progress Indicators */}
            <div className="flex gap-1.5 w-32 justify-center">
              <div className={`h-1.5 rounded-full transition-all duration-500 ${parseStage === "extracting" || parseStage === "analyzing" || parseStage === "saving" ? "w-8 bg-indigo-500" : "w-3 bg-white/10"}`}></div>
              <div className={`h-1.5 rounded-full transition-all duration-500 ${parseStage === "analyzing" || parseStage === "saving" ? "w-8 bg-indigo-500" : "w-3 bg-white/10"}`}></div>
              <div className={`h-1.5 rounded-full transition-all duration-500 ${parseStage === "saving" ? "w-8 bg-indigo-500" : "w-3 bg-white/10"}`}></div>
            </div>
          </div>
        ) : parsedResume ? (
          
          /* ========================================================
             PARSED CANDIDATE DASHBOARD
             ======================================================== */
          <div className="space-y-6">
            
            {/* Action Bar */}
            <div className="flex justify-between items-center gap-4">
              <button
                onClick={() => { setParsedResume(null); setSuccess(false); setFile(null); setParsing(false); }}
                className="py-2.5 px-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-xs font-semibold text-zinc-400 flex items-center gap-2 active:scale-95 transition-all"
              >
                <RefreshCw className="h-4 w-4" /> Re-upload File
              </button>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowJsonInspector(!showJsonInspector)}
                  className="py-2.5 px-4 rounded-xl bg-indigo-950/20 hover:bg-indigo-900/30 border border-indigo-500/20 text-indigo-300 text-xs font-semibold flex items-center gap-2 active:scale-95 transition-all"
                >
                  <ClipboardList className="h-4 w-4" /> 
                  {showJsonInspector ? "Hide Profile Summary" : "Inspect Profile Summary"}
                </button>
                 <button
                  onClick={() => router.push("/")}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/15 flex items-center gap-2 active:scale-95 transition-all border border-white/10"
                >
                  <span>Go to ATS Optimizer</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* RAW JSON INSPECTOR */}
            {showJsonInspector && (
              <div className="glass-panel rounded-3xl p-6 border border-white/10 bg-[#07070f] font-mono text-xs text-indigo-300/80 overflow-x-auto max-h-[400px] animate-fade-in relative">
                <div className="absolute top-2 right-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                  Structured Information Summary
                </div>
                <pre>{JSON.stringify(parsedResume, null, 2)}</pre>
              </div>
            )}

            {/* Dashboard Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column: Basic details, skills, target roles */}
              <div className="md:col-span-1 space-y-6">
                
                {/* Profile Summary Card */}
                <div className="glass-panel rounded-3xl p-6 border border-white/10 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-500/20"></div>
                  
                  {/* Mock avatar from initials */}
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 border-2 border-white/10 mx-auto flex items-center justify-center text-2xl font-bold shadow-lg shadow-indigo-600/10 mb-4">
                    {parsedResume.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "C"}
                  </div>
                  
                  <h3 className="text-xl font-bold tracking-tight">{parsedResume.full_name}</h3>
                  <p className="text-xs text-indigo-400 mt-1 font-semibold">
                    {parsedResume.preferred_job_roles?.[0] || "Software Candidate"}
                  </p>

                  <div className="mt-6 space-y-3 pt-6 border-t border-white/5 text-left text-xs text-zinc-400">
                    {parsedResume.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-zinc-500 shrink-0" />
                        <span className="truncate">{parsedResume.email}</span>
                      </div>
                    )}
                    {parsedResume.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-zinc-500 shrink-0" />
                        <span>{parsedResume.phone}</span>
                      </div>
                    )}
                    {parsedResume.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-zinc-500 shrink-0" />
                        <span>{parsedResume.location}</span>
                      </div>
                    )}
                    {parsedResume.total_experience_years !== null && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-zinc-500 shrink-0" />
                        <span>Experience: {parsedResume.total_experience_years} years</span>
                      </div>
                    )}
                  </div>

                  {/* Links Row */}
                  <div className="flex justify-center gap-3 mt-6 pt-4 border-t border-white/5">
                    {parsedResume.linkedin_url && (
                      <a href={parsedResume.linkedin_url} target="_blank" rel="noreferrer" className="p-2 bg-white/5 hover:bg-indigo-600/10 border border-white/5 hover:border-indigo-500/20 text-zinc-400 hover:text-indigo-400 rounded-xl transition-all">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                          <rect x="2" y="9" width="4" height="12" />
                          <circle cx="4" cy="4" r="2" />
                        </svg>
                      </a>
                    )}
                    {parsedResume.github_url && (
                      <a href={parsedResume.github_url} target="_blank" rel="noreferrer" className="p-2 bg-white/5 hover:bg-indigo-600/10 border border-white/5 hover:border-indigo-500/20 text-zinc-400 hover:text-indigo-400 rounded-xl transition-all">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                          <path d="M9 18c-4.51 2-5-2-7-2" />
                        </svg>
                      </a>
                    )}
                    {parsedResume.portfolio_url && (
                      <a href={parsedResume.portfolio_url} target="_blank" rel="noreferrer" className="p-2 bg-white/5 hover:bg-indigo-600/10 border border-white/5 hover:border-indigo-500/20 text-zinc-400 hover:text-indigo-400 rounded-xl transition-all">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Skills tags card */}
                <div className="glass-panel rounded-3xl p-6 border border-white/10">
                  <h4 className="text-sm font-bold flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
                    <Code className="h-4 w-4 text-indigo-400" />
                    <span>Skills Tags ({parsedResume.skills?.length || 0})</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                    {parsedResume.skills?.map((skill: string) => (
                      <span key={skill} className="text-[10px] font-semibold bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 px-2.5 py-1 rounded-lg">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column: Work history and educations timelines */}
              <div className="md:col-span-2 space-y-6">
                
                {/* Work history timeline */}
                <div className="glass-panel rounded-3xl p-8 border border-white/10 relative">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-purple-500/20"></div>
                  
                  <h4 className="text-sm font-bold flex items-center gap-2 border-b border-white/5 pb-3 mb-6">
                    <Briefcase className="h-4 w-4 text-purple-400" />
                    <span>Work History Timeline</span>
                  </h4>

                  <div className="space-y-8 relative before:absolute before:inset-y-1 before:left-3.5 before:w-0.5 before:bg-white/5">
                    {parsedResume.experience?.map((exp: any, idx: number) => (
                      <div key={idx} className="relative pl-10 text-left">
                        {/* Timeline bubble indicator */}
                        <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full border border-purple-500 bg-[#05050a] flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping"></div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                          <h5 className="font-bold text-sm text-zinc-100">{exp.role}</h5>
                          <span className="text-[10px] font-semibold text-purple-400 px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-md self-start">
                            {exp.duration}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-semibold">{exp.company}</p>
                        <p className="text-xs text-zinc-500 leading-relaxed mt-2 pl-4 border-l border-white/5">
                          {exp.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Education Timeline */}
                <div className="glass-panel rounded-3xl p-8 border border-white/10 relative">
                  <h4 className="text-sm font-bold flex items-center gap-2 border-b border-white/5 pb-3 mb-6">
                    <GraduationCap className="h-4 w-4 text-cyan-400" />
                    <span>Education Records</span>
                  </h4>

                  <div className="space-y-6 relative before:absolute before:inset-y-1 before:left-3.5 before:w-0.5 before:bg-white/5">
                    {parsedResume.education?.map((edu: any, idx: number) => (
                      <div key={idx} className="relative pl-10 text-left">
                        <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full border border-cyan-500 bg-[#05050a]"></div>
                        
                        <div className="flex justify-between items-start">
                          <h5 className="font-bold text-sm text-zinc-100">{edu.degree}</h5>
                          <span className="text-[10px] text-zinc-500 font-semibold">{edu.year}</span>
                        </div>
                        <p className="text-xs text-zinc-400">{edu.institution}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Projects & Certifications Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  {/* Projects panel */}
                  <div className="glass-panel rounded-3xl p-6 border border-white/10">
                    <h4 className="text-sm font-bold flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
                      <ClipboardList className="h-4 w-4 text-indigo-400" />
                      <span>Projects</span>
                    </h4>
                    <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
                      {parsedResume.projects?.map((proj: any, idx: number) => (
                        <div key={idx} className="text-left p-3 rounded-xl bg-white/[0.01] border border-white/5">
                          <div className="flex justify-between items-center">
                            <h5 className="font-semibold text-xs text-zinc-200">{proj.name}</h5>
                            {proj.url && (
                              <a href={proj.url} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5">
                                Demo <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{proj.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Certifications panel */}
                  <div className="glass-panel rounded-3xl p-6 border border-white/10">
                    <h4 className="text-sm font-bold flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
                      <Award className="h-4 w-4 text-purple-400" />
                      <span>Certifications</span>
                    </h4>
                    <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
                      {parsedResume.certifications?.map((cert: any, idx: number) => (
                        <div key={idx} className="text-left p-3 rounded-xl bg-white/[0.01] border border-white/5">
                          <h5 className="font-semibold text-xs text-zinc-200">{cert.name}</h5>
                          <div className="flex justify-between items-center text-[10px] text-zinc-500 mt-1">
                            <span>{cert.issuer}</span>
                            <span>{cert.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>
        ) : (
          
          /* ========================================================
             RESUME FILE DROPZONE / UPLOADING (Original Upload Panel)
             ======================================================== */
          <div className="glass-panel rounded-3xl p-8 border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-purple-500/20"></div>

            <form onSubmit={handleUploadSubmit} className="space-y-6">
              
              {!file ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 relative cursor-pointer ${
                    dragActive 
                      ? "border-indigo-500 bg-indigo-500/5 shadow-inner shadow-indigo-500/5"
                      : "border-white/10 hover:border-white/20 bg-white/[0.01]"
                  }`}
                >
                  <input
                    type="file"
                    id="file-upload"
                    accept=".pdf,.docx"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer space-y-4 block">
                    <div className="inline-flex p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-105 transition-transform">
                      <Upload className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-semibold">
                        Drag and drop your resume file here
                      </p>
                      <p className="text-xs text-zinc-500">
                        or click to browse from computer
                      </p>
                    </div>
                    <div className="flex justify-center gap-6 text-xs text-zinc-400 font-semibold pt-4">
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-zinc-500" /> PDF Format
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-zinc-500" /> DOCX Format
                      </span>
                      <span className="text-zinc-500">| Max size 5MB</span>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                      <FileText className="h-8 w-8" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm max-w-xs truncate">{file.name}</p>
                      <p className="text-xs text-zinc-500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-3 bg-white/[0.02] hover:bg-red-950/20 hover:text-red-400 border border-white/5 hover:border-red-500/20 rounded-xl active:scale-95 transition-all text-zinc-400"
                    title="Remove File"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={!file || uploading}
                  className="btn-shimmer bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-4 px-8 rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Uploading & Parsing...</span>
                    </>
                  ) : (
                    <>
                      <FileUp className="h-4 w-4" />
                      <span>Upload & Analyze</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* Reset Password Modal Popup */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-8 border border-white/15 relative shadow-2xl overflow-hidden animate-scale-in">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/30 to-purple-500/30"></div>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Key className="h-5 w-5 text-indigo-400" />
                <span>Reset Password</span>
              </h3>
              <button 
                onClick={() => setShowResetModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {resetSuccess && (
              <div className="flex items-center gap-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 p-4 rounded-2xl mb-6 text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>Password updated successfully!</span>
              </div>
            )}

            {resetError && (
              <div className="flex items-center gap-3 bg-red-950/30 border border-red-500/20 text-red-300 p-4 rounded-2xl mb-6 text-sm">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {/* Check for Google Auth */}
            {userProfile?.provider === "google" && !userProfile.avatar && (
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl text-xs text-zinc-400 mb-4">
                You logged in via Google. You can set a password here to enable email/password sign-in.
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Old Password */}
              {userProfile?.provider !== "google" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">Current Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type="password"
                      required
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="••••••••"
                      className="glass-input w-full pl-11 pr-4 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="glass-input w-full pl-11 pr-4 py-2.5 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Confirm New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="glass-input w-full pl-11 pr-4 py-2.5 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-white border border-white/10 font-semibold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="btn-shimmer bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-xl active:scale-[0.98] transition-all flex items-center gap-2 border border-white/10 disabled:opacity-50"
                >
                  {resetting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>Reset Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
