import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Profile Settings",
};

export default function BusinessSettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
