import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Purchase Order",
};

export default function NewPurchaseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
