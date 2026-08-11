import { collection, query, orderBy, getDocs, limit, doc, writeBatch } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import type { Purchase, PaymentStatus, PaymentMethod } from "@/types";
import type { BulkImportResult } from "@/components/ui/BulkImportModal";

export interface PurchaseImportPayload {
  purchaseNumber: string;
  supplierName: string;
  date: string;
  grandTotalMinor: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export class PurchaseService {
  /**
   * Fetches recent purchases for a shop.
   */
  static async getPurchases(
    businessId: string,
    shopId: string,
    limitCount: number = 100
  ): Promise<Purchase[]> {
    if (!db) throw new Error("Firestore not initialized");

    const purchasesRef = collection(db, "businesses", businessId, "shops", shopId, "purchases");
    const q = query(purchasesRef, orderBy("createdAt", "desc"), limit(limitCount));

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Purchase[];
  }

  /**
   * Bulk imports purchase header records from CSV/Excel.
   * Each row is stored as a summary purchase (no line items).
   */
  static async bulkImportPurchases(
    businessId: string,
    shopId: string,
    rows: PurchaseImportPayload[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<BulkImportResult> {
    if (!db) throw new Error("Firestore not initialized");

    const CHUNK_SIZE = 400;
    let successCount = 0;
    const errors: string[] = [];
    const uid = auth?.currentUser?.uid || "system";
    const purchasesRef = collection(db, "businesses", businessId, "shops", shopId, "purchases");
    const total = rows.length;

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      const now = new Date().toISOString();

      for (const row of chunk) {
        const ref = doc(purchasesRef);
        batch.set(ref, {
          purchaseNumber: row.purchaseNumber,
          supplierId: row.supplierName, // stored as name since no ID lookup
          supplierName: row.supplierName,
          items: [], // bulk import stores header-only; no line items
          subtotalMinor: row.grandTotalMinor,
          discountMinor: 0,
          grandTotalMinor: row.grandTotalMinor,
          paymentMethod: row.paymentMethod,
          paymentStatus: row.paymentStatus,
          amountPaidMinor: row.paymentStatus === "paid" ? row.grandTotalMinor : 0,
          notes: row.notes || "",
          businessId,
          shopId,
          createdBy: uid,
          createdAt: row.date || now,
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
