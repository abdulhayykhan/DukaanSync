"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Shield, Building2, Users, Receipt } from "lucide-react";
import { toast } from "sonner";

const ADMIN_TABS = [
  { name: "Overview", href: "/admin", icon: Shield },
  { name: "Businesses & Plans", href: "/admin/businesses", icon: Building2 },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Billing Approvals", href: "/admin/billing", icon: Receipt },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const isSeedAdmin = 
      user.email === "seed.admin@metromart.com" || 
      user.uid === "QhlEJoMLs0geF2lZB8k9wokL0PJ3" ||
      (process.env.NEXT_PUBLIC_SEED_ADMIN_UIDS || "").includes(user.uid);
      
    if (!isSeedAdmin) {
      toast.error("Unauthorized access.");
      router.replace("/dashboard");
    } else {
      setAuthorized(true);
    }
  }, [user, router]);

  if (!authorized) {
    return <div className="p-8 text-center text-gray-500">Authorizing...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen max-w-6xl mx-auto w-full p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Admin Hub</h1>
          <p className="text-gray-500 mt-1">Manage global settings, tenants, and users.</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {ADMIN_TABS.map((tab) => {
            // Precise active matching for root vs sub-paths
            const isActive = tab.href === "/admin" 
              ? pathname === "/admin" 
              : pathname.startsWith(tab.href);
              
            const Icon = tab.icon;

            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  "group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors relative",
                  isActive
                    ? "border-[#10B981] text-[#10B981]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5",
                  isActive ? "text-[#10B981]" : "text-gray-400 group-hover:text-gray-500"
                )} />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
        {children}
      </div>
    </div>
  );
}
