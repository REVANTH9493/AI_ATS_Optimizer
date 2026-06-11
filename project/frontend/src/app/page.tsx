"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Compass, Briefcase, FileText, Key, Lock, LogOut, Loader2,
  Sparkles, AlertCircle, CheckCircle2, Link, FileUp, Database,
  TrendingUp, Award, BookOpen, X, Copy, Check, ChevronRight, Cpu, ClipboardList,
  Trash2, History, Plus
} from "lucide-react";
import { API_URL } from "@/config";

interface JobAnalysis {
  company: string;
  job_title: string;
  required_skills: string[];
  preferred_skills: string[];
  experience_required: string;
  education_required: string;
  keywords: string[];
}

interface ATSAnalysis {
  ats_score_before: number;
  ats_score_after: number;
  skill_match_percentage: number;
  experience_match_percentage: number;
  education_match_percentage: number;
  keyword_match_percentage: number;
  project_relevance_percentage?: number;
  job_title_match_percentage?: number;
  certification_match_percentage?: number;
  formatting_score_percentage?: number;
  missing_keywords: string[];
  missing_skills: string[];
  strengths: string[];
  weaknesses: string[];
}

interface TailoredExperience {
  company: string;
  role: string;
  duration: string;
  description: string;
}

interface TailoredProject {
  name: string;
  description: string;
  url: string | null;
}

interface TailoredEducation {
  institution: string;
  degree: string;
  year: string;
  gpa?: string;
}

interface TailoredCertification {
  name: string;
  issuer: string;
  date: string;
}

interface TailoredResume {
  professional_summary: string;
  skills: string[];
  experience: TailoredExperience[];
  projects: TailoredProject[];
  education: TailoredEducation[];
  certifications: TailoredCertification[];
}

interface OptimizationReport {
  sections_modified: string[];
  keywords_added: string[];
  improvements_made: string[];
  recommended_skills_to_learn: string[];
  actionable_suggestions?: string[];
}

interface ATSResponse {
  job_analysis: JobAnalysis;
  ats_analysis: ATSAnalysis;
  tailored_resume: TailoredResume;
  optimization_report: OptimizationReport;
}

