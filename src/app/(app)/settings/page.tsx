"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store, Building2, Users, ArrowRight, ShieldAlert } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
  const { memberRole } = useBusiness();
  const router = useRouter();

  // 1. Role Guarding: Cashiers cannot access settings
  if (memberRole === "cashier") {
    return (
      <div className="p-8 text-center max-w-lg mx-auto mt-12 glass-card rounded-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <ShieldAlert className="mx-auto h-16 w-16 text-red-500 mb-6 animate-pulse" />
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Access Restricted</h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Your account role does not have permission to view or manage business configurations. Please contact your store manager or owner.
        </p>
        <Button onClick={() => router.push("/dashboard")} className="w-full sm:w-auto">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const settingsCards = [
    {
      title: "Shop Management",
      description: "Manage your physical branches, active status, and set your main operating store.",
      icon: <Store className="h-8 w-8 text-blue-500" />,
      href: "/settings/shops",
      color: "bg-blue-50",
      borderColor: "border-blue-100",
    },
    {
      title: "Business Profile",
      description: "Update your business name, tax identification, and default currency settings.",
      icon: <Building2 className="h-8 w-8 text-purple-500" />,
      href: "/settings/business",
      color: "bg-purple-50",
      borderColor: "border-purple-100",
    },
    {
      title: "User Permissions",
      description: "Invite team members, assign roles, and manage access to your business data.",
      icon: <Users className="h-8 w-8 text-emerald-500" />,
      href: "/settings/users",
      color: "bg-emerald-50",
      borderColor: "border-emerald-100",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-gray-500 mt-2 text-lg">Manage your business configuration, branches, and team.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsCards.map((card) => (
          <Link href={card.href} key={card.title}>
            <div className={`group relative h-full p-8 rounded-2xl border ${card.borderColor} bg-white/60 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden hover:-translate-y-1`}>
              
              {/* Decorative background blob */}
              <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full ${card.color} opacity-50 blur-3xl group-hover:scale-150 transition-transform duration-500`} />
              
              <div className={`inline-flex p-4 rounded-xl ${card.color} mb-6 relative z-10`}>
                {card.icon}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-3 relative z-10">{card.title}</h3>
              <p className="text-gray-600 mb-8 relative z-10 leading-relaxed line-clamp-2">
                {card.description}
              </p>
              
              <div className="flex items-center text-sm font-semibold text-gray-900 mt-auto relative z-10">
                Configure
                <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
