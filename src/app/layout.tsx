import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DukaanSync — Multi-Shop Management & Point of Sale System",
    template: "%s | DukaanSync",
  },
  description:
    "One account. One login. One business. Multiple shops. Strict data isolation. A multi-tenant retail management & POS SaaS platform.",
  keywords: [
    "POS",
    "Point of Sale",
    "Retail Management",
    "Multi-Shop",
    "Inventory",
    "DukaanSync",
    "SaaS",
  ],
};

import { AuthGuard } from "@/components/providers/AuthGuard";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>
          <AuthGuard>{children}</AuthGuard>
        </AppProviders>
      </body>
    </html>
  );
}
