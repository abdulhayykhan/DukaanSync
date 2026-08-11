import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team Members",
};

export default function UsersSettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
