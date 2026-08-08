"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";

// Paths that unauthenticated users can access
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/"];
// Paths specifically for onboarding
const ONBOARDING_PATH = "/onboarding";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { business, loading: businessLoading } = useBusiness();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait until contexts finish their initial loads
    if (authLoading || businessLoading) return;

    const isPublicPath = PUBLIC_PATHS.includes(pathname);
    const isOnboardingPath = pathname === ONBOARDING_PATH;

    if (!user) {
      // 1. Not logged in + trying to access private page -> Redirect to login
      if (!isPublicPath) {
        router.push("/login");
      }
    } else {
      // Logged in
      if (business) {
        // 2a. Logged in + HAS business + trying to access auth/onboarding -> Redirect to dashboard
        if (isPublicPath || isOnboardingPath) {
          router.push("/dashboard");
        }
      } else {
        // 2b. Logged in + NO business + trying to access anything other than onboarding -> Redirect to onboarding
        if (!isOnboardingPath) {
          router.push(ONBOARDING_PATH);
        }
      }
    }
  }, [user, authLoading, business, businessLoading, pathname, router]);

  // Determine if we should render loading state
  const isLoading = authLoading || businessLoading;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
        <div className="flex items-center gap-3 animate-pulse mb-8">
          <div className="bg-[#10B981] p-3 rounded-xl">
             <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <span className="text-3xl font-bold text-gray-900 tracking-tight">DukaanSync</span>
        </div>
        <div className="h-2 w-48 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-[#10B981] animate-[slide_1.5s_ease-in-out_infinite]" style={{ width: '50%', transformOrigin: 'left' }} />
        </div>
      </div>
    );
  }

  // Prevent flashing protected content before redirect takes effect if we know it shouldn't render
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isOnboardingPath = pathname === ONBOARDING_PATH;

  if (!user && !isPublicPath) return null;
  if (user && !business && !isOnboardingPath) return null;
  if (user && business && (isPublicPath || isOnboardingPath)) return null;

  return <>{children}</>;
}
