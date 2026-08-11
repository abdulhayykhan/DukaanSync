"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { AmbientBackground } from "@/components/ui/AmbientBackground";

export default function RootPage() {
  const { user, loading: authLoading } = useAuth();
  const { business, loading: businessLoading } = useBusiness();
  const router = useRouter();

  const isLoading = authLoading || businessLoading;

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login");
    } else if (!business) {
      router.replace("/onboarding");
    } else {
      router.replace("/dashboard");
    }
  }, [user, business, isLoading, router]);

  return (
    <div className="fixed inset-0 glass-card bg-white/40 backdrop-blur-xl flex flex-col items-center justify-center z-50">
      <AmbientBackground />
      <div className="flex items-center gap-3 animate-pulse mb-8 z-10">
        <div className="bg-[#10B981] p-3.5 rounded-2xl shadow-xl shadow-emerald-500/20 border border-white/20">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <span className="text-3xl font-bold text-gray-900 tracking-tight">
          DukaanSync
        </span>
      </div>
      <div className="h-2 w-48 bg-gray-200/60 rounded-full overflow-hidden backdrop-blur-sm z-10 border border-white/10">
        <div
          className="h-full bg-[#10B981] animate-[slide_1.5s_ease-in-out_infinite]"
          style={{ width: "50%", transformOrigin: "left" }}
        />
      </div>
    </div>
  );
}
