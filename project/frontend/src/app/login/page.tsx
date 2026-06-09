"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, Loader2, Compass } from "lucide-react";
import { API_URL } from "@/config";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Tab state: "login" or "signup"
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  
  // Form values
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showMockModal, setShowMockModal] = useState(false);

  // Read query params for error or sandbox modes
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setErrorMessage(decodeURIComponent(errorParam));
    }

    const mockGoogleParam = searchParams.get("mock_google");
    if (mockGoogleParam === "true") {
      setShowMockModal(true);
    }

    const tabParam = searchParams.get("tab");
    if (tabParam === "login" || tabParam === "signup") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Form Validation
  const validateForm = () => {
    setErrorMessage("");
    
    if (!email || !password) {
      setErrorMessage("Please fill in all required fields.");
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage("Please enter a valid email address.");
      return false;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return false;
    }

    if (activeTab === "signup") {
      if (!name) {
        setErrorMessage("Please enter your name.");
        return false;
      }
      if (password !== confirmPassword) {
        setErrorMessage("Passwords do not match.");
        return false;
      }
    }
    
    return true;
  };

  // Submit Handler for Email/Password Register and Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    
    const url = activeTab === "login" 
      ? `${API_URL}/api/auth/login` 
      : `${API_URL}/api/auth/register`;
      
    const payload = activeTab === "login"
      ? { email, password }
      : { email, password, name };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed. Please try again.");
      }

      // Success
      setSuccessMessage(activeTab === "login" ? "Login successful!" : "Account created successfully!");
      
      // Store tokens
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setTimeout(() => {
        if (data.user && data.user.resume_url) {
          router.push("/");
        } else {
          router.push("/profile-setup");
        }
      }, 1000);
      
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Google Login Handler
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setErrorMessage("");
    
    try {
      // Get the Google Auth URL from our FastAPI backend
      const response = await fetch(`${API_URL}/api/auth/google/url`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || "Failed to fetch Google authentication url.");
      }
      
      // Redirect browser to Google or frontend mock
      window.location.href = data.url;
      
    } catch (err: any) {
      setErrorMessage(err.message || "Could not initialize Google login.");
      setGoogleLoading(false);
    }
  };

  // Confirm Mock Login
  const handleConfirmMock = () => {
    setShowMockModal(false);
    window.location.href = `${API_URL}/api/auth/google/callback?mock=true`;
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }}></div>
      <div className="absolute top-1/2 left-2/3 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "4s" }}></div>

      {/* Main Container */}
      <div className="relative w-full max-w-md z-10">
        
        {/* Logo / Header */}
        <div className="text-center mb-8 animate-float">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 mb-3 shadow-lg shadow-indigo-500/5">
            <Compass className="h-8 w-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gradient">
            AI ATS Optimizer
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            Align your credentials, optimize bullet points, and check compatibility scores
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
          
          {/* Card subtle top highlight */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/30 to-purple-500/30"></div>
          
          {/* Tabs */}
          <div className="flex bg-zinc-950/40 p-1.5 rounded-2xl border border-white/5 mb-8">
            <button
              onClick={() => { setActiveTab("login"); setErrorMessage(""); }}
              className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                activeTab === "login"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab("signup"); setErrorMessage(""); }}
              className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                activeTab === "signup"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="flex items-center gap-3 bg-red-950/30 border border-red-500/20 text-red-300 p-4 rounded-2xl mb-6 text-sm animate-shake">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 p-4 rounded-2xl mb-6 text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Forms */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {activeTab === "signup" && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                    <User className="h-5 w-5" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="glass-input w-full pl-12 pr-4 py-3.5 rounded-2xl text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input w-full pl-12 pr-4 py-3.5 rounded-2xl text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center pl-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Password
                </label>
                {activeTab === "login" && (
                  <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    Forgot?
                  </a>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input w-full pl-12 pr-4 py-3.5 rounded-2xl text-sm"
                />
              </div>
            </div>

            {activeTab === "signup" && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                    <Lock className="h-5 w-5" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="glass-input w-full pl-12 pr-4 py-3.5 rounded-2xl text-sm"
                  />
                </div>
              </div>
            )}

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="btn-shimmer w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-4 px-4 rounded-2xl shadow-xl shadow-indigo-600/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-sm border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span>{activeTab === "login" ? "Sign In" : "Create Account"}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0b0a14] px-4 text-zinc-500 font-semibold tracking-widest">
                Or Continue With
              </span>
            </div>
          </div>

          {/* Google Auth Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="w-full bg-white/[0.03] hover:bg-white/[0.06] text-white border border-white/10 font-semibold py-4 px-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.1-.3-.19-.63-.19-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>Google</span>
              </>
            )}
          </button>
        </div>

        {/* Terms footer */}
        <p className="text-center text-xs text-zinc-500 mt-6">
          By signing up, you agree to our{" "}
          <a href="#" className="underline hover:text-zinc-400 transition-colors">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="underline hover:text-zinc-400 transition-colors">
            Privacy Policy
          </a>.
        </p>
      </div>

      {/* Mock OAuth Sandbox Modal */}
      {showMockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 border border-white/10 shadow-2xl relative overflow-hidden text-center">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500/20 to-orange-500/20"></div>
            
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4">
              <AlertCircle className="h-6 w-6" />
            </div>
            
            <h3 className="text-lg font-bold text-white mb-2">
              Google Auth Sandbox
            </h3>
            
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Google sign-in is currently in demonstration mode.
              Would you like to proceed with a simulated Google account for previewing the application?
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => { setShowMockModal(false); router.push("/login"); }}
                className="flex-1 py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold border border-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMock}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-[0.98]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#05050a] text-white">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
