import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { InventoryServicePayload } from "@/lib/validation/inventory";
import type { InventoryItem } from "@/types";

export class InventoryService {
  /**
   * Fetches inventory items for a specific shop.
   */
  static async getInventoryItems(
    businessId: string,
    shopId: string
  ): Promise<InventoryItem[]> {
    if (!db) throw new Error("Firestore not initialized");

    const itemsRef = collection(db, "businesses", businessId, "shops", shopId, "inventory");
    // We only fetch active items by default for the catalog
    const q = query(itemsRef, where("isActive", "==", true));
    const snapshot = await getDocs(q);

    const items: InventoryItem[] = [];
    snapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as InventoryItem);
    });

    return items;
  }

  /**
   * Creates a new inventory item and logs the initial stock movement.
   */
  static async createInventoryItem(
    businessId: string,
    shopId: string,
    data: InventoryServicePayload
  ): Promise<string> {
    if (!db) throw new Error("Firestore not initialized");

    // 1. Uniqueness check for SKU
    const itemsRef = collection(db, "businesses", businessId, "shops", shopId, "inventory");
    const q = query(itemsRef, where("sku", "==", data.sku));
    const snapshot = await getDocs(q);
    
    // Allow inactive items to have the same SKU, but not active ones
    const activeDup = snapshot.docs.find(d => d.data().isActive === true);
    if (activeDup) {
      throw new Error(`An active product with SKU ${data.sku} already exists.`);
    }

    const batch = writeBatch(db);

    // 2. Create the Inventory Item
    const newItemRef = doc(itemsRef);
    const now = new Date().toISOString();
    
    batch.set(newItemRef, {
      ...data,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // 3. Log initial stock movement if quantity > 0
    if (data.quantity > 0) {
      const movementRef = doc(collection(db, "businesses", businessId, "shops", shopId, "movements"));
      batch.set(movementRef, {
        itemId: newItemRef.id,
        type: "opening_stock",
        quantityBefore: 0,
        quantityChange: data.quantity,
        quantityAfter: data.quantity,
        reason: "Initial inventory setup",
        createdBy: "system", // We would ideally pass the uid here
        createdAt: now,
      });
    }

    await batch.commit();
    return newItemRef.id;
  }

  /**
   * Updates an existing inventory item.
   * Note: This does not adjust stock movements! A separate method handles stock adjustments.
   */
  static async updateInventoryItem(
    businessId: string,
    shopId: string,
    itemId: string,
    updates: Partial<InventoryServicePayload>
  ): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const itemRef = doc(db, "businesses", businessId, "shops", shopId, "inventory", itemId);
    
    // Do not allow updating quantity through this standard update method.
    // Stock must be updated via movements (adjustments, sales, purchases).
    const safeUpdates: Record<string, unknown> = { ...updates };
    delete safeUpdates.quantity;

    await updateDoc(itemRef, {
      ...safeUpdates,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Soft-deletes an inventory item.
   */
  static async toggleItemStatus(
    businessId: string,
    shopId: string,
    itemId: string,
    isActive: boolean
  ): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const itemRef = doc(db, "businesses", businessId, "shops", shopId, "inventory", itemId);
    await updateDoc(itemRef, {
      isActive,
      updatedAt: new Date().toISOString(),
    });
  }
}
