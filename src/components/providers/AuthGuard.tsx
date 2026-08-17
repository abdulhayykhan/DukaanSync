"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";

import { LoadingScreen } from "@/components/ui/LoadingScreen";

// Paths that unauthenticated users can access
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/"];
// Paths specifically for onboarding
const ONBOARDING_PATH = "/onboarding";
// Marketing paths (accessible to everyone, logged in or not)
const MARKETING_PATHS = ["/home", "/privacy", "/terms", "/refund-policy"];

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
    const isMarketingPath = MARKETING_PATHS.includes(pathname);

    // Never redirect if on a marketing path
    if (isMarketingPath) return;

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
    return <LoadingScreen authLoading={authLoading} businessLoading={businessLoading} />;
  }

  // Prevent flashing protected content before redirect takes effect if we know it shouldn't render
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isOnboardingPath = pathname === ONBOARDING_PATH;
  const isMarketingPath = MARKETING_PATHS.includes(pathname);

  // Marketing paths always render
  if (isMarketingPath) return <>{children}</>;

  if (!user && !isPublicPath) return null;
  if (user && !business && !isOnboardingPath) return null;
  if (user && business && (isPublicPath || isOnboardingPath)) return null;

  return <>{children}</>;
}
