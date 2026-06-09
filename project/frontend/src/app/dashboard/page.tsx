"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#05050a] text-zinc-400">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
      <span className="text-xs uppercase font-bold tracking-widest">Redirecting...</span>
    </div>
  );
}
