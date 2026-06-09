"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Palette, FileDown, Loader2,
  Mail, Phone, Globe, MapPin, Check, Copy, ExternalLink, Sparkles
} from "lucide-react";
import { API_URL } from "@/config";

interface Profile {
  network: string;
  username: string;
  url: string;
}

interface Location {
  address?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
  region?: string;
}

interface Basics {
  name?: string;
  label?: string;
  image?: string;
  email?: string;
  phone?: string;
  url?: string;
  summary?: string;
  location?: Location;
  profiles?: Profile[];
}

interface Work {
  name?: string;
  position?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
}

interface Education {
  institution?: string;
  url?: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
  score?: string;
}

interface Skill {
  name?: string;
  level?: string;
  keywords?: string[];
}

interface Project {
  name?: string;
  description?: string;
  highlights?: string[];
  url?: string;
}

interface Certificate {
  name?: string;
  date?: string;
  issuer?: string;
  url?: string;
}

interface JSONResume {
  basics?: Basics;
  work?: Work[];
  education?: Education[];
  skills?: Skill[];
  projects?: Project[];
  certificates?: Certificate[];
}

export default function ResumePreviewPage() {
  const router = useRouter();
  const [resumeData, setResumeData] = useState<JSONResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentTheme, setCurrentTheme] = useState<"modern" | "minimalist" | "elegant" | "professional">("modern");
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const tailoredStr = localStorage.getItem("tailoredResume");
    if (!tailoredStr) {
      setErrorMsg("No tailored resume found. Please optimize your resume first.");
      setLoading(false);
      return;
    }

    const fetchCombinedResume = async () => {
      try {
        const tailored = JSON.parse(tailoredStr);
        const response = await fetch(`${API_URL}/api/exporter/combine-and-export`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            tailored_resume: tailored
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Failed to merge resume contents.");
        }

        setResumeData(data);
      } catch (err: any) {
        setErrorMsg(err.message || "An error occurred while combining resume data.");
      } finally {
        setLoading(false);
      }
    };

    fetchCombinedResume();
  }, [router]);



  const handleDownloadDocx = async () => {
    if (!resumeData) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    setDownloadingDocx(true);
    try {
      const response = await fetch(`${API_URL}/api/exporter/download/docx?theme=${currentTheme}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(resumeData)
      });

      if (!response.ok) {
        throw new Error("Failed to download DOCX document.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const nameSlug = resumeData.basics?.name ? resumeData.basics.name.replace(/\s+/g, "_").toLowerCase() : "resume";
      a.download = `${nameSlug}_${currentTheme}_tailored.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Failed to download DOCX.");
    } finally {
      setDownloadingDocx(false);
    }
  };

  const handleCopyJson = () => {
    if (!resumeData) return;
    navigator.clipboard.writeText(JSON.stringify(resumeData, null, 2));
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#05050a] text-white">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-zinc-400 text-xs font-semibold">Generating and formatting resume themes...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#05050a] text-white p-6">
        <div className="max-w-md w-full glass-panel rounded-3xl p-8 border border-white/10 text-center space-y-6">
          <h2 className="text-xl font-bold text-red-400">Unable to preview resume</h2>
          <p className="text-sm text-zinc-400">{errorMsg}</p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to ATS Optimizer</span>
          </button>
        </div>
      </div>
    );
  }

  if (!resumeData) return null;

  const basics = resumeData.basics || {};
  const work = resumeData.work || [];
  const education = resumeData.education || [];
  const skills = resumeData.skills || [];
  const projects = resumeData.projects || [];
  const certificates = resumeData.certificates || [];

  return (
    <div className="min-h-screen bg-[#05050a] text-zinc-300 antialiased font-sans">
      
      {/* Styles injector for window.print() */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #resume-canvas, #resume-canvas * {
            visibility: visible;
          }
          #resume-canvas {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          body, html {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
          }
          .no-print {
            display: none !important;
          }
          .print-section {
            page-break-inside: avoid !important;
          }
        }
      `}} />

      {/* Header Panel - Hidden on Print */}
      <div className="no-print bg-zinc-950/80 border-b border-white/10 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="p-2 rounded-xl hover:bg-white/5 border border-white/5 text-zinc-400 hover:text-white transition-colors"
              title="Back to ATS Optimizer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span>Resume Preview & Theme Selector</span>
              </h1>
              <p className="text-[10px] text-zinc-500">Universal document format exports</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              className="px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Data</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadDocx}
              disabled={downloadingDocx}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 border border-white/10 shadow-lg shadow-indigo-600/10 disabled:opacity-50"
            >
              {downloadingDocx ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
              <span>Word (.docx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace split */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Control Bar (Theme Swappers) - Hidden on Print */}
        <div className="no-print lg:col-span-1 space-y-6">
          <div className="glass-panel border border-white/10 rounded-2xl p-5 space-y-5">
            <h3 className="text-xs uppercase font-extrabold text-zinc-400 tracking-wider flex items-center gap-2">
              <Palette className="h-4.5 w-4.5 text-indigo-400" />
              <span>Select Theme</span>
            </h3>

            <div className="space-y-2.5">
              <button
                onClick={() => setCurrentTheme("modern")}
                className={`w-full p-4 rounded-xl border text-left transition-all relative ${currentTheme === "modern" ? "bg-indigo-600/10 border-indigo-500 text-white" : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10"}`}
              >
                <p className="text-xs font-bold">Modern</p>
                <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                  Dynamic 2-column sidebar design optimized for software & technology fields.
                </p>
              </button>

              <button
                onClick={() => setCurrentTheme("minimalist")}
                className={`w-full p-4 rounded-xl border text-left transition-all relative ${currentTheme === "minimalist" ? "bg-indigo-600/10 border-indigo-500 text-white" : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10"}`}
              >
                <p className="text-xs font-bold">Minimalist</p>
                <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                  Single column design with elegant serif headings, balanced margins, and simple lists.
                </p>
              </button>

              <button
                onClick={() => setCurrentTheme("elegant")}
                className={`w-full p-4 rounded-xl border text-left transition-all relative ${currentTheme === "elegant" ? "bg-indigo-600/10 border-indigo-500 text-white" : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10"}`}
              >
                <p className="text-xs font-bold">Elegant</p>
                <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                  Centered headers, fine horizontal divider rules, and refined text hierarchy.
                </p>
              </button>

              <button
                onClick={() => setCurrentTheme("professional")}
                className={`w-full p-4 rounded-xl border text-left transition-all relative ${currentTheme === "professional" ? "bg-indigo-600/10 border-indigo-500 text-white" : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10"}`}
              >
                <p className="text-xs font-bold">Professional</p>
                <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                  Classic corporate layout with deep navy accents, clear dividers, and right-aligned dates.
                </p>
              </button>
            </div>
          </div>

        </div>

        {/* Right Canvas (A4 Sheet container) */}
        <div className="lg:col-span-3 flex justify-center">
          <div 
            id="resume-canvas"
            className="print-full-width bg-white text-zinc-900 shadow-2xl p-8 sm:p-12 w-full max-w-[850px] min-h-[1100px] border border-zinc-200/50 rounded-lg overflow-hidden transition-all duration-300"
          >
            
            {/* THEME 1: MODERN (2-column Sidebar) */}
            {currentTheme === "modern" && (
              <div className="flex flex-col md:flex-row gap-8 font-sans">
                {/* Sidebar Column */}
                <div className="md:w-1/3 flex flex-col gap-6 md:border-r border-zinc-200 md:pr-6 shrink-0">
                  {/* Contact details */}
                  <div className="space-y-4">
                    <div className="pb-4 border-b border-zinc-200">
                      <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 leading-tight">
                        {basics.name || "Your Name"}
                      </h2>
                      {basics.label && (
                        <p className="text-indigo-600 font-bold text-xs uppercase tracking-wider mt-1">
                          {basics.label}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 text-xs text-zinc-600 leading-relaxed">
                      {basics.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{basics.email}</span>
                        </div>
                      )}
                      {basics.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <span>{basics.phone}</span>
                        </div>
                      )}
                      {basics.url && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <a href={basics.url} target="_blank" rel="noreferrer" className="hover:text-indigo-600 truncate flex items-center gap-0.5">
                            <span>Portfolio</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      )}
                      {(basics.location?.city || basics.location?.region) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <span>
                            {[basics.location.city, basics.location.region].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Profiles */}
                    {basics.profiles && basics.profiles.length > 0 && (
                      <div className="pt-3 border-t border-zinc-100 flex flex-col gap-2 text-xs text-zinc-600">
                        {basics.profiles.map((prof, i) => (
                          <a key={i} href={prof.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-indigo-600">
                            {prof.network.toLowerCase().includes("linkedin") ? (
                              <svg className="h-3.5 w-3.5 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                                <rect x="2" y="9" width="4" height="12" />
                                <circle cx="4" cy="4" r="2" />
                              </svg>
                            ) : prof.network.toLowerCase().includes("github") ? (
                              <svg className="h-3.5 w-3.5 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                                <path d="M9 18c-4.51 2-5-2-7-2" />
                              </svg>
                            ) : (
                              <Globe className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            )}
                            <span className="truncate">{prof.username}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Skills Section */}
                  {skills.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Skills</h3>
                      <div className="flex flex-col gap-3">
                        {skills.map((skillGroup, i) => (
                          <div key={i} className="space-y-1">
                            {skillGroup.name && (
                              <p className="text-[11px] font-bold text-zinc-800 uppercase tracking-wide">
                                {skillGroup.name}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1">
                              {skillGroup.keywords?.map((keyword, kwIdx) => (
                                <span key={kwIdx} className="px-2 py-0.5 bg-zinc-100 text-zinc-800 rounded-md text-[10px] font-medium border border-zinc-200">
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {education.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Education</h3>
                      <div className="space-y-4">
                        {education.map((edu, i) => (
                          <div key={i} className="space-y-1 text-xs">
                            <p className="font-bold text-zinc-800 leading-tight">
                              {edu.studyType}
                              {edu.score && <span className="font-normal text-zinc-500"> ({edu.score})</span>}
                            </p>
                            {edu.area && <p className="text-zinc-600 text-[11px]">{edu.area}</p>}
                            <p className="text-[10px] text-indigo-600 font-semibold">{edu.institution}</p>
                            <p className="text-[10px] text-zinc-400">{edu.endDate}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {certificates.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Certifications</h3>
                      <div className="space-y-3">
                        {certificates.map((cert, i) => (
                          <div key={i} className="text-xs">
                            <p className="font-bold text-zinc-800 leading-tight">{cert.name}</p>
                            <p className="text-[10px] text-zinc-500">{cert.issuer}</p>
                            {cert.date && <p className="text-[9px] text-zinc-400">{cert.date}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Content Column */}
                <div className="flex-1 space-y-6">
                  {/* Summary */}
                  {basics.summary && (
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-600 leading-relaxed font-normal">
                        {basics.summary}
                      </p>
                    </div>
                  )}

                  {/* Work Experience */}
                  {work.length > 0 && (
                    <div className="space-y-4 print-section">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-800 pb-1.5 border-b border-zinc-200">
                        Professional Experience
                      </h3>
                      <div className="space-y-5">
                        {work.map((item, i) => (
                          <div key={i} className="space-y-1.5 text-xs">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-zinc-950 text-sm">
                                  {item.position}
                                </h4>
                                <p className="text-indigo-600 font-semibold text-[11px]">
                                  {item.name}
                                </p>
                              </div>
                              <span className="text-[10px] text-zinc-400 font-bold bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-full">
                                {item.startDate} {item.endDate ? ` - ${item.endDate}` : ""}
                              </span>
                            </div>
                            
                            <ul className="list-disc pl-4 space-y-1 text-zinc-600 text-[11px] leading-relaxed mt-2">
                              {item.highlights?.map((hl, index) => (
                                <li key={index}>{hl}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Projects */}
                  {projects.length > 0 && (
                    <div className="space-y-4 print-section">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-800 pb-1.5 border-b border-zinc-200">
                        Projects
                      </h3>
                      <div className="space-y-5">
                        {projects.map((proj, i) => (
                          <div key={i} className="space-y-1.5 text-xs">
                            <h4 className="font-bold text-zinc-950 text-sm flex items-center gap-1.5">
                              <span>{proj.name}</span>
                              {proj.url && (
                                <a href={proj.url} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-indigo-600">
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </h4>
                            <ul className="list-disc pl-4 space-y-1 text-zinc-600 text-[11px] leading-relaxed">
                              {proj.highlights?.map((hl, index) => (
                                <li key={index}>{hl}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* THEME 2: MINIMALIST (Clean Serif Single Column) */}
            {currentTheme === "minimalist" && (
              <div className="font-serif max-w-3xl mx-auto space-y-6 text-zinc-800">
                {/* Header */}
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-normal tracking-tight text-zinc-950">
                    {basics.name}
                  </h2>
                  <p className="font-sans text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                    {basics.label}
                  </p>
                  
                  {/* Contact row */}
                  <div className="font-sans text-[10px] text-zinc-500 flex justify-center flex-wrap gap-x-3 gap-y-1.5">
                    {basics.email && <span>{basics.email}</span>}
                    {basics.phone && <span>• {basics.phone}</span>}
                    {basics.url && (
                      <span className="flex items-center gap-0.5">
                        • <a href={basics.url} className="underline hover:text-zinc-800">{basics.url.replace(/^https?:\/\//, '')}</a>
                      </span>
                    )}
                    {basics.location?.city && <span>• {basics.location.city}, {basics.location.region}</span>}
                  </div>
                </div>

                {/* Summary */}
                {basics.summary && (
                  <p className="text-xs italic leading-relaxed text-zinc-600 text-center max-w-2xl mx-auto py-2 font-serif border-y border-zinc-100">
                    "{basics.summary}"
                  </p>
                )}

                {/* Work Experience */}
                {work.length > 0 && (
                  <div className="space-y-4 print-section">
                    <h3 className="font-sans text-xs uppercase font-black tracking-widest text-zinc-900 border-b border-zinc-200 pb-1">
                      Experience
                    </h3>
                    <div className="space-y-5">
                      {work.map((item, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between items-baseline">
                            <p className="font-bold text-sm text-zinc-950">
                              {item.position} <span className="font-normal text-zinc-500 text-xs font-sans">at</span> {item.name}
                            </p>
                            <span className="font-sans text-[10px] text-zinc-400">
                              {item.startDate} {item.endDate ? `– ${item.endDate}` : ""}
                            </span>
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-zinc-600 text-[11px] leading-relaxed">
                            {item.highlights?.map((hl, index) => (
                              <li key={index}>{hl}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {projects.length > 0 && (
                  <div className="space-y-4 print-section">
                    <h3 className="font-sans text-xs uppercase font-black tracking-widest text-zinc-900 border-b border-zinc-200 pb-1">
                      Projects
                    </h3>
                    <div className="space-y-4">
                      {projects.map((proj, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between items-baseline">
                            <p className="font-bold text-sm text-zinc-950">
                              {proj.name}
                            </p>
                            {proj.url && (
                              <a href={proj.url} className="font-sans text-[10px] text-zinc-400 underline">
                                Link
                              </a>
                            )}
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-zinc-600 text-[11px] leading-relaxed">
                            {proj.highlights?.map((hl, index) => (
                              <li key={index}>{hl}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills Grid */}
                {skills.length > 0 && (
                  <div className="space-y-4 print-section">
                    <h3 className="font-sans text-xs uppercase font-black tracking-widest text-zinc-900 border-b border-zinc-200 pb-1">
                      Skills
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
                      {skills.map((skillGroup, i) => (
                        <div key={i} className="space-y-0.5">
                          <p className="font-bold text-zinc-700 uppercase text-[10px]">{skillGroup.name}</p>
                          <p className="text-zinc-600 text-[11px]">{skillGroup.keywords?.join(", ")}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grid for Education & Certificates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-section">
                  {/* Education */}
                  {education.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-sans text-xs uppercase font-black tracking-widest text-zinc-900 border-b border-zinc-200 pb-1">
                        Education
                      </h3>
                      <div className="space-y-3">
                        {education.map((edu, i) => (
                          <div key={i} className="text-xs">
                            <p className="font-bold text-zinc-800">
                              {edu.studyType} {edu.area && `in ${edu.area}`}
                              {edu.score && <span className="font-normal text-zinc-500"> ({edu.score})</span>}
                            </p>
                            <p className="text-[11px] text-zinc-600">{edu.institution} • <span className="font-sans text-[9px] text-zinc-400">{edu.endDate}</span></p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {certificates.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-sans text-xs uppercase font-black tracking-widest text-zinc-900 border-b border-zinc-200 pb-1">
                        Certifications
                      </h3>
                      <div className="space-y-2">
                        {certificates.map((cert, i) => (
                          <div key={i} className="text-xs">
                            <p className="font-bold text-zinc-800">{cert.name}</p>
                            <p className="text-[11px] text-zinc-600">{cert.issuer} {cert.date && `• ${cert.date}`}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* THEME 3: ELEGANT (Centered classic layout) */}
            {currentTheme === "elegant" && (
              <div className="font-sans max-w-4xl mx-auto space-y-6 text-zinc-800">
                {/* Header */}
                <div className="text-center space-y-2 pb-4 border-b-2 border-zinc-800">
                  <h2 className="text-4xl font-light tracking-tight text-zinc-950 uppercase">
                    {basics.name}
                  </h2>
                  {basics.label && (
                    <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">
                      {basics.label}
                    </p>
                  )}
                  
                  {/* Contact Row */}
                  <div className="text-xs text-zinc-500 flex justify-center flex-wrap gap-4 pt-1">
                    {basics.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>{basics.email}</span>
                      </span>
                    )}
                    {basics.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{basics.phone}</span>
                      </span>
                    )}
                    {basics.url && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <a href={basics.url} className="hover:text-zinc-900">{basics.url.replace(/^https?:\/\//, '')}</a>
                      </span>
                    )}
                    {(basics.location?.city) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{basics.location.city}, {basics.location.region}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Summary */}
                {basics.summary && (
                  <div className="space-y-2">
                    <h3 className="text-xs uppercase font-extrabold text-zinc-950 tracking-wider">
                      Executive Summary
                    </h3>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      {basics.summary}
                    </p>
                  </div>
                )}

                {/* Work Experience */}
                {work.length > 0 && (
                  <div className="space-y-4 print-section">
                    <h3 className="text-xs uppercase font-extrabold text-zinc-950 tracking-wider border-b border-zinc-200 pb-1">
                      Professional Experience
                    </h3>
                    <div className="space-y-5">
                      {work.map((item, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between items-baseline">
                            <p className="font-bold text-sm text-zinc-950">
                              {item.position} <span className="font-normal text-zinc-400">|</span> <span className="text-indigo-600 font-semibold">{item.name}</span>
                            </p>
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                              {item.startDate} {item.endDate ? `- ${item.endDate}` : ""}
                            </span>
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-zinc-600 text-[11px] leading-relaxed">
                            {item.highlights?.map((hl, index) => (
                              <li key={index}>{hl}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {projects.length > 0 && (
                  <div className="space-y-4 print-section">
                    <h3 className="text-xs uppercase font-extrabold text-zinc-950 tracking-wider border-b border-zinc-200 pb-1">
                      Selected Projects
                    </h3>
                    <div className="space-y-4">
                      {projects.map((proj, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between items-baseline">
                            <p className="font-bold text-sm text-zinc-950">
                              {proj.name}
                            </p>
                            {proj.url && (
                              <a href={proj.url} className="text-[10px] text-zinc-400 hover:text-indigo-600 flex items-center gap-0.5">
                                <span>Project Link</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-zinc-600 text-[11px] leading-relaxed">
                            {proj.highlights?.map((hl, index) => (
                              <li key={index}>{hl}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {skills.length > 0 && (
                  <div className="space-y-3 print-section">
                    <h3 className="text-xs uppercase font-extrabold text-zinc-950 tracking-wider border-b border-zinc-200 pb-1">
                      Core Expertise
                    </h3>
                    <div className="space-y-2">
                      {skills.map((skillGroup, i) => (
                        <div key={i} className="text-xs flex gap-2">
                          <span className="font-bold text-zinc-800 w-28 shrink-0">{skillGroup.name}:</span>
                          <span className="text-zinc-600">{skillGroup.keywords?.join(", ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education & Certs Split */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-section">
                  {education.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs uppercase font-extrabold text-zinc-950 tracking-wider border-b border-zinc-200 pb-1">
                        Education
                      </h3>
                      <div className="space-y-3">
                        {education.map((edu, i) => (
                          <div key={i} className="text-xs">
                            <p className="font-bold text-zinc-800">
                              {edu.studyType} {edu.area && `in ${edu.area}`}
                              {edu.score && <span className="font-normal text-zinc-500"> ({edu.score})</span>}
                            </p>
                            <p className="text-[11px] text-zinc-500">{edu.institution} • {edu.endDate}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {certificates.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs uppercase font-extrabold text-zinc-950 tracking-wider border-b border-zinc-200 pb-1">
                        Certifications
                      </h3>
                      <div className="space-y-2.5">
                        {certificates.map((cert, i) => (
                          <div key={i} className="text-xs">
                            <p className="font-bold text-zinc-800">{cert.name}</p>
                            <p className="text-[11px] text-zinc-500">{cert.issuer} {cert.date && `• ${cert.date}`}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* THEME 4: PROFESSIONAL (Classic Corporate Layout with Deep Navy Accents) */}
            {currentTheme === "professional" && (
              <div className="font-sans max-w-4xl mx-auto space-y-6 text-zinc-800">
                {/* Header */}
                <div className="pb-4 border-b-2 border-slate-900">
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                    {basics.name}
                  </h2>
                  {basics.label && (
                    <p className="text-blue-900 font-bold text-sm tracking-wider uppercase mt-1">
                      {basics.label}
                    </p>
                  )}
                  
                  {/* Contact row */}
                  <div className="text-xs text-zinc-505 flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {basics.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-zinc-450" />
                        <span>{basics.email}</span>
                      </span>
                    )}
                    {basics.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-zinc-450" />
                        <span>{basics.phone}</span>
                      </span>
                    )}
                    {basics.url && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5 text-zinc-450" />
                        <a href={basics.url} target="_blank" rel="noreferrer" className="hover:underline hover:text-blue-900">{basics.url.replace(/^https?:\/\//, '')}</a>
                      </span>
                    )}
                    {(basics.location?.city || basics.location?.region) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-zinc-450" />
                        <span>
                          {[basics.location.city, basics.location.region].filter(Boolean).join(", ")}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Profiles Row */}
                  {basics.profiles && basics.profiles.length > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-zinc-505">
                      {basics.profiles.map((prof, i) => (
                        <a key={i} href={prof.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-900">
                          {prof.network.toLowerCase().includes("linkedin") ? (
                            <svg className="h-3.5 w-3.5 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                              <rect x="2" y="9" width="4" height="12" />
                              <circle cx="4" cy="4" r="2" />
                            </svg>
                          ) : (
                            <svg className="h-3.5 w-3.5 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                              <path d="M9 18c-4.51 2-5-2-7-2" />
                            </svg>
                          )}
                          <span>{prof.username}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Summary */}
                {basics.summary && (
                  <div className="space-y-1.5">
                    <h3 className="text-xs uppercase font-extrabold text-blue-900 tracking-wider">
                      Professional Summary
                    </h3>
                    <p className="text-xs text-zinc-605 leading-relaxed font-sans">
                      {basics.summary}
                    </p>
                  </div>
                )}

                {/* Skills */}
                {skills.length > 0 && (
                  <div className="space-y-2.5 print-section">
                    <h3 className="text-xs uppercase font-extrabold text-blue-900 tracking-wider border-b border-zinc-200 pb-1">
                      Key Skills & Competencies
                    </h3>
                    <div className="space-y-1.5">
                      {skills.map((skillGroup, i) => (
                        <div key={i} className="text-xs flex gap-2">
                          <span className="font-bold text-zinc-800 w-28 shrink-0">{skillGroup.name}:</span>
                          <span className="text-zinc-650">{skillGroup.keywords?.join(", ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Work Experience */}
                {work.length > 0 && (
                  <div className="space-y-4 print-section">
                    <h3 className="text-xs uppercase font-extrabold text-blue-900 tracking-wider border-b border-zinc-200 pb-1">
                      Professional History
                    </h3>
                    <div className="space-y-4">
                      {work.map((item, i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="flex justify-between items-baseline">
                            <h4 className="font-bold text-slate-900 text-sm">
                              {item.position} <span className="font-normal text-zinc-400">|</span> <span className="text-zinc-700">{item.name}</span>
                            </h4>
                            <span className="text-[10px] font-bold text-zinc-450 uppercase font-sans">
                              {item.startDate} {item.endDate ? `- ${item.endDate}` : ""}
                            </span>
                          </div>
                          
                          <ul className="list-disc pl-4 space-y-1 text-zinc-600 text-[11px] leading-relaxed">
                            {item.highlights?.map((hl, index) => (
                              <li key={index}>{hl}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {projects.length > 0 && (
                  <div className="space-y-4 print-section">
                    <h3 className="text-xs uppercase font-extrabold text-blue-900 tracking-wider border-b border-zinc-200 pb-1">
                      Key Projects
                    </h3>
                    <div className="space-y-4">
                      {projects.map((proj, i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="flex justify-between items-baseline">
                            <h4 className="font-bold text-slate-900 text-sm">
                              {proj.name}
                            </h4>
                            {proj.url && (
                              <a href={proj.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-900 hover:underline flex items-center gap-0.5 font-sans">
                                <span>Project Link</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-zinc-600 text-[11px] leading-relaxed">
                            {proj.highlights?.map((hl, index) => (
                              <li key={index}>{hl}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education & Certs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-section">
                  {education.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs uppercase font-extrabold text-blue-900 tracking-wider border-b border-zinc-200 pb-1">
                        Education
                      </h3>
                      <div className="space-y-2">
                        {education.map((edu, i) => (
                          <div key={i} className="text-xs font-sans">
                            <p className="font-bold text-zinc-800">
                              {edu.studyType} {edu.area && `in ${edu.area}`}
                              {edu.score && <span className="font-normal text-zinc-500"> ({edu.score})</span>}
                            </p>
                            <p className="text-[11px] text-zinc-500">{edu.institution} • {edu.endDate}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {certificates.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs uppercase font-extrabold text-blue-900 tracking-wider border-b border-zinc-200 pb-1">
                        Certifications
                      </h3>
                      <div className="space-y-2">
                        {certificates.map((cert, i) => (
                          <div key={i} className="text-xs font-sans">
                            <p className="font-bold text-zinc-800">{cert.name}</p>
                            <p className="text-[11px] text-zinc-500">{cert.issuer} {cert.date && `• ${cert.date}`}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
