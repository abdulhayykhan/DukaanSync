// =============================================================================
// DukaanSync — BusinessContext
// =============================================================================
// Depends on AuthContext. Fetches the Business document and the current user's
// BusinessMember record to determine their role within the tenant.
// =============================================================================

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "./AuthContext";
import type { Business, BusinessMember, UserRole } from "@/types";

// -----------------------------------------------------------------------------
// Context shape
// -----------------------------------------------------------------------------

interface BusinessContextValue {
  /** The active Business (tenant) document */
  business: Business | null;
  /** The current user's membership record within the business */
  member: BusinessMember | null;
  /** Shortcut: the user's role within this business */
  memberRole: UserRole | null;
  /** True while business or member data is loading */
  loading: boolean;
  /** Re-fetch business and member data from Firestore */
  refreshBusiness: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextValue | undefined>(
  undefined
);

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { userProfile, loading: authLoading } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [member, setMember] = useState<BusinessMember | null>(null);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------------------------------
  // Fetch business + member
  // ---------------------------------------------------------------------------
  const fetchBusiness = useCallback(async () => {
    if (!db || !userProfile?.businessId) {
      setBusiness(null);
      setMember(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const businessId = userProfile.businessId;

    try {
      // Fetch business document
      const businessRef = doc(db, "businesses", businessId);
      const businessSnap = await getDoc(businessRef);

      if (businessSnap.exists()) {
        setBusiness({
          id: businessSnap.id,
          ...businessSnap.data(),
        } as Business);
      } else {
        console.warn(
          `[BusinessContext] Business "${businessId}" not found in Firestore.`
        );
        setBusiness(null);
      }

      // Fetch member record (subcollection: businesses/{businessId}/members/{uid})
      const memberRef = doc(
        db,
        "businesses",
        businessId,
        "members",
        userProfile.uid
      );
      const memberSnap = await getDoc(memberRef);

      if (memberSnap.exists()) {
        setMember({
          uid: memberSnap.id,
          ...memberSnap.data(),
        } as BusinessMember);
      } else {
        console.warn(
          `[BusinessContext] Member record not found for uid "${userProfile.uid}" in business "${businessId}".`
        );
        setMember(null);
      }
    } catch (err) {
      console.error("[BusinessContext] Failed to fetch business data:", err);
      setBusiness(null);
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  // ---------------------------------------------------------------------------
  // Reactive fetch on profile change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (authLoading) return;

    if (userProfile?.businessId) {
      fetchBusiness();
    } else {
      setBusiness(null);
      setMember(null);
      setLoading(false);
    }
  }, [userProfile, authLoading, fetchBusiness]);

  // ---------------------------------------------------------------------------
  // Memoised value
  // ---------------------------------------------------------------------------
  const value = useMemo<BusinessContextValue>(
    () => ({
      business,
      member,
      memberRole: member?.role ?? null,
      loading: authLoading || loading,
      refreshBusiness: fetchBusiness,
    }),
    [business, member, authLoading, loading, fetchBusiness]
  );

  return (
    <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export function useBusiness(): BusinessContextValue {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
}
