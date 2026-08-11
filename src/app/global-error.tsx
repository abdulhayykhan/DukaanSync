"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Boundary caught error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full glass-card bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl text-center relative overflow-hidden">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-amber-100">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-3">Application Error</h1>
          <p className="text-sm text-slate-500 leading-relaxed mb-8">
            An unhandled system exception occurred. Please try reloading the application.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => reset()}
              className="w-full gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 h-11 text-sm font-semibold text-white"
            >
              <RefreshCw className="w-4 h-4" /> Reload Application
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
