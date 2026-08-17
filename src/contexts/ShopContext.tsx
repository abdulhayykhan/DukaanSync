// =============================================================================
// DukaanSync — ShopContext
// =============================================================================
// Depends on BusinessContext. Fetches all shops the current user is authorized
// to access (owner sees all, other roles see only their assigned shopIds).
// Manages activeShopId as a UI state abstraction — database rules independently
// authorize every operation.
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
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useBusiness } from "./BusinessContext";
import type { Shop } from "@/types";

// Key for persisting activeShopId in localStorage
const ACTIVE_SHOP_STORAGE_KEY = "dukaansync_active_shop_id";

// -----------------------------------------------------------------------------
// Context shape
// -----------------------------------------------------------------------------

interface ShopContextValue {
  /** Currently selected shop ID */
  activeShopId: string | null;
  /** Full Shop object for the active shop */
  activeShop: Shop | null;
  /** All shops accessible by the current user */
  availableShops: Shop[];
  /** Alias for availableShops */
  shops: Shop[];
  /** True while shops are loading */
  loading: boolean;
  /** Switch the active shop */
  setActiveShop: (shopId: string) => void;
  /** Re-fetch shops from Firestore */
  refreshShops: () => Promise<void>;
}

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Read persisted shop ID from localStorage (SSR-safe) */
function getPersistedShopId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_SHOP_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Persist shop ID to localStorage (SSR-safe) */
function persistShopId(shopId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_SHOP_STORAGE_KEY, shopId);
  } catch {
    // Storage full or disabled — silently ignore
  }
}

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------

export function ShopProvider({ children }: { children: ReactNode }) {
  const { business, member, loading: businessLoading } = useBusiness();

  const [availableShops, setAvailableShops] = useState<Shop[]>([]);
  const [activeShopId, setActiveShopIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------------------------------
  // Resolve which shop should be active
  // ---------------------------------------------------------------------------
  const resolveActiveShop = useCallback((shops: Shop[]) => {
    if (shops.length === 0) {
      setActiveShopIdState(null);
      return;
    }

    // 1. Try persisted shop ID (if still in available list)
    const persisted = getPersistedShopId();
    if (persisted && shops.some((s) => s.id === persisted)) {
      setActiveShopIdState(persisted);
      return;
    }

    // 2. Default to the main shop
    const mainShop = shops.find((s) => s.isMain);
    if (mainShop) {
      setActiveShopIdState(mainShop.id);
      persistShopId(mainShop.id);
      return;
    }

    // 3. Fallback to the first shop
    setActiveShopIdState(shops[0].id);
    persistShopId(shops[0].id);
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch shops
  // ---------------------------------------------------------------------------
  const fetchShops = useCallback(async () => {
    if (!db || !business?.id) {
      setAvailableShops([]);
      setActiveShopIdState(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const shopsRef = collection(db, "businesses", business.id, "shops");
      const isOwner = business.ownerId === member?.uid;

      let shopDocs;

      if (isOwner || !member?.shopIds?.length) {
        // Owners see all shops; fallback: if no shopIds, fetch all and let
        // Firestore rules enforce access
        shopDocs = await getDocs(query(shopsRef, where("status", "==", "active")));
      } else {
        // Non-owner members: fetch only their authorized shops
        // Firestore "in" queries support up to 30 values
        const batches: Shop[] = [];
        const shopIdChunks: string[][] = [];

        for (let i = 0; i < member.shopIds.length; i += 30) {
          shopIdChunks.push(member.shopIds.slice(i, i + 30));
        }

        for (const chunk of shopIdChunks) {
          const q = query(
            shopsRef,
            where("status", "==", "active"),
            where("__name__", "in", chunk)
          );
          const snap = await getDocs(q);
          snap.forEach((d) => {
            batches.push({ id: d.id, ...d.data() } as Shop);
          });
        }

        setAvailableShops(batches);
        resolveActiveShop(batches);
        setLoading(false);
        return;
      }

      const shops: Shop[] = [];
      shopDocs.forEach((d) => {
        shops.push({ id: d.id, ...d.data() } as Shop);
      });

      setAvailableShops(shops);
      resolveActiveShop(shops);
    } catch (err) {
      console.error("[ShopContext] Failed to fetch shops:", err);
      setAvailableShops([]);
    } finally {
      setLoading(false);
    }
  }, [business, member, resolveActiveShop]);

  // ---------------------------------------------------------------------------
  // Set active shop (user action)
  // ---------------------------------------------------------------------------
  const setActiveShop = useCallback(
    (shopId: string) => {
      if (shopId === "all" || availableShops.some((s) => s.id === shopId)) {
        setActiveShopIdState(shopId);
        persistShopId(shopId);
      } else {
        console.warn(
          `[ShopContext] Cannot switch to shop "${shopId}" — not in available shops.`
        );
      }
    },
    [availableShops]
  );

  // ---------------------------------------------------------------------------
  // Reactive fetch on business/member change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (businessLoading) return;

    if (business?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchShops();
    } else {
      setAvailableShops([]);
      setActiveShopIdState(null);
      setLoading(false);
    }
  }, [business, member, businessLoading, fetchShops]);

  // ---------------------------------------------------------------------------
  // Derive activeShop from activeShopId
  // ---------------------------------------------------------------------------
  const activeShop = useMemo(
    () => availableShops.find((s) => s.id === activeShopId) ?? null,
    [availableShops, activeShopId]
  );

  // ---------------------------------------------------------------------------
  // Memoised value
  // ---------------------------------------------------------------------------
  const value = useMemo<ShopContextValue>(
    () => ({
      activeShopId,
      activeShop,
      availableShops,
      shops: availableShops,
      loading: businessLoading || loading,
      setActiveShop,
      refreshShops: fetchShops,
    }),
    [
      activeShopId,
      activeShop,
      availableShops,
      businessLoading,
      loading,
      setActiveShop,
      fetchShops,
    ]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export function useShop(): ShopContextValue {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
}
