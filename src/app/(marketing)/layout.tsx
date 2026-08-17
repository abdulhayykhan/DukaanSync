"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { Store, ArrowRight, ShieldCheck, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/home" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-lg flex items-center justify-center shadow-sm group-hover:shadow transition-all">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900 tracking-tight">
                Dukaan<span className="text-[#10B981]">Sync</span>
              </span>
            </Link>

            <div className="flex items-center gap-4">
              {user ? (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-sm font-medium text-white bg-[#10B981] hover:bg-[#059669] px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 opacity-50">
              <Store className="w-5 h-5 text-gray-900" />
              <span className="font-bold text-lg text-gray-900 tracking-tight">
                DukaanSync
              </span>
            </div>
            
            <nav className="flex flex-wrap justify-center gap-x-8 gap-y-4">
              <Link href="/home" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                Home
              </Link>
              <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Terms of Service
              </Link>
              <Link href="/refund-policy" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                Refund Policy
              </Link>
            </nav>
          </div>
          <div className="mt-8 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} DukaanSync. Built for Pakistani Retail.
          </div>
        </div>
      </footer>
    </div>
  );
}
