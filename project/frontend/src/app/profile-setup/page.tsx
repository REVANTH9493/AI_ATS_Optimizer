"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  User, Mail, Phone, LogOut, CheckCircle2, 
  ArrowRight, Loader2, Sparkles, Compass, Key, Lock, X, FileText, AlertCircle, Cpu, Briefcase
} from "lucide-react";

export default function ProfileSetupPage() {
  const router = useRouter();
  
  // User info from session
  const [userProfile, setUserProfile] = useState<{ email: string; name: string; avatar?: string; provider?: string; resume_url?: string } | null>(null);
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
  
  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  
  // UI states
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load user from localStorage and verify latest profile from backend
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    
    if (!token || !storedUser) {
      router.push("/login");
      return;
    }

    const fetchLatestProfile = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/auth/me", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await response.json();
        
        if (response.ok) {
          // Update cache
          localStorage.setItem("user", JSON.stringify(data));
          
          if (data.resume_url) {
            router.replace("/");
            return;
          }
          
          setName(data.name || "");
          setEmail(data.email || "");
          setPhone(data.phone || "");
          setUserProfile(data);
        } else {
          // Fallback to local
          const parsedUser = JSON.parse(storedUser);
          setUserProfile(parsedUser);
          setName(parsedUser.name || "");
          setEmail(parsedUser.email || "");
          setPhone(parsedUser.phone || "");
        }
      } catch (err) {
        // Fallback to local
        const parsedUser = JSON.parse(storedUser);
        setUserProfile(parsedUser);
        setName(parsedUser.name || "");
        setEmail(parsedUser.email || "");
        setPhone(parsedUser.phone || "");
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchLatestProfile();
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

  // Form submit (saving profile details to backend)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          phone
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to update profile.");
      }

      setSaveSuccess(true);
      
      // Update user cache in localStorage
      localStorage.setItem("user", JSON.stringify(data.user));

      setTimeout(() => {
        router.push("/resume-upload");
      }, 1500);

    } catch (err: any) {
      alert(err.message || "An error occurred while saving your profile.");
    } finally {
      setSaving(false);
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
    <div className="min-h-screen bg-[#05050a] text-white py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-between">
      {/* Background Gradients */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-xl mx-auto w-full relative z-10 my-auto">
        
        {/* Navigation / Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/10 border border-indigo-500/20">
              <Compass className="h-6 w-6 text-indigo-400" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-gradient">
              AI ATS Optimizer
            </span>
          </div>

          <div className="flex items-center gap-4">
            {userProfile?.resume_url && (
              <button
                onClick={() => router.push("/")}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] transition-all text-xs font-semibold text-zinc-300"
              >
                <Cpu className="h-4 w-4 text-indigo-400" />
                <span>ATS Optimizer</span>
              </button>
            )}

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
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-red-950/20 hover:text-red-400 border border-white/5 hover:border-red-500/20 active:scale-95 transition-all text-zinc-400"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Form Panel */}
        <div className="glass-panel rounded-3xl p-8 border border-white/10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-purple-500/20"></div>

          <div className="mb-6">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <span>Quick Profile Setup</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Verify your contact details before uploading your resume. We will parse the rest automatically.
            </p>
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 p-4 rounded-2xl mb-6 text-sm animate-fade-in">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>Details saved! Redirecting to resume upload...</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  disabled
                  value={email}
                  placeholder="name@example.com"
                  className="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm opacity-60 cursor-not-allowed bg-zinc-950/20"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Phone / Mobile Number</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                  <Phone className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="btn-shimmer w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3.5 px-6 rounded-xl text-sm shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-white/10 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>Proceed to Resume Upload</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

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
