"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  MonitorSmartphone,
  Package,
  ArrowRightLeft,
  ShoppingCart,
  Users,
  Truck,
  Receipt,
  PieChart,
  Settings,
  Store,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBusiness } from "@/contexts/BusinessContext";
import { useState } from "react";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["owner", "manager", "cashier", "inventory_manager"] },
  { name: "POS Terminal", href: "/pos", icon: MonitorSmartphone, roles: ["owner", "manager", "cashier"] },
  { name: "Inventory", href: "/inventory", icon: Package, roles: ["owner", "manager", "inventory_manager"] },
  { name: "Stock Movements", href: "/inventory/movements", icon: ArrowRightLeft, roles: ["owner", "manager", "inventory_manager"] },
  { name: "Purchases", href: "/purchases", icon: ShoppingCart, roles: ["owner", "manager"] },
  { name: "Customers", href: "/customers", icon: Users, roles: ["owner", "manager", "cashier"] },
  { name: "Suppliers", href: "/suppliers", icon: Truck, roles: ["owner", "manager"] },
  { name: "Expenses", href: "/expenses", icon: Receipt, roles: ["owner", "manager"] },
  { name: "Financial Reports", href: "/reports", icon: PieChart, roles: ["owner", "manager"] },
  { name: "Settings", href: "/settings", icon: Settings, roles: ["owner", "manager"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { memberRole } = useBusiness();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filter routes based on role (fallback to empty if memberRole is null)
  const filteredNav = NAV_ITEMS.filter(
    (item) => memberRole && item.roles.includes(memberRole)
  );

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col glass-card border-r-0 rounded-r-2xl my-4 ml-4 transition-all duration-300 z-20 shadow-xl",
        isCollapsed ? "w-[64px]" : "w-[240px]"
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200/20">
        <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
          <div className="bg-[#10B981] p-1.5 rounded-md shrink-0 shadow-lg shadow-emerald-500/20">
            <Store className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <span className="text-xl font-bold text-gray-900 tracking-tight whitespace-nowrap">
              DukaanSync
            </span>
          )}
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              className={cn(
                "relative flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-colors z-10 group",
                isActive
                  ? "text-[#10B981]"
                  : "text-gray-700 hover:text-gray-900:text-white"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeSidebarPill"
                  className="absolute inset-0 rounded-md glass-pill -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className={cn("h-5 w-5 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-[#10B981]" : "text-gray-500")} />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-4 border-t border-gray-200/20 flex justify-end">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
    </aside>
  );
}
