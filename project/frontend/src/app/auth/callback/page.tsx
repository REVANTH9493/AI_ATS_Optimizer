"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const email = searchParams.get("email");
    const name = searchParams.get("name");
    const avatar = searchParams.get("avatar") || "";
    const resume_url = searchParams.get("resume_url") || "";

    if (token) {
      // Save details to localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify({
        email: email || "unknown",
        name: name || "User",
        avatar,
        provider: "google",
        resume_url
      }));

      // Small delay for smooth UX transition
      const timer = setTimeout(() => {
        if (resume_url) {
          router.push("/");
        } else {
          router.push("/profile-setup");
        }
      }, 1500);

      return () => clearTimeout(timer);
    } else {
      const error = searchParams.get("error") || "Authentication failed";
      router.push(`/login?error=${encodeURIComponent(error)}`);
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#05050a] text-white px-4">
      {/* Decorative Blurs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl animate-pulse-slow"></div>
      
      <div className="relative z-10 text-center space-y-6 max-w-sm">
        <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 animate-spin-slow">
          <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Verifying account...
          </h2>
          <p className="text-sm text-zinc-400">
            Setting up your secure workspace. This will take a second.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#05050a] text-white px-4">
        <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-zinc-900 border border-white/5 animate-spin">
          <Loader2 className="h-8 w-8 text-zinc-500" />
        </div>
      </div>
    }>
      <AuthCallbackHandler />
    </Suspense>
  );
}