export default function HomePage() {
  const router = useRouter();

  // User Profile
  const [userProfile, setUserProfile] = useState<{ email: string; name: string; avatar?: string; resume_url?: string; provider?: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Profile Dropdown & Password Reset Modal States
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState("");

  // Input states
  const [inputType, setInputType] = useState<"url" | "text">("url");
  const [jobUrl, setJobUrl] = useState("");
  const [jobText, setJobText] = useState("");

  // Processing states
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeStage, setOptimizeStage] = useState<"scraping" | "analyzing" | "tailoring" | "packaging" | "">("");
  const [errorMsg, setErrorMsg] = useState("");
  const [atsData, setAtsData] = useState<ATSResponse | null>(null);

  // History States
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeHistoryFilename, setActiveHistoryFilename] = useState<string | null>(null);

  // Resume Selector States
  const [step, setStep] = useState<"input" | "select_resume" | "results">("input");
  const [resumesList, setResumesList] = useState<any[]>([]);
  const [selectedResumeName, setSelectedResumeName] = useState<string | null>(null);
  const [loadingResumes, setLoadingResumes] = useState(false);

  // Result Tabs
  const [activeTab, setActiveTab] = useState<"scores" | "keywords" | "resume" | "report">("scores");
  const [resumeSectionTab, setResumeSectionTab] = useState<"summary" | "skills" | "experience" | "projects" | "education">("summary");
  
  // UI Copy state
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Load profile state
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      setLoadingProfile(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem("user", JSON.stringify(data));
          setUserProfile(data);
        } else {
          setUserProfile(JSON.parse(storedUser));
        }
      } catch (err) {
        setUserProfile(JSON.parse(storedUser));
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [router]);

  // Fetch search/optimization history
  const fetchHistory = async () => {
    const token = localStorage.getItem("token");
    if (!token || !userProfile) return;

    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_URL}/api/ats/history`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchHistory();
    } else {
      setHistory([]);
      setActiveHistoryFilename(null);
    }
  }, [userProfile]);

  // Load past history item details
  const loadHistoryItem = async (filename: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setOptimizing(true);
    setOptimizeStage("analyzing");
    setErrorMsg("");

    try {
      const res = await fetch(`${API_URL}/api/ats/history/${filename}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to load past search details.");
      }

      if (data.data && data.data.optimized_response) {
        setAtsData(data.data.optimized_response);
        setActiveHistoryFilename(filename);
        setStep("results");
        setActiveTab("scores");
      } else {
        throw new Error("Invalid history data structure.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to retrieve history details.");
    } finally {
      setOptimizing(false);
      setOptimizeStage("");
    }
  };

  // Delete a history item
  const deleteHistoryItem = async (e: React.MouseEvent, filename: string) => {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token) return;

    if (!confirm("Are you sure you want to delete this optimization from your history?")) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/ats/history/${filename}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        if (activeHistoryFilename === filename) {
          setAtsData(null);
          setActiveHistoryFilename(null);
          setStep("input");
        }
        fetchHistory();
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to delete history item.");
      }
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  };

  // Auto-run pending job optimization if the user just signed in/up and has a resume
  useEffect(() => {
    const pendingStr = localStorage.getItem("pending_job_input");
    const token = localStorage.getItem("token");
    if (pendingStr && token && userProfile && userProfile.resume_url) {
      try {
        const pending = JSON.parse(pendingStr);
        setInputType(pending.inputType);
        
        let payload: any = {};
        if (pending.inputType === "url") {
          setJobUrl(pending.jobUrl);
          payload.job_url = pending.jobUrl;
        } else {
          setJobText(pending.jobText);
          payload.job_description_text = pending.jobText;
        }
        
        localStorage.removeItem("pending_job_input");
        
        const runAutoOptimize = async () => {
          setOptimizing(true);
          setOptimizeStage(pending.inputType === "url" ? "scraping" : "analyzing");
          setErrorMsg("");
          setAtsData(null);

          const scrapeTimeout = setTimeout(() => {
            if (pending.inputType === "url") setOptimizeStage("analyzing");
          }, 4000);

          const tailoringTimeout = setTimeout(() => {
            setOptimizeStage("tailoring");
          }, 8000);

          const packagingTimeout = setTimeout(() => {
            setOptimizeStage("packaging");
          }, 16000);

          try {
            const response = await fetch(`${API_URL}/api/ats/optimize`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify(payload)
            });

            clearTimeout(scrapeTimeout);
            clearTimeout(tailoringTimeout);
            clearTimeout(packagingTimeout);

            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.detail || "Optimization failed.");
            }

            setAtsData(data);
            setOptimizeStage("");
            setStep("results");
            setActiveTab("scores");
            
            // Refresh history list and automatically select the first item as active
            if (token) {
              fetch(`${API_URL}/api/ats/history`, {
                headers: { "Authorization": `Bearer ${token}` }
              })
              .then(res => res.json())
              .then(resData => {
                if (resData.status === "success" && resData.history && resData.history.length > 0) {
                  setHistory(resData.history);
                  setActiveHistoryFilename(resData.history[0].filename);
                }
              })
              .catch(err => console.error(err));
            }
          } catch (err: any) {
            setErrorMsg(err.message || "An error occurred during ATS analysis.");
          } finally {
            setOptimizing(false);
          }
        };

        runAutoOptimize();
      } catch (e) {
        localStorage.removeItem("pending_job_input");
      }
    }
  }, [userProfile]);

  // Log Out
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUserProfile(null);
    router.push("/");
  };

  // Reset Password Callback
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
      const response = await fetch(`${API_URL}/api/auth/change-password`, {
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

  // Trigger ATS Optimization: fetches resumes list to proceed to selector
  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setAtsData(null);
    
    const token = localStorage.getItem("token");
    if (!token) {
      const pendingJob = {
        inputType,
        jobUrl: inputType === "url" ? jobUrl : "",
        jobText: inputType === "text" ? jobText : ""
      };
      localStorage.setItem("pending_job_input", JSON.stringify(pendingJob));
      router.push("/login?redirect=optimize");
      return;
    }

    setLoadingResumes(true);
    try {
      const res = await fetch(`${API_URL}/api/resume/list`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to retrieve uploaded resumes.");
      }
      
      const resumes = data.resumes || [];
      setResumesList(resumes);

      if (resumes.length === 0) {
        setErrorMsg("No uploaded resumes found. Please upload a resume first before optimizing.");
        return;
      }

      // Default the selection to the active resume from profile or the first resume in list
      let defaultResume = resumes[0].name;
      if (userProfile?.resume_url) {
        const matching = resumes.find((r: any) => userProfile.resume_url?.includes(r.name));
        if (matching) defaultResume = matching.name;
      }
      setSelectedResumeName(defaultResume);
      setStep("select_resume");
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while checking uploaded resumes.");
    } finally {
      setLoadingResumes(false);
    }
  };

  // Run the actual LLM ATS Optimization call
  const runOptimization = async () => {
    setErrorMsg("");
    setAtsData(null);
    setOptimizing(true);
    setOptimizeStage(inputType === "url" ? "scraping" : "analyzing");

    const token = localStorage.getItem("token");
    if (!token) return;

    const scrapeTimeout = setTimeout(() => {
      if (inputType === "url") setOptimizeStage("analyzing");
    }, 4000);

    const tailoringTimeout = setTimeout(() => {
      setOptimizeStage("tailoring");
    }, 8000);

    const packagingTimeout = setTimeout(() => {
      setOptimizeStage("packaging");
    }, 16000);

    try {
      const payload: any = {
        resume_name: selectedResumeName
      };
      if (inputType === "url") {
        payload.job_url = jobUrl;
      } else {
        payload.job_description_text = jobText;
      }

      const response = await fetch(`${API_URL}/api/ats/optimize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      clearTimeout(scrapeTimeout);
      clearTimeout(tailoringTimeout);
      clearTimeout(packagingTimeout);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Optimization failed.");
      }

      setAtsData(data);
      setOptimizeStage("");
      setStep("results");
      setActiveTab("scores");
      
      // Refresh history list and automatically select the first item as active
      fetch(`${API_URL}/api/ats/history`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(resData => {
        if (resData.status === "success" && resData.history && resData.history.length > 0) {
          setHistory(resData.history);
          setActiveHistoryFilename(resData.history[0].filename);
        }
      })
      .catch(err => console.error(err));
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during ATS analysis.");
      setStep("select_resume");
    } finally {
      setOptimizing(false);
    }
  };

  // Copy structured tailored sections to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const getResumeCopyString = (resume: TailoredResume) => {
    let str = `PROFESSIONAL SUMMARY\n${resume.professional_summary}\n\n`;
    str += `SKILLS\n${resume.skills.join(", ")}\n\n`;
    str += `EXPERIENCE\n`;
    resume.experience.forEach(exp => {
      const descStr = Array.isArray(exp.description) ? exp.description.join("\n- ") : exp.description;
      str += `${exp.role} at ${exp.company} (${exp.duration})\n- ${descStr}\n\n`;
    });
    str += `PROJECTS\n`;
    resume.projects.forEach(proj => {
      const descStr = Array.isArray(proj.description) ? proj.description.join("\n- ") : proj.description;
      str += `${proj.name}\n- ${descStr}${proj.url ? " - " + proj.url : ""}\n\n`;
    });
    str += `EDUCATION\n`;
    resume.education.forEach(edu => {
      str += `${edu.degree} from ${edu.institution} (${edu.year})\n`;
    });
    return str;
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

      <div className="max-w-6xl mx-auto relative z-10">

        {/* Global Header */}
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/10 border border-indigo-500/20">
              <Compass className="h-6 w-6 text-indigo-400" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-gradient">
              AI ATS Optimizer
            </span>
          </div>

          <div className="flex items-center gap-3">
            {userProfile ? (
              <>
                <button
                  onClick={() => router.push("/resume-upload?force=true")}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] transition-all text-xs font-semibold text-zinc-300"
                >
                  <FileUp className="h-4 w-4 text-indigo-400" />
                  <span>Update Resume</span>
                </button>

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

                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-red-950/20 hover:text-red-400 border border-white/5 hover:border-red-500/20 active:scale-95 transition-all text-zinc-400"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/login?tab=login")}
                  className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] transition-all text-xs font-semibold text-zinc-300"
                >
                  Sign In
                </button>
                <button
                  onClick={() => router.push("/login?tab=signup")}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold transition-all border border-white/10"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Title Section */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/5 text-xs text-indigo-400 font-semibold mb-3">
            <Sparkles className="h-3 w-3" />
            <span>ATS Compatibility Matching & Keyword Optimization</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">AI ATS Optimizer</h2>
          <p className="text-sm text-zinc-400 mt-2 max-w-lg mx-auto">
            Scan your resume against any job description to instantly tailor bullet points and align with key requirements.
          </p>
        </div>

        {/* Main Content Area */}
        {userProfile ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
            {/* Sidebar (Left Column) */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="glass-panel rounded-3xl p-5 border border-white/10 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                  <h3 className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 flex items-center gap-1.5">
                    <History className="h-4 w-4" />
                    <span>Past Searches</span>
                  </h3>
                  {atsData && (
                    <button
                      onClick={() => {
                        setAtsData(null);
                        setActiveHistoryFilename(null);
                        setStep("input");
                      }}
                      className="p-1.5 bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] hover:text-white rounded-lg text-zinc-400 text-[10px] font-bold transition-all flex items-center gap-1"
                      title="New Tailoring Run"
                    >
                      <Plus className="h-3 w-3" />
                      <span>New</span>
                    </button>
                  )}
                </div>

                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-500 mb-2" />
                    <span className="text-[10px]">Loading history...</span>
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 space-y-1">
                    <ClipboardList className="h-8 w-8 mx-auto opacity-30 text-indigo-400" />
                    <p className="text-[10px] font-semibold">No history found</p>
                    <p className="text-[9px] text-zinc-600">Your tailored jobs will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                    {history.map((item) => {
                      const isActive = activeHistoryFilename === item.filename;
                      const dateStr = item.timestamp
                        ? new Date(item.timestamp * 1000).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })
                        : "Unknown Date";

                      return (
                        <div
                          key={item.filename}
                          onClick={() => loadHistoryItem(item.filename)}
                          className={`group relative flex justify-between items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                            isActive
                              ? "bg-indigo-600/10 border-indigo-500/40"
                              : "bg-white/[0.01] border-white/5 hover:bg-white/[0.03] hover:border-white/10"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-white truncate" title={item.role}>
                              {item.role}
                            </h4>
                            <p className="text-[10px] text-indigo-400 truncate mt-0.5" title={item.company}>
                              {item.company}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] text-zinc-500">{dateStr}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                              item.score >= 80 
                                ? "bg-emerald-500/10 text-emerald-400" 
                                : item.score >= 60 
                                  ? "bg-amber-500/10 text-amber-400" 
                                  : "bg-red-500/10 text-red-400"
                            }`}>
                              {item.score}%
                            </span>

                            <button
                              onClick={(e) => deleteHistoryItem(e, item.filename)}
                              className="p-1 rounded-lg bg-transparent hover:bg-red-950/20 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete Search"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Main Content Area (Right Column) */}
            <div className="lg:col-span-9 w-full">
              {/* INPUT PANEL AND LOADER CONTAINER */}
              {step === "input" && !optimizing && (
                <div className="glass-panel rounded-3xl p-8 border border-white/10 relative overflow-hidden shadow-2xl max-w-2xl mx-auto">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-purple-500/20"></div>

                  {/* Input toggle */}
                  <div className="flex gap-2 p-1 bg-zinc-950 rounded-2xl border border-white/5 mb-6">
                    <button
                      type="button"
                      onClick={() => setInputType("url")}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${inputType === "url" ? "bg-white/[0.05] text-white border border-white/15" : "text-zinc-400 hover:text-white"}`}
                    >
                      <Link className="h-3.5 w-3.5" />
                      <span>Job URL / Link</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputType("text")}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${inputType === "text" ? "bg-white/[0.05] text-white border border-white/15" : "text-zinc-400 hover:text-white"}`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Paste Description Text</span>
                    </button>
                  </div>

                  {errorMsg && (
                    <div className="flex items-center gap-3 bg-red-950/30 border border-red-500/20 text-red-300 p-4 rounded-2xl mb-6 text-xs">
                      <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleJobSubmit} className="space-y-5">
                    {inputType === "url" ? (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400">Job Posting Link</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                            <Link className="h-4 w-4" />
                          </span>
                          <input
                            type="url"
                            required
                            value={jobUrl}
                            onChange={(e) => setJobUrl(e.target.value)}
                            placeholder="https://jobs.lever.co/company/software-engineer"
                            className="glass-input w-full pl-11 pr-4 py-3.5 rounded-xl text-sm"
                          />
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1">
                          Enter the link to the job posting from any hiring board or company website.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400">Job Specification Details</label>
                        <textarea
                          required
                          value={jobText}
                          onChange={(e) => setJobText(e.target.value)}
                          rows={8}
                          placeholder="Paste the target job description details here, including responsibilities, required skills, and qualifications..."
                          className="glass-input w-full px-4 py-3 rounded-xl text-sm resize-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loadingResumes}
                      className="btn-shimmer w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 px-6 rounded-xl text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-white/10 disabled:opacity-50"
                    >
                      {loadingResumes ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Checking Resumes...</span>
                        </>
                      ) : (
                        <>
                          <Cpu className="h-4 w-4" />
                          <span>Optimize Resume for ATS</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* SELECT RESUME STEP */}
              {step === "select_resume" && !optimizing && (
                <div className="glass-panel rounded-3xl p-8 border border-white/10 relative overflow-hidden shadow-2xl max-w-2xl mx-auto space-y-6 animate-fade-in">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-purple-500/20"></div>

                  <div className="space-y-1.5">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-indigo-400" />
                      <span>Choose Resume for Optimization</span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Select which of your uploaded resume versions you want to tailor for this specific role description.
                    </p>
                  </div>

                  {/* Job posting summary card */}
                  <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl space-y-1">
                    <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500">Target Posting</span>
                    <h4 className="text-xs font-bold text-white truncate">
                      {inputType === "url" ? (
                        <span className="flex items-center gap-1.5 text-indigo-400">
                          <Link className="h-3.5 w-3.5" />
                          <span>{jobUrl}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-300">
                          {jobText.slice(0, 120)}{jobText.length > 120 ? "..." : ""}
                        </span>
                      )}
                    </h4>
                  </div>

                  {/* Resumes cards grid */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {resumesList.map((resItem) => {
                      const isSelected = selectedResumeName === resItem.name;
                      const sizeKb = (resItem.size / 1024).toFixed(0);
                      const dateStr = resItem.created_at || resItem.updated_at
                        ? new Date(resItem.created_at || resItem.updated_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })
                        : "Unknown Date";

                      return (
                        <div
                          key={resItem.name}
                          onClick={() => setSelectedResumeName(resItem.name)}
                          className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? "bg-indigo-600/10 border-indigo-500/40 shadow-lg"
                              : "bg-white/[0.01] border-white/5 hover:bg-white/[0.03] hover:border-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2.5 rounded-xl border ${isSelected ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300" : "bg-white/5 border-white/10 text-zinc-400"}`}>
                              <FileText className="h-4.5 w-4.5" />
                            </div>
                            <div className="text-left min-w-0">
                              <p className="font-bold text-xs text-white truncate max-w-[320px]" title={resItem.name}>
                                {resItem.name}
                              </p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">
                                {sizeKb} KB • Uploaded {dateStr}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                            )}
                            <span className={`text-[10px] px-2.5 py-1 rounded-xl border font-bold transition-colors ${
                              isSelected
                                ? "bg-indigo-600 text-white border-transparent"
                                : "bg-transparent text-zinc-400 border-white/10 hover:text-white"
                            }`}>
                              {isSelected ? "Selected" : "Select"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {errorMsg && (
                    <div className="flex items-center gap-3 bg-red-950/30 border border-red-500/20 text-red-300 p-4 rounded-2xl text-xs">
                      <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Navigation controls */}
                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => setStep("input")}
                      className="px-5 py-2.5 bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] rounded-xl text-xs font-semibold text-zinc-300 transition-all"
                    >
                      Back to Input
                    </button>

                    <button
                      onClick={runOptimization}
                      disabled={!selectedResumeName}
                      className="btn-shimmer bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-xl active:scale-[0.98] transition-all flex items-center gap-2 border border-white/10 disabled:opacity-50"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Run AI Optimization</span>
                    </button>
                  </div>
                </div>
              )}

              {/* LOADING STATE */}
              {optimizing && (
                <div className="glass-panel rounded-3xl p-12 text-center border border-white/10 relative overflow-hidden space-y-8 min-h-[350px] flex flex-col justify-center items-center max-w-xl mx-auto">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-purple-500/20"></div>

                  <div className="relative">
                    <div className="absolute -inset-4 rounded-full border border-dashed border-indigo-500/30 animate-spin-slow"></div>
                    <div className="h-16 w-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-white tracking-wide">
                      {optimizeStage === "scraping" && "Reading Job Listing Link"}
                      {optimizeStage === "analyzing" && "Analyzing Core Competencies"}
                      {optimizeStage === "tailoring" && "Optimizing Bullet Points"}
                      {optimizeStage === "packaging" && "Formatting Final Report"}
                    </h3>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto min-h-[40px] leading-relaxed">
                      {optimizeStage === "scraping" && "Reading the job listing information..."}
                      {optimizeStage === "analyzing" && "Comparing your resume details with the job requirements..."}
                      {optimizeStage === "tailoring" && "Aligning your resume highlight bullet points..."}
                      {optimizeStage === "packaging" && "Calculating compatibility score and final details..."}
                    </p>
                  </div>

                  {/* Simulated progress indicators */}
                  <div className="flex gap-1.5 w-32 justify-center">
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${optimizeStage === "scraping" || optimizeStage === "analyzing" || optimizeStage === "tailoring" || optimizeStage === "packaging" ? "w-8 bg-indigo-500" : "w-3 bg-white/10"}`}></div>
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${optimizeStage === "analyzing" || optimizeStage === "tailoring" || optimizeStage === "packaging" ? "w-8 bg-indigo-500" : "w-3 bg-white/10"}`}></div>
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${optimizeStage === "tailoring" || optimizeStage === "packaging" ? "w-8 bg-indigo-500" : "w-3 bg-white/10"}`}></div>
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${optimizeStage === "packaging" ? "w-8 bg-indigo-500" : "w-3 bg-white/10"}`}></div>
                  </div>
                </div>
              )}

              {/* COMPATIBILITY RESULTS VIEW */}
              {step === "results" && atsData && (
                <div className="space-y-6">

                  {/* Sub-Header bar / Controls */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-950/60 border border-white/5 rounded-2xl p-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Target Role</span>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{atsData.job_analysis.job_title}</span>
                        <span className="text-zinc-500">@</span>
                        <span className="text-indigo-400">{atsData.job_analysis.company}</span>
                      </h4>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setAtsData(null);
                          setActiveHistoryFilename(null);
                        }}
                        className="px-4 py-2 bg-white/[0.02] border border-white/15 hover:bg-white/[0.05] rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
                      >
                        Analyze New Job
                      </button>

                      <button
                        onClick={() => copyToClipboard(getResumeCopyString(atsData.tailored_resume), "all")}
                        className="px-4 py-2 bg-white/[0.02] border border-white/15 hover:bg-white/[0.05] rounded-xl text-xs font-semibold transition-all active:scale-[0.98] flex items-center gap-1.5"
                      >
                        {copiedSection === "all" ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy Raw Text</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          localStorage.setItem("tailoredResume", JSON.stringify(atsData.tailored_resume));
                          router.push("/resume-preview");
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.98] flex items-center gap-1.5 border border-white/10 shadow-lg shadow-indigo-600/10"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Preview & Export</span>
                      </button>
                    </div>
                  </div>

                  {/* TAB SELECTORS */}
                  <div className="flex gap-1 border-b border-white/5 p-0.5 bg-zinc-950/30 rounded-xl">
                    <button
                      onClick={() => setActiveTab("scores")}
                      className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${activeTab === "scores" ? "text-indigo-400 border-indigo-500 bg-white/[0.01]" : "text-zinc-500 border-transparent hover:text-zinc-300"}`}
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>Scores & Alignment</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("keywords")}
                      className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${activeTab === "keywords" ? "text-indigo-400 border-indigo-500 bg-white/[0.01]" : "text-zinc-500 border-transparent hover:text-zinc-300"}`}
                    >
                      <Cpu className="h-3.5 w-3.5" />
                      <span>Keywords & Gaps</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("resume")}
                      className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${activeTab === "resume" ? "text-indigo-400 border-indigo-500 bg-white/[0.01]" : "text-zinc-500 border-transparent hover:text-zinc-300"}`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Tailored Resume</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("report")}
                      className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${activeTab === "report" ? "text-indigo-400 border-indigo-500 bg-white/[0.01]" : "text-zinc-500 border-transparent hover:text-zinc-300"}`}
                    >
                      <Award className="h-3.5 w-3.5" />
                      <span>Improvements Report</span>
                    </button>
                  </div>

                  {/* TAB CONTENT: 1. SCORES & ALIGNMENT */}
                  {activeTab === "scores" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                      {/* Score cards rings */}
                      <div className="md:col-span-1 glass-panel rounded-3xl p-6 border border-white/10 flex flex-col justify-center items-center text-center">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-6">ATS Match Increase</span>
                        
                        <div className="flex justify-around items-center w-full gap-4">
                          {/* Before Ring */}
                          <div className="flex flex-col items-center">
                            <div className="relative h-20 w-20 flex items-center justify-center rounded-full bg-zinc-950 border border-white/5 shadow-inner">
                              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                                <circle cx="40" cy="40" r="32" className="stroke-zinc-800" strokeWidth="6" fill="transparent" />
                                <circle cx="40" cy="40" r="32" className="stroke-red-500/80 transition-all duration-1000" strokeWidth="6" fill="transparent"
                                  strokeDasharray={2 * Math.PI * 32}
                                  strokeDashoffset={2 * Math.PI * 32 * (1 - atsData.ats_analysis.ats_score_before / 100)} />
                              </svg>
                              <span className="text-base font-extrabold text-red-400">{atsData.ats_analysis.ats_score_before}</span>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-semibold mt-2.5">Original Score</span>
                          </div>

                          <ChevronRight className="h-6 w-6 text-zinc-600" />

                          {/* After Ring */}
                          <div className="flex flex-col items-center">
                            <div className="relative h-24 w-24 flex items-center justify-center rounded-full bg-zinc-950 border border-white/5 shadow-lg shadow-emerald-500/5">
                              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                                <circle cx="48" cy="48" r="38" className="stroke-zinc-800" strokeWidth="8" fill="transparent" />
                                <circle cx="48" cy="48" r="38" className="stroke-emerald-400 transition-all duration-1000" strokeWidth="8" fill="transparent"
                                  strokeDasharray={2 * Math.PI * 38}
                                  strokeDashoffset={2 * Math.PI * 38 * (1 - atsData.ats_analysis.ats_score_after / 100)} />
                              </svg>
                              <span className="text-xl font-extrabold text-emerald-400">{atsData.ats_analysis.ats_score_after}</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-bold mt-2.5">Optimized Score</span>
                          </div>
                        </div>

                        <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 mt-6 text-left w-full text-xs flex gap-2">
                          <Sparkles className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                          <span className="text-zinc-300">
                            Successfully boosted potential score compatibility by <strong className="text-emerald-400">+{atsData.ats_analysis.ats_score_after - atsData.ats_analysis.ats_score_before} points</strong> through targeted phrasing updates!
                          </span>
                        </div>
                      </div>

                      {/* Score breakdown metrics bars */}
                      <div className="md:col-span-2 glass-panel rounded-3xl p-6 border border-white/10 space-y-5">
                        <h4 className="text-sm font-bold text-zinc-300">Dimension Compatibility Breakdown</h4>
                        
                        {/* Skill Match */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-zinc-400">Skills Alignment (40%)</span>
                            <span className="text-indigo-400">{atsData.ats_analysis.skill_match_percentage}%</span>
                          </div>
                          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${atsData.ats_analysis.skill_match_percentage}%` }}></div>
                          </div>
                        </div>

                        {/* Experience Match */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-zinc-400">Experience Alignment (20%)</span>
                            <span className="text-indigo-400">{atsData.ats_analysis.experience_match_percentage}%</span>
                          </div>
                          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${atsData.ats_analysis.experience_match_percentage}%` }}></div>
                          </div>
                        </div>

                        {/* Keyword Match */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-zinc-400">Keyword Density (10%)</span>
                            <span className="text-indigo-400">{atsData.ats_analysis.keyword_match_percentage}%</span>
                          </div>
                          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${atsData.ats_analysis.keyword_match_percentage}%` }}></div>
                          </div>
                        </div>

                        {/* Project Relevance */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-zinc-400">Project Relevance (10%)</span>
                            <span className="text-indigo-400">{atsData.ats_analysis.project_relevance_percentage ?? 0}%</span>
                          </div>
                          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${atsData.ats_analysis.project_relevance_percentage ?? 0}%` }}></div>
                          </div>
                        </div>

                        {/* Job Title Match */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-zinc-400">Job Title Match (5%)</span>
                            <span className="text-indigo-400">{atsData.ats_analysis.job_title_match_percentage ?? 0}%</span>
                          </div>
                          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${atsData.ats_analysis.job_title_match_percentage ?? 0}%` }}></div>
                          </div>
                        </div>

                        {/* Education Match */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-zinc-400">Education Alignment (5%)</span>
                            <span className="text-indigo-400">{atsData.ats_analysis.education_match_percentage}%</span>
                          </div>
                          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${atsData.ats_analysis.education_match_percentage}%` }}></div>
                          </div>
                        </div>

                        {/* Certification Match */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-zinc-400">Certification Match (5%)</span>
                            <span className="text-indigo-400">{atsData.ats_analysis.certification_match_percentage ?? 0}%</span>
                          </div>
                          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${atsData.ats_analysis.certification_match_percentage ?? 0}%` }}></div>
                          </div>
                        </div>

                        {/* Formatting Score */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-zinc-400">Formatting Quality (5%)</span>
                            <span className="text-indigo-400">{atsData.ats_analysis.formatting_score_percentage ?? 0}%</span>
                          </div>
                          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${atsData.ats_analysis.formatting_score_percentage ?? 0}%` }}></div>
                          </div>
                        </div>

                        {/* Context Info */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5 text-xs">
                          <div>
                            <span className="text-zinc-500 block">Experience Required:</span>
                            <span className="text-zinc-300 font-semibold">{atsData.job_analysis.experience_required}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block">Education Required:</span>
                            <span className="text-zinc-300 font-semibold">{atsData.job_analysis.education_required}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB CONTENT: 2. KEYWORDS & GAPS */}
                  {activeTab === "keywords" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                      {/* Keywords comparison lists */}
                      <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-6">
                        <div>
                          <h4 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                            <AlertCircle className="h-4.5 w-4.5 text-indigo-400" />
                            <span>Missing Keywords & Gaps</span>
                          </h4>
                          {atsData.ats_analysis.missing_keywords.length === 0 ? (
                            <p className="text-xs text-zinc-500">None! You have great keyword coverage.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {atsData.ats_analysis.missing_keywords.map((kw, i) => (
                                <span key={i} className="px-2.5 py-1 bg-red-950/20 border border-red-500/20 text-red-300 rounded-lg text-xs font-semibold">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                            <Cpu className="h-4.5 w-4.5 text-indigo-400" />
                            <span>Missing Technical Skills</span>
                          </h4>
                          {atsData.ats_analysis.missing_skills.length === 0 ? (
                            <p className="text-xs text-zinc-500">None! You possess all target skills.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {atsData.ats_analysis.missing_skills.map((sk, i) => (
                                <span key={i} className="px-2.5 py-1 bg-amber-950/20 border border-amber-500/20 text-amber-300 rounded-lg text-xs font-semibold">
                                  {sk}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Strengths & Weaknesses */}
                      <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-6">
                        <div>
                          <h4 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                            <span>Profile Strengths</span>
                          </h4>
                          <ul className="space-y-1.5 text-xs text-zinc-400 list-disc pl-4">
                            {atsData.ats_analysis.strengths.map((str, i) => (
                              <li key={i} className="leading-relaxed">{str}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                            <X className="h-4.5 w-4.5 text-red-400" />
                            <span>Identified Weaknesses / Gaps</span>
                          </h4>
                          <ul className="space-y-1.5 text-xs text-zinc-400 list-disc pl-4">
                            {atsData.ats_analysis.weaknesses.map((wk, i) => (
                              <li key={i} className="leading-relaxed">{wk}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB CONTENT: 3. TAILORED RESUME */}
                  {activeTab === "resume" && (
                    <div className="glass-panel rounded-3xl p-6 border border-white/10 animate-fade-in grid grid-cols-1 md:grid-cols-4 gap-6">
                      
                      {/* Left side sub-selectors */}
                      <div className="md:col-span-1 flex flex-row md:flex-col gap-1.5 border-b md:border-b-0 md:border-r border-white/5 pb-4 md:pb-0 md:pr-4">
                        <button
                          onClick={() => setResumeSectionTab("summary")}
                          className={`px-3 py-2 text-xs font-bold rounded-xl text-left transition-all ${resumeSectionTab === "summary" ? "bg-white/5 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                        >
                          Summary
                        </button>
                        <button
                          onClick={() => setResumeSectionTab("skills")}
                          className={`px-3 py-2 text-xs font-bold rounded-xl text-left transition-all ${resumeSectionTab === "skills" ? "bg-white/5 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                        >
                          Skills
                        </button>
                        <button
                          onClick={() => setResumeSectionTab("experience")}
                          className={`px-3 py-2 text-xs font-bold rounded-xl text-left transition-all ${resumeSectionTab === "experience" ? "bg-white/5 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                        >
                          Work Experience
                        </button>
                        <button
                          onClick={() => setResumeSectionTab("projects")}
                          className={`px-3 py-2 text-xs font-bold rounded-xl text-left transition-all ${resumeSectionTab === "projects" ? "bg-white/5 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                        >
                          Projects
                        </button>
                        <button
                          onClick={() => setResumeSectionTab("education")}
                          className={`px-3 py-2 text-xs font-bold rounded-xl text-left transition-all ${resumeSectionTab === "education" ? "bg-white/5 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                        >
                          Education
                        </button>
                      </div>

                      {/* Right side detailed display */}
                      <div className="md:col-span-3 min-h-[300px] flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center pb-2 border-b border-white/5">
                            <h4 className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
                              {resumeSectionTab === "summary" && "Optimized Summary"}
                              {resumeSectionTab === "skills" && "Priority Reordered Skills"}
                              {resumeSectionTab === "experience" && "Tailored Bullet Points"}
                              {resumeSectionTab === "projects" && "Relevant Projects"}
                              {resumeSectionTab === "education" && "Education Details"}
                            </h4>

                            <button
                              onClick={() => {
                                let copyText = "";
                                if (resumeSectionTab === "summary") copyText = atsData.tailored_resume.professional_summary;
                                else if (resumeSectionTab === "skills") copyText = atsData.tailored_resume.skills.join(", ");
                                else if (resumeSectionTab === "experience") {
                                  copyText = atsData.tailored_resume.experience.map(e => {
                                    const descStr = Array.isArray(e.description) ? e.description.join("\n- ") : e.description;
                                    return `${e.role} at ${e.company}\n- ${descStr}`;
                                  }).join("\n\n");
                                }
                                else if (resumeSectionTab === "projects") {
                                  copyText = atsData.tailored_resume.projects.map(p => {
                                    const descStr = Array.isArray(p.description) ? p.description.join("\n- ") : p.description;
                                    return `${p.name}\n- ${descStr}`;
                                  }).join("\n\n");
                                }
                                else if (resumeSectionTab === "education") {
                                  copyText = atsData.tailored_resume.education.map(ed => `${ed.degree}${ed.gpa ? ` (${ed.gpa})` : ""} from ${ed.institution}`).join("\n\n");
                                }
                                copyToClipboard(copyText, resumeSectionTab);
                              }}
                              className="px-3 py-1.5 bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] rounded-xl text-[10px] font-semibold flex items-center gap-1 active:scale-95 transition-all text-zinc-400 hover:text-white"
                            >
                              {copiedSection === resumeSectionTab ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-400" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy Section</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Section specifics */}
                          <div className="text-sm text-zinc-300 leading-relaxed font-sans space-y-4 whitespace-pre-wrap">
                            {resumeSectionTab === "summary" && (
                              <p>{atsData.tailored_resume.professional_summary}</p>
                            )}

                            {resumeSectionTab === "skills" && (
                              <div className="flex flex-wrap gap-2 pt-2">
                                {atsData.tailored_resume.skills.map((skill, index) => (
                                  <span key={index} className="px-3 py-1.5 bg-zinc-950 border border-white/10 rounded-xl text-xs font-semibold">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}

                            {resumeSectionTab === "experience" && (
                              <div className="space-y-6 pt-2">
                                {atsData.tailored_resume.experience.map((exp, index) => (
                                  <div key={index} className="space-y-1 bg-white/[0.005] border border-white/5 p-4 rounded-2xl relative">
                                    <div className="absolute top-2 right-4 text-[10px] text-zinc-500 font-bold">{exp.duration}</div>
                                    <h5 className="font-bold text-white text-sm">{exp.role}</h5>
                                    <p className="text-xs text-indigo-400 font-semibold">{exp.company}</p>
                                    <div className="text-xs text-zinc-400 leading-relaxed mt-3 pl-4 border-l border-white/10">
                                      {Array.isArray(exp.description) ? (
                                        <ul className="list-disc pl-4 space-y-1">
                                          {exp.description.map((bullet, i) => (
                                            <li key={i}>{bullet}</li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p>{exp.description}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {resumeSectionTab === "projects" && (
                              <div className="space-y-6 pt-2">
                                {atsData.tailored_resume.projects.map((proj, index) => (
                                  <div key={index} className="space-y-1 bg-white/[0.005] border border-white/5 p-4 rounded-2xl">
                                    <h5 className="font-bold text-white text-sm flex items-center gap-2">
                                      <span>{proj.name}</span>
                                      {proj.url && (
                                        <a href={proj.url} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-indigo-400 transition-colors">
                                          <Link className="h-3.5 w-3.5" />
                                        </a>
                                      )}
                                    </h5>
                                    <div className="text-xs text-zinc-400 mt-2 pl-4 border-l border-white/10">
                                      {Array.isArray(proj.description) ? (
                                        <ul className="list-disc pl-4 space-y-1">
                                          {proj.description.map((bullet, i) => (
                                            <li key={i}>{bullet}</li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p>{proj.description}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {resumeSectionTab === "education" && (
                              <div className="space-y-4 pt-2">
                                {atsData.tailored_resume.education.map((edu, index) => (
                                  <div key={index} className="flex justify-between items-start bg-white/[0.005] border border-white/5 p-4 rounded-2xl">
                                    <div>
                                      <h5 className="font-bold text-white text-sm">
                                        {edu.degree}
                                        {edu.gpa && (
                                          <span className="ml-2 text-xs font-normal text-indigo-400">
                                            ({edu.gpa})
                                          </span>
                                        )}
                                      </h5>
                                      <p className="text-xs text-zinc-400">{edu.institution}</p>
                                    </div>
                                    <span className="text-xs font-semibold text-zinc-500">{edu.year}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-[10px] text-zinc-500 mt-8 leading-relaxed">
                          *Optimization is performed while maintaining complete factual accuracy and truthfulness of your credentials.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* TAB CONTENT: 4. OPTIMIZATION REPORT */}
                  {activeTab === "report" && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Audit Modifications logs */}
                        <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-6">
                          <div>
                            <h4 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                              <BookOpen className="h-4.5 w-4.5 text-indigo-400" />
                              <span>Sections Modified & Rewritten</span>
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {atsData.optimization_report.sections_modified.map((sect, i) => (
                                <span key={i} className="px-2.5 py-1 bg-white/[0.02] border border-white/10 text-zinc-300 rounded-lg text-xs font-semibold">
                                  {sect}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                              <span>Added Keywords Integrated</span>
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {atsData.optimization_report.keywords_added.map((kw, i) => (
                                <span key={i} className="px-2.5 py-1 bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 rounded-lg text-xs font-semibold">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Audit Details and recommendations */}
                        <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-6">
                          <div>
                            <h4 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                              <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
                              <span>Summary of Improvements Made</span>
                            </h4>
                            <ul className="space-y-1.5 text-xs text-zinc-400 list-disc pl-4">
                              {atsData.optimization_report.improvements_made.map((imp, i) => (
                                <li key={i} className="leading-relaxed">{imp}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                              <Cpu className="h-4.5 w-4.5 text-indigo-400" />
                              <span>Recommended Skills to Learn</span>
                            </h4>
                            <ul className="space-y-1.5 text-xs text-zinc-400 list-disc pl-4">
                              {atsData.optimization_report.recommended_skills_to_learn.map((sk, i) => (
                                <li key={i} className="leading-relaxed">{sk}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Actionable Suggestions (Recommended Projects & Content to Add) */}
                      {atsData.optimization_report.actionable_suggestions && atsData.optimization_report.actionable_suggestions.length > 0 && (
                        <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4 animate-fade-in">
                          <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                            <Award className="h-5 w-5 text-indigo-400 animate-pulse" />
                            <span>Recommended Resume Additions (Projects & Content Gaps)</span>
                          </h4>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            To significantly boost your chances of selection for this target role, we recommend adding the following specific content or projects to your profile:
                          </p>
                          <ul className="space-y-3 pt-1">
                            {atsData.optimization_report.actionable_suggestions.map((sug, i) => (
                              <li key={i} className="flex gap-3 items-start text-xs text-zinc-300 leading-relaxed bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl transition-all">
                                <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0 mt-0.5">
                                  <Sparkles className="h-3.5 w-3.5" />
                                </div>
                                <span>{sug}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {/* INPUT PANEL AND LOADER CONTAINER */}
            {step === "input" && !optimizing && (
              <div className="glass-panel rounded-3xl p-8 border border-white/10 relative overflow-hidden shadow-2xl w-full">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-purple-500/20"></div>

                {/* Input toggle */}
                <div className="flex gap-2 p-1 bg-zinc-950 rounded-2xl border border-white/5 mb-6">
                  <button
                    type="button"
                    onClick={() => setInputType("url")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${inputType === "url" ? "bg-white/[0.05] text-white border border-white/15" : "text-zinc-400 hover:text-white"}`}
                  >
                    <Link className="h-3.5 w-3.5" />
                    <span>Job URL / Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputType("text")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${inputType === "text" ? "bg-white/[0.05] text-white border border-white/15" : "text-zinc-400 hover:text-white"}`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Paste Description Text</span>
                  </button>
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-3 bg-red-950/30 border border-red-500/20 text-red-300 p-4 rounded-2xl mb-6 text-xs">
                    <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleJobSubmit} className="space-y-5">
                  {inputType === "url" ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400">Job Posting Link</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                          <Link className="h-4 w-4" />
                        </span>
                        <input
                          type="url"
                          required
                          value={jobUrl}
                          onChange={(e) => setJobUrl(e.target.value)}
                          placeholder="https://jobs.lever.co/company/software-engineer"
                          className="glass-input w-full pl-11 pr-4 py-3.5 rounded-xl text-sm"
                        />
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        Enter the link to the job posting from any hiring board or company website.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400">Job Specification Details</label>
                      <textarea
                        required
                        value={jobText}
                        onChange={(e) => setJobText(e.target.value)}
                        rows={8}
                        placeholder="Paste the target job description details here, including responsibilities, required skills, and qualifications..."
                        className="glass-input w-full px-4 py-3 rounded-xl text-sm resize-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                    <button
                      type="submit"
                      disabled={loadingResumes}
                      className="btn-shimmer w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 px-6 rounded-xl text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-white/10 disabled:opacity-50"
                    >
                      {loadingResumes ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Checking Resumes...</span>
                        </>
                      ) : (
                        <>
                          <Cpu className="h-4 w-4" />
                          <span>Optimize Resume for ATS</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

            {/* LOADING STATE */}
            {optimizing && (
              <div className="glass-panel rounded-3xl p-12 text-center border border-white/10 relative overflow-hidden space-y-8 min-h-[350px] flex flex-col justify-center items-center w-full">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-purple-500/20"></div>

                <div className="relative">
                  <div className="absolute -inset-4 rounded-full border border-dashed border-indigo-500/30 animate-spin-slow"></div>
                  <div className="h-16 w-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-white tracking-wide">
                    {optimizeStage === "scraping" && "Reading Job Listing Link"}
                    {optimizeStage === "analyzing" && "Analyzing Core Competencies"}
                    {optimizeStage === "tailoring" && "Optimizing Bullet Points"}
                    {optimizeStage === "packaging" && "Formatting Final Report"}
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto min-h-[40px] leading-relaxed">
                    {optimizeStage === "scraping" && "Reading the job listing information..."}
                    {optimizeStage === "analyzing" && "Comparing your resume details with the job requirements..."}
                    {optimizeStage === "tailoring" && "Aligning your resume highlight bullet points..."}
                    {optimizeStage === "packaging" && "Calculating compatibility score and final details..."}
                  </p>
                </div>

                {/* Simulated progress indicators */}
                <div className="flex gap-1.5 w-32 justify-center">
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${optimizeStage === "scraping" || optimizeStage === "analyzing" || optimizeStage === "tailoring" || optimizeStage === "packaging" ? "w-8 bg-indigo-500" : "w-3 bg-white/10"}`}></div>
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${optimizeStage === "analyzing" || optimizeStage === "tailoring" || optimizeStage === "packaging" ? "w-8 bg-indigo-500" : "w-3 bg-white/10"}`}></div>
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${optimizeStage === "tailoring" || optimizeStage === "packaging" ? "w-8 bg-indigo-500" : "w-3 bg-white/10"}`}></div>
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${optimizeStage === "packaging" ? "w-8 bg-indigo-500" : "w-3 bg-white/10"}`}></div>
                </div>
              </div>
            )}
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
