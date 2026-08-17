import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-12">
      {children}
    </div>
  );
}
