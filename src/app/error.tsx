"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled Runtime Exception captured:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full glass-card bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl text-center relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-amber-500/10 blur-2xl rounded-full" />
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-amber-100">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-3">Something Went Wrong</h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-8">
          An unexpected error occurred while loading this view. You can retry loading or return safely to the dashboard.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => reset()}
            className="w-full gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 h-11 text-sm font-semibold text-white"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </Button>
          <Link href="/dashboard">
            <Button
              variant="outline"
              className="w-full gap-2 rounded-xl border-slate-200 hover:border-slate-300 h-11 text-sm font-semibold"
            >
              <Home className="w-4 h-4" /> Back to Safety
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
