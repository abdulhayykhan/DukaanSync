import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import type { InventoryServicePayload } from "@/lib/validation/inventory";
import type { InventoryItem } from "@/types";
import type { DuplicateStrategy, BulkImportResult } from "@/components/ui/BulkImportModal";

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
      businessId,
      shopId,
      createdBy: auth?.currentUser?.uid || "system",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // 3. Log initial stock movement if quantity > 0
    if (data.quantity > 0) {
      const movementRef = doc(collection(db, "businesses", businessId, "shops", shopId, "stockMovements"));
      batch.set(movementRef, {
        itemId: newItemRef.id,
        businessId,
        shopId,
        type: "initial",
        quantityBefore: 0,
        quantityChange: data.quantity,
        quantityAfter: data.quantity,
        reason: "Initial inventory setup",
        createdBy: auth?.currentUser?.uid || "system",
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

  /**
   * Bulk imports inventory items with configurable duplicate handling strategy.
   * Processes in chunks of 250 to stay well under the 500 writes batch limit
   * (each item might take 2 writes: one for item, one for stock movement).
   *
   * Strategies:
   *  - "upsert":    Update existing items (price, category, unit) and replace stock quantity.
   *  - "add_stock": Update existing items and ADD imported qty on top of current stock.
   *  - "skip":      Leave existing items completely unchanged.
   */
  static async bulkImportProducts(
    businessId: string,
    shopId: string,
    products: InventoryServicePayload[],
    duplicateStrategy: DuplicateStrategy = "upsert",
    onProgress?: (processed: number, total: number) => void
  ): Promise<BulkImportResult> {
    if (!db) throw new Error("Firestore not initialized");

    const CHUNK_SIZE = 200; // conservative: leaves room for 2 movement writes per item
    let successCount = 0;   // brand-new items created
    let updatedCount = 0;   // existing items updated / stock added
    let skippedCount = 0;   // duplicates intentionally skipped
    const errors: string[] = [];

    // --- Pre-fetch entire shop catalog to build SKU → document map ---
    const itemsRef = collection(db, "businesses", businessId, "shops", shopId, "inventory");
    const catalogSnap = await getDocs(query(itemsRef, where("isActive", "==", true)));

    // Map: SKU -> { id, quantity }
    const existingBySku = new Map<string, { id: string; quantity: number }>();
    catalogSnap.docs.forEach(d => {
      const data = d.data();
      existingBySku.set(data.sku, { id: d.id, quantity: data.quantity ?? 0 });
    });

    if (duplicateStrategy === "overwrite") {
      try {
        const existingSnap = await getDocs(itemsRef);
        if (!existingSnap.empty) {
          const deleteBatch = writeBatch(db);
          existingSnap.docs.forEach((d) => deleteBatch.delete(d.ref));
          await deleteBatch.commit();
        }
        existingBySku.clear();
      } catch (err) {
        console.error("Error clearing existing inventory during overwrite import:", err);
      }
    }

    // --- Classify products: new vs existing ---
    type ProductWithKind = InventoryServicePayload & { _kind: "new" | "update" | "skip" };

    const classified: ProductWithKind[] = products.map(p => {
      if (existingBySku.has(p.sku)) {
        if (duplicateStrategy === "skip") {
          return { ...p, _kind: "skip" };
        }
        return { ...p, _kind: "update" };
      }
      return { ...p, _kind: "new" };
    });

    // Count skips immediately
    const skipItems = classified.filter(p => p._kind === "skip");
    skippedCount = skipItems.length;

    const toProcess = classified.filter(p => p._kind !== "skip");
    const total = toProcess.length;

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = toProcess.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      const uid = auth?.currentUser?.uid || "system";

      for (const item of chunk) {
        const existing = item._kind === "update" ? existingBySku.get(item.sku) : undefined;

        if (item._kind === "new") {
          // --- CREATE new document ---
          const newItemRef = doc(itemsRef);
          batch.set(newItemRef, {
            sku: item.sku,
            name: item.name,
            categoryId: item.categoryId,
            unit: item.unit,
            quantity: item.quantity,
            reorderLevel: item.reorderLevel,
            costPriceMinor: item.costPriceMinor,
            retailPriceMinor: item.retailPriceMinor,
            businessId,
            shopId,
            createdBy: uid,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });

          if (item.quantity > 0) {
            const movRef = doc(collection(db, "businesses", businessId, "shops", shopId, "stockMovements"));
            batch.set(movRef, {
              itemId: newItemRef.id,
              businessId,
              shopId,
              type: "initial",
              quantityBefore: 0,
              quantityChange: item.quantity,
              quantityAfter: item.quantity,
              reason: "Bulk Import – New Item",
              createdBy: uid,
              createdAt: now,
            });
          }
          successCount++;

        } else if (item._kind === "update" && existing) {
          // --- UPDATE existing document ---
          const existingRef = doc(db, "businesses", businessId, "shops", shopId, "inventory", existing.id);

          let newQuantity: number;
          let movementType: string;
          let movementReason: string;

          if (duplicateStrategy === "add_stock") {
            newQuantity = existing.quantity + item.quantity;
            movementType = "import_addition";
            movementReason = `Bulk Import – Stock Addition (+${item.quantity})`;
          } else {
            // upsert: replace
            newQuantity = item.quantity;
            movementType = "import_update";
            movementReason = `Bulk Import – Full Update (set to ${item.quantity})`;
          }

          batch.set(existingRef, {
            name: item.name,
            categoryId: item.categoryId,
            unit: item.unit,
            quantity: newQuantity,
            reorderLevel: item.reorderLevel,
            costPriceMinor: item.costPriceMinor,
            retailPriceMinor: item.retailPriceMinor,
            businessId,
            shopId,
            updatedAt: now,
          }, { merge: true });

          // Write stock movement audit entry
          const quantityDelta = newQuantity - existing.quantity;
          if (quantityDelta !== 0) {
            const movRef = doc(collection(db, "businesses", businessId, "shops", shopId, "stockMovements"));
            batch.set(movRef, {
              itemId: existing.id,
              businessId,
              shopId,
              type: movementType,
              quantityBefore: existing.quantity,
              quantityChange: quantityDelta,
              quantityAfter: newQuantity,
              reason: movementReason,
              createdBy: uid,
              createdAt: now,
            });
          }

          updatedCount++;
        }
      }

      try {
        await batch.commit();
        if (onProgress) {
          onProgress(Math.min(i + CHUNK_SIZE, total), total);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown batch error";
        errors.push(`Batch write failed at index ${i}: ${msg}`);
      }
    }

    return { successCount, updatedCount, skippedCount, errors };
  }
}
