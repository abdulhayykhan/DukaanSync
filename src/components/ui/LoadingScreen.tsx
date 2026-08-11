"use client";

import { useEffect, useState } from "react";

interface LoadingScreenProps {
  authLoading?: boolean;
  businessLoading?: boolean;
  shopLoading?: boolean;
  statusText?: string;
  isFadingOut?: boolean;
}

export function LoadingScreen({
  authLoading,
  businessLoading,
  shopLoading,
  statusText,
  isFadingOut = false,
}: LoadingScreenProps) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progress, setProgress] = useState(20);

  const stages = [
    "Authenticating session...",
    "Loading business & shop context...",
    "Synchronizing workspace...",
  ];

  useEffect(() => {
    if (authLoading) {
      setCurrentStageIndex(0);
      setProgress(30);
    } else if (businessLoading) {
      setCurrentStageIndex(1);
      setProgress(65);
    } else if (shopLoading) {
      setCurrentStageIndex(2);
      setProgress(90);
    } else {
      const interval = setInterval(() => {
        setCurrentStageIndex((prev) => {
          const next = prev < stages.length - 1 ? prev + 1 : prev;
          setProgress((next + 1) * 32);
          return next;
        });
      }, 600);

      return () => clearInterval(interval);
    }
  }, [authLoading, businessLoading, shopLoading]);

  const activeStatusText =
    statusText || stages[currentStageIndex] || "Synchronizing workspace...";

  return (
    <div
      className={`fixed inset-0 bg-white flex flex-col items-center justify-center z-50 transition-opacity duration-300 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex items-center gap-3 animate-pulse mb-6 z-10">
        <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-600/20 border border-emerald-500/20">
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
        <span className="text-3xl font-bold text-slate-900 tracking-tight">
          DukaanSync
        </span>
      </div>

      {/* Progress Bar pill track */}
      <div className="h-1.5 w-48 rounded-full bg-slate-100 overflow-hidden relative mb-4">
        <div
          className="h-full bg-emerald-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Dynamic Loading Status Text */}
      <p className="text-xs font-medium text-slate-500 animate-pulse text-center px-4">
        {activeStatusText}
      </p>
    </div>
  );
}
