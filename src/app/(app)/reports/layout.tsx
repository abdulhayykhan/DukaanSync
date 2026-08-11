import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports & Analytics",
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
