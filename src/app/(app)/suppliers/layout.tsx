import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Suppliers & Payables",
};

export default function SuppliersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
