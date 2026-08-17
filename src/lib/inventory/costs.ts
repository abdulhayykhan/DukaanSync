import { collectionGroup, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { InventoryItem } from "@/types";

/**
 * Fetches and merges the `costPriceMinor` from the isolated `cost/data` subdocuments
 * into the provided inventory items. Fails silently (or logs if appropriate)
 * if the user lacks permissions (e.g. a cashier).
 */
export async function mergeCostsIntoInventory(
  items: InventoryItem[],
  businessId: string,
  shopId: string
): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  if (items.length === 0) return;

  try {
    const costQ = query(
      collectionGroup(db, "cost"),
      where("businessId", "==", businessId),
      where("shopId", "==", shopId)
    );
    const costSnap = await getDocs(costQ);

    const costs = new Map<string, number>();
    costSnap.forEach((d) => costs.set(d.data().itemId, d.data().costPriceMinor));

    items.forEach((item) => {
      const cost = costs.get(item.id);
      if (cost !== undefined) {
        item.costPriceMinor = cost;
      }
    });
  } catch (e: any) {
    if (e?.code === "permission-denied") {
      // Cashier or permissions error, silently ignore
    } else {
      console.error("Failed to fetch cost data for inventory items:", e);
    }
  }
}
