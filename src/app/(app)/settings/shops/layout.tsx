import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shops & Branches",
};

export default function ShopsSettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
