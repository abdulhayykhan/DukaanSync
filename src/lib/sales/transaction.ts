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
import type { 
  Sale, 
  SaleItem, 
  StockMovement, 
  CustomerLedgerEntry, 
  AuditLog,
  PaymentMethod,
  PaymentStatus
} from "@/types";

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
  customerId?: string;
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
  ): Promise<string> {
    if (!db) throw new Error("Firestore not initialized");
    const firestore = db;

    const saleRef = doc(collection(firestore, "businesses", businessId, "shops", shopId, "sales"));
    
    // Generate a secure pseudo-random invoice number
    // Format: INV-YYMM-XXXX
    const dateStr = new Date().toISOString().slice(2, 7).replace("-", ""); // e.g., 2608
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;
    const now = new Date().toISOString();

    await runTransaction(firestore, async (transaction) => {
      // -------------------------------------------------------------
      // 1. Read all required data first
      // -------------------------------------------------------------
      
      let customerDoc: DocumentSnapshot | null = null;
      let customerRef: DocumentReference | null = null;
      const hasCustomer = Boolean(data.customerId && data.customerId !== "guest");
      const amountUnpaid = Math.max(0, data.grandTotalMinor - data.amountPaidMinor);
      const isCreditOrPartial = data.paymentStatus !== "paid" || amountUnpaid > 0 || data.paymentMethod === "credit";

      if (hasCustomer) {
        customerRef = doc(firestore, "businesses", businessId, "shops", shopId, "customers", data.customerId!);
        customerDoc = await transaction.get(customerRef);
        
        if (!customerDoc.exists()) {
          const fallbackRef = doc(firestore, "businesses", businessId, "customers", data.customerId!);
          const fallbackDoc = await transaction.get(fallbackRef);
          if (fallbackDoc.exists()) {
            customerRef = fallbackRef;
            customerDoc = fallbackDoc;
          }
        }
      } else if (isCreditOrPartial) {
        throw new Error("Credit or partial sales require a valid Customer to be selected.");
      }
      
      // Read all inventory items involved
      const inventoryRefs = data.items.map(item => 
        doc(firestore, "businesses", businessId, "shops", shopId, "inventory", item.itemId)
      );
      
      const inventoryDocs = await Promise.all(
        inventoryRefs.map(ref => transaction.get(ref))
      );
      
      const inventoryData = new Map<string, { quantity: number, costPriceMinor: number }>();
      inventoryDocs.forEach((docSnap, index) => {
        if (!docSnap.exists()) {
          throw new Error(`Inventory item ${data.items[index].name} not found in database.`);
        }
        const invData = docSnap.data();
        // Negative inventory guard
        if (invData.quantity < data.items[index].quantity) {
          throw new Error(`Insufficient stock for ${data.items[index].name}. Requested: ${data.items[index].quantity}, Available: ${invData.quantity}`);
        }
        inventoryData.set(docSnap.id, { 
          quantity: invData.quantity as number, 
          costPriceMinor: invData.costPriceMinor as number 
        });
      });

      // -------------------------------------------------------------
      // 2. Perform all writes
      // -------------------------------------------------------------

      // Map incoming items to true SaleItems preserving historical COGS
      const finalizedSaleItems: SaleItem[] = data.items.map(item => {
        const inv = inventoryData.get(item.itemId)!;
        return {
          itemId: item.itemId,
          sku: item.sku || "N/A",
          name: item.name || "Product",
          quantity: Number(item.quantity || 1),
          unitPriceMinor: Number(item.unitPriceMinor || 0),
          discountMinor: Number(item.discountMinor || 0),
          costPriceMinor: Number(inv?.costPriceMinor || 0),
          totalMinor: Number((item.unitPriceMinor * item.quantity) - item.discountMinor)
        };
      });

      // A. Create Sale Record with sanitized non-undefined fields
      const saleRecord: Sale = {
        id: saleRef.id,
        invoiceNumber,
        customerId: data.customerId ?? null,
        customerName: data.customerName || "Guest Customer",
        items: finalizedSaleItems,
        subtotalMinor: Number(data.subtotalMinor || 0),
        taxMinor: Number(data.taxMinor || 0),
        discountMinor: Number(data.discountMinor || 0),
        grandTotalMinor: Number(data.grandTotalMinor || 0),
        paymentMethod: data.paymentMethod || "cash",
        paymentStatus: data.paymentStatus || "paid",
        amountPaidMinor: Number(data.amountPaidMinor ?? 0),
        status: "completed",
        createdBy: userId || "system",
        createdAt: now,
      };

      const cleanSaleRecord = sanitizeFirestorePayload(saleRecord);
      transaction.set(saleRef, cleanSaleRecord);

      // B. Update Inventory & Log Movements
      for (const item of finalizedSaleItems) {
        const invRef = doc(firestore, "businesses", businessId, "shops", shopId, "inventory", item.itemId);
        const invData = inventoryData.get(item.itemId)!;
        
        const newQty = invData.quantity - item.quantity; // Decrement stock

        // Update inventory qty
        transaction.update(invRef, {
          quantity: newQty,
          updatedAt: now,
        });

        // Log stock movement
        const movementRef = doc(collection(firestore, "businesses", businessId, "shops", shopId, "movements"));
        const movementLog: Omit<StockMovement, "id"> = {
          itemId: item.itemId,
          type: "sale",
          quantityBefore: invData.quantity,
          quantityChange: -item.quantity, // Negative change
          quantityAfter: newQty,
          referenceType: "sale",
          referenceId: saleRef.id,
          reason: `Sale ${invoiceNumber}`,
          createdBy: userId,
          createdAt: now,
        };
        transaction.set(movementRef, movementLog);
      }

      // C. Update Customer Ledger if customer is attached
      if (hasCustomer && customerRef && customerDoc && customerDoc.exists()) {
        const currentBalance = (customerDoc.data()?.currentBalanceMinor as number) ?? 0;
        const newBalance = currentBalance + amountUnpaid; // Customer balance is receivables (how much they owe us)

        transaction.update(customerRef, {
          currentBalanceMinor: newBalance,
          updatedAt: now,
        });

        const ledgerRef = doc(collection(firestore, "businesses", businessId, "shops", shopId, "customers", data.customerId!, "ledger"));
        const ledgerEntry: Omit<CustomerLedgerEntry, "id"> = {
          customerId: data.customerId!,
          type: data.paymentMethod === "credit" ? "credit_sale" : (amountUnpaid > 0 ? "credit_sale" : "sale"),
          amountMinor: amountUnpaid > 0 ? amountUnpaid : data.grandTotalMinor,
          referenceType: "sale",
          referenceId: saleRef.id,
          balanceBeforeMinor: currentBalance,
          balanceAfterMinor: newBalance,
          createdBy: userId || "system",
          createdAt: now,
        };
        transaction.set(ledgerRef, sanitizeFirestorePayload(ledgerEntry));
      }

      // D. Write general Audit Log
      const auditRef = doc(collection(firestore, "businesses", businessId, "auditLogs"));
      const auditLog: Omit<AuditLog, "id"> = {
        action: "sale_created",
        entityType: "sale",
        entityId: saleRef.id,
        actorId: userId,
        shopId: shopId,
        metadata: { invoiceNumber, amount: data.grandTotalMinor },
        createdAt: now,
      };
      transaction.set(auditRef, auditLog);
    });

    return saleRef.id;
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
            items: (sale.items || []).map(item => ({
              itemId: item.itemId || item.sku || "item_custom",
              sku: item.sku || "N/A",
              name: item.name || "General Product",
              quantity: Number(item.quantity || 1),
              unitPriceMinor: Number(item.unitPriceMinor || 0),
              discountMinor: Number(item.discountMinor || 0),
              costPriceMinor: Number(item.costPriceMinor || 0),
              totalMinor: Number(item.totalMinor || (item.unitPriceMinor * item.quantity - item.discountMinor))
            })),
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
