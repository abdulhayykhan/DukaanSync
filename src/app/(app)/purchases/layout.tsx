import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Purchases & Orders",
};

export default function PurchasesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
