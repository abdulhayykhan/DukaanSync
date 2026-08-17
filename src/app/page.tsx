"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function RootPage() {
  const { user, loading: authLoading } = useAuth();
  const { business, loading: businessLoading } = useBusiness();
  const router = useRouter();

  const isLoading = authLoading || businessLoading;

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/home");
    } else if (!business) {
      router.replace("/onboarding");
    } else {
      router.replace("/dashboard");
    }
  }, [user, business, isLoading, router]);

  return <LoadingScreen authLoading={authLoading} businessLoading={businessLoading} />;
}
