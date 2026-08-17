"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, MonitorSmartphone, Package, Users, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBusiness } from "@/contexts/BusinessContext";

const MOBILE_NAV_ITEMS = [
  { name: "Dash", href: "/dashboard", icon: LayoutDashboard, roles: ["owner", "manager", "inventory_manager"] },
  { name: "POS", href: "/pos", icon: MonitorSmartphone, roles: ["owner", "manager", "cashier"] },
  { name: "Inv", href: "/inventory", icon: Package, roles: ["owner", "manager", "inventory_manager"] },
  { name: "Cust", href: "/customers", icon: Users, roles: ["owner", "manager", "cashier"] },
];

interface BottomNavProps {
  onMenuClick: () => void;
}

export function BottomNav({ onMenuClick }: BottomNavProps) {
  const pathname = usePathname();
  const { memberRole } = useBusiness();

  const filteredNav = MOBILE_NAV_ITEMS.filter(
    (item) => memberRole && item.roles.includes(memberRole)
  );

  return (
    <nav className="md:hidden fixed bottom-4 left-4 right-4 h-16 glass-card rounded-2xl z-50 flex justify-around items-center px-2 pb-safe shadow-2xl">
      {filteredNav.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "relative flex flex-col items-center justify-center w-full h-full gap-1 z-10 transition-colors",
              isActive ? "text-[#10B981]" : "text-gray-500 hover:text-gray-900:text-white"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="activeBottomNavPill"
                className="absolute inset-x-2 inset-y-1 rounded-xl glass-pill -z-10"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Icon className={cn("h-5 w-5 transition-transform", isActive ? "scale-110" : "scale-100")} />
            <span className="text-[10px] font-medium leading-none">{item.name}</span>
          </Link>
        );
      })}
      
      {/* Menu button to open a mobile sidebar/drawer later if needed */}
      <button
        onClick={onMenuClick}
        className="flex flex-col items-center justify-center w-full h-full gap-1 text-gray-500 hover:text-gray-900 focus:outline-none"
      >
        <Menu className="h-5 w-5" />
        <span className="text-[10px] font-medium leading-none">More</span>
      </button>
    </nav>
  );
}
