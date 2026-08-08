// =============================================================================
// DukaanSync — AppProviders
// =============================================================================
// Nests all context providers in the correct dependency order.
// Wrap the root layout's {children} with this component.
// =============================================================================

"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { ShopProvider } from "@/contexts/ShopContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <BusinessProvider>
        <ShopProvider>{children}</ShopProvider>
      </BusinessProvider>
    </AuthProvider>
  );
}
