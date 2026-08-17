import { 
  collection, 
  doc, 
  runTransaction,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  type DocumentSnapshot,
  type DocumentReference
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { BulkImportResult, DuplicateStrategy } from "@/components/ui/BulkImportModal";
import { auth } from "@/lib/firebase/client";
import type { 
  Sale, 
  SaleItem, 
  StockMovement, 
  CustomerLedgerEntry, 
  AuditLog,
  PaymentMethod,
  PaymentStatus
} from "@/types";
import { toMinorUnit } from "@/lib/utils/currency";

export interface SaleImportPayload {
  invoiceNumber?: string;
  customerName?: string;
  customerId?: string;
  items?: {
    itemId: string;
    sku: string;
    name: string;
    quantity: number;
    unitPriceMinor: number;
    discountMinor: number;
    costPriceMinor?: number;
    totalMinor?: number;
  }[];
  subtotalMinor: number;
  taxMinor: number;
  discountMinor: number;
  grandTotalMinor: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amountPaidMinor: number;
  cashierName?: string;
  createdAt: string;
}

export interface SaleTransactionData {
  customerId?: string | null;
  customerName?: string;
  items: {
    itemId: string;
    sku: string;
    name: string;
    quantity: number;
    unitPriceMinor: number;
    discountMinor: number;
  }[];
  subtotalMinor: number;
  taxMinor: number;
  discountMinor: number;
  grandTotalMinor: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amountPaidMinor: number;
}

/**
 * Recursively strips undefined values from an object or replaces them with default fallbacks
 * to prevent Cloud Firestore transaction.set() runtime exceptions.
 */
export function sanitizeFirestorePayload<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === undefined) {
      sanitized[key] = null;
    } else if (val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      sanitized[key] = sanitizeFirestorePayload(val);
    } else if (Array.isArray(val)) {
      sanitized[key] = val.map(item =>
        item !== null && typeof item === "object" ? sanitizeFirestorePayload(item) : (item === undefined ? null : item)
      );
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized as T;
}

export class SaleTransactionService {
  /**
   * Executes a completely atomic POS sale transaction.
   * Decrements inventory, preserves historical COGS, updates customer ledger (if credit),
   * logs stock movements, and generates the Sale invoice.
   */
  static async executeSaleTransaction(
    businessId: string,
    shopId: string,
    userId: string,
    data: SaleTransactionData
  ): Promise<{ saleId: string; invoiceNumber: string }> {
    const token = await auth?.currentUser?.getIdToken();
    if (!token) throw new Error("User is not authenticated");

    const response = await fetch("/api/sales/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ businessId, shopId, userId, data })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Transaction failed");
    }

    return result;
  }

  /**
   * Fetches recent sales history for a specific shop.
   */
  static async getRecentSales(businessId: string, shopId: string, maxResults = 500): Promise<Sale[]> {
    if (!db) throw new Error("Firestore not initialized");
    
    const salesRef = collection(db, "businesses", businessId, "shops", shopId, "sales");
    const q = query(salesRef, orderBy("createdAt", "desc"), limit(maxResults));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Sale);
  }

  /**
   * Bulk imports sales transactions into Cloud Firestore in batched chunks.
   * Supports overwriting existing sales collection if requested.
   */
  static async bulkImportSales(
    businessId: string,
    shopId: string,
    userId: string,
    sales: SaleImportPayload[],
    duplicateStrategy: DuplicateStrategy = "upsert",
    onProgress?: (processed: number, total: number) => void
  ): Promise<BulkImportResult> {
    if (!db) throw new Error("Firestore not initialized");
    const firestore = db;

    let successCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Optional Overwrite / Purge mode when strategy is 'upsert'
    if (duplicateStrategy === "upsert") {
      try {
        const existingSalesSnap = await getDocs(collection(firestore, "businesses", businessId, "shops", shopId, "sales"));
        if (!existingSalesSnap.empty) {
          const docs = existingSalesSnap.docs;
          const CHUNK = 400;
          for (let i = 0; i < docs.length; i += CHUNK) {
            const chunk = docs.slice(i, i + CHUNK);
            const batch = writeBatch(firestore);
            chunk.forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        }
      } catch (err: any) {
        console.error("Purge notice during sales bulk import:", err?.message);
      }
    }

    const CHUNK_SIZE = 400;
    for (let i = 0; i < sales.length; i += CHUNK_SIZE) {
      const chunk = sales.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(firestore);

      for (const sale of chunk) {
        try {
          const saleRef = doc(collection(firestore, "businesses", businessId, "shops", shopId, "sales"));
          
          const now = sale.createdAt || new Date().toISOString();
          const invoiceNumber = sale.invoiceNumber || `INV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

          const saleRecord: Sale = {
            id: saleRef.id,
            invoiceNumber,
            customerId: sale.customerId || "walk_in",
            customerName: sale.customerName || "Walk-in Customer",
            items: (sale.items || []).map((item: any) => {
              const unitPriceMinor = item.unitPriceMinor !== undefined ? Number(item.unitPriceMinor) : (item.unitRetailPKR ? toMinorUnit(item.unitRetailPKR) : 0);
              const costPriceMinor = item.costPriceMinor !== undefined ? Number(item.costPriceMinor) : (item.unitCostPKR ? toMinorUnit(item.unitCostPKR) : 0);
              const discountMinor = item.discountMinor !== undefined ? Number(item.discountMinor) : (item.discountPKR ? toMinorUnit(item.discountPKR) : 0);
              const quantity = Number(item.quantity || 1);
              const totalMinor = item.totalMinor !== undefined ? Number(item.totalMinor) : (item.totalPKR ? toMinorUnit(item.totalPKR) : (unitPriceMinor * quantity - discountMinor));
              
              return {
                itemId: item.itemId || item.sku || "item_custom",
                sku: item.sku || "N/A",
                name: item.name || "General Product",
                quantity,
                unitPriceMinor,
                discountMinor,
                costPriceMinor,
                totalMinor
              };
            }),
            subtotalMinor: Number(sale.subtotalMinor || sale.grandTotalMinor || 0),
            taxMinor: Number(sale.taxMinor || 0),
            discountMinor: Number(sale.discountMinor || 0),
            grandTotalMinor: Number(sale.grandTotalMinor || 0),
            paymentMethod: sale.paymentMethod || "cash",
            paymentStatus: sale.paymentStatus || "paid",
            amountPaidMinor: sale.paymentStatus === "paid" ? Number(sale.grandTotalMinor || 0) : Number(sale.amountPaidMinor || 0),
            status: "completed",
            createdBy: userId,
            createdAt: now
          };

          batch.set(saleRef, saleRecord);
          successCount++;
        } catch (rowErr: any) {
          skippedCount++;
          errors.push(rowErr.message || "Failed to process sale row");
        }
      }

      await batch.commit();
      if (onProgress) {
        onProgress(Math.min(i + CHUNK_SIZE, sales.length), sales.length);
      }
    }

    return {
      successCount,
      updatedCount,
      skippedCount,
      errors
    };
  }
}
