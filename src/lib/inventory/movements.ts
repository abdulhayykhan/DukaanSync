import {
  collection,
  getDocs,
  doc,
  query,
  orderBy,
  limit,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import type { StockMovement, StockMovementType } from "@/types";
import type { BulkImportResult } from "@/components/ui/BulkImportModal";

export interface StockMovementImportPayload {
  itemId: string;        // resolved from SKU lookup or stored as-is
  sku: string;
  type: StockMovementType;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  reason: string;
  timestamp: string;
}

export class StockMovementService {
  /**
   * Fetches recent stock movements for a specific shop.
   */
  static async getRecentMovements(
    businessId: string,
    shopId: string,
    maxLimit: number = 100
  ): Promise<StockMovement[]> {
    if (!db) throw new Error("Firestore not initialized");

    const movementsRef = collection(db, "businesses", businessId, "shops", shopId, "stockMovements");

    const q = query(
      movementsRef,
      orderBy("createdAt", "desc"),
      limit(maxLimit)
    );

    const snapshot = await getDocs(q);

    const movements: StockMovement[] = [];
    snapshot.forEach((doc) => {
      movements.push({ id: doc.id, ...doc.data() } as StockMovement);
    });

    return movements;
  }

  /**
   * Bulk imports stock movement audit entries from CSV/Excel.
   */
  static async bulkImportMovements(
    businessId: string,
    shopId: string,
    rows: StockMovementImportPayload[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<BulkImportResult> {
    if (!db) throw new Error("Firestore not initialized");

    const CHUNK_SIZE = 400;
    let successCount = 0;
    const errors: string[] = [];
    const uid = auth?.currentUser?.uid || "system";
    const movRef = collection(db, "businesses", businessId, "shops", shopId, "stockMovements");
    const total = rows.length;

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      for (const row of chunk) {
        const ref = doc(movRef);
        batch.set(ref, {
          itemId: row.itemId || row.sku,
          sku: row.sku,
          businessId,
          shopId,
          type: row.type,
          quantityBefore: row.quantityBefore,
          quantityChange: row.quantityChange,
          quantityAfter: row.quantityAfter,
          reason: row.reason || "Bulk Import",
          createdBy: uid,
          createdAt: row.timestamp || new Date().toISOString(),
        });
      }

      try {
        await batch.commit();
        successCount += chunk.length;
        if (onProgress) onProgress(Math.min(i + CHUNK_SIZE, total), total);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Batch write failed at index ${i}: ${msg}`);
      }
    }

    return { successCount, updatedCount: 0, skippedCount: 0, errors };
  }
}
