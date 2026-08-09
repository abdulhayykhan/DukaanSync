"use client";

import { ReactNode, useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Toaster } from "sonner";
import { AmbientBackground } from "@/components/ui/AmbientBackground";

export function AppShell({ children }: { children: ReactNode }) {
  // Mobile menu state (for future mobile drawer implementation)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden text-gray-900 dark:text-gray-100">
      <AmbientBackground />
      
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-white focus:text-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
      >
        Skip to content
      </a>

      {/* Desktop Sidebar (hidden on mobile) */}
      <Sidebar />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header />

        {/* Main Content Area */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto overflow-x-hidden relative focus:outline-none pb-20 md:pb-0 z-0"
          tabIndex={-1}
        >
          {children}
        </main>

        {/* Mobile Bottom Navigation (hidden on md and up) */}
        <BottomNav onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
      </div>

      {/* Global Toast Provider */}
      <Toaster 
        position="top-right" 
        richColors 
        closeButton
        toastOptions={{
          style: { borderRadius: '10px' },
          className: 'font-sans'
        }}
      />
    </div>
  );
}
