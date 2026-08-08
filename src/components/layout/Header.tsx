"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { useShop } from "@/contexts/ShopContext";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LogOut, Check, Store } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const { userProfile, logout } = useAuth();
  const { business, memberRole } = useBusiness();
  const { activeShop, availableShops, setActiveShop } = useShop();

  return (
    <header className="h-16 glass-card border-b-0 m-4 rounded-2xl flex items-center justify-between px-4 lg:px-8 z-10 shadow-xl">
      {/* Left side: Business Name & Shop Context (Mobile hides business name) */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:block">
          <span className="text-lg font-semibold text-gray-900">{business?.name}</span>
          <span className="text-gray-300 mx-2">|</span>
        </div>

        {/* Shop Switcher */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#10B981]">
              <Store className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {activeShop ? activeShop.name : "Select Shop"}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              className="min-w-[220px] glass-card rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100"
            >
              <DropdownMenu.Label className="px-2 py-1.5 text-xs font-semibold text-gray-500">
                Switch Shop
              </DropdownMenu.Label>
              {availableShops.map((shop) => (
                <DropdownMenu.Item
                  key={shop.id}
                  onClick={() => setActiveShop(shop.id)}
                  className="relative flex items-center px-2 py-2 text-sm text-gray-700 rounded-sm cursor-default hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 outline-none"
                >
                  <div className="flex-1 flex flex-col">
                    <span className="font-medium">{shop.name}</span>
                    <span className="text-xs text-gray-500">{shop.code}</span>
                  </div>
                  {shop.isMain && (
                    <span className="ml-2 text-[10px] uppercase font-bold tracking-wider text-[#3B82F6] bg-blue-50 px-1.5 py-0.5 rounded">
                      Main
                    </span>
                  )}
                  {activeShop?.id === shop.id && (
                    <Check className="ml-3 h-4 w-4 text-[#10B981]" />
                  )}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Right side: User Profile */}
      <div className="flex items-center gap-3">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 hover:bg-gray-50 p-1.5 sm:px-3 rounded-full sm:rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#10B981]">
              <div className="h-8 w-8 rounded-full bg-[#10B981] flex items-center justify-center text-white font-semibold text-sm">
                {userProfile?.displayName?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="hidden sm:flex flex-col items-start text-left">
                <span className="text-sm font-medium text-gray-700 leading-none">
                  {userProfile?.displayName}
                </span>
                <span className="text-xs text-gray-500 mt-1 capitalize leading-none">
                  {memberRole}
                </span>
              </div>
              <ChevronDown className="hidden sm:block h-4 w-4 text-gray-400" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              className="min-w-[200px] glass-card rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-2 py-2 border-b border-gray-100 mb-1 sm:hidden">
                <p className="text-sm font-medium text-gray-900">{userProfile?.displayName}</p>
                <p className="text-xs text-gray-500 capitalize">{memberRole}</p>
              </div>
              
              <DropdownMenu.Item
                onClick={logout}
                className="flex items-center px-2 py-2 text-sm text-red-600 rounded-sm cursor-default hover:bg-red-50 focus:bg-red-50 outline-none group"
              >
                <LogOut className="mr-2 h-4 w-4 group-hover:text-red-700" />
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
