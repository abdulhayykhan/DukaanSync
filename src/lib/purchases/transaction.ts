import {
  collection,
  doc,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { 
  Purchase, 
  PurchaseItem, 
  StockMovement, 
  SupplierLedgerEntry, 
  AuditLog 
} from "@/types";

import { sanitizeFirestorePayload } from "@/lib/sales/transaction";

export interface PurchaseTransactionData {
  supplierId: string;
  items: PurchaseItem[];
  subtotalMinor: number;
  discountMinor: number;
  grandTotalMinor: number;
  paymentMethod: Purchase["paymentMethod"];
  paymentStatus: Purchase["paymentStatus"];
  amountPaidMinor: number;
}

export class PurchaseTransactionService {
  /**
   * Executes a completely atomic purchase transaction.
   * If any step fails, the entire operation is rolled back safely by Firestore.
   */
  static async executePurchaseTransaction(
    businessId: string,
    shopId: string,
    userId: string,
    data: PurchaseTransactionData
  ): Promise<string> {
    if (!db) throw new Error("Firestore not initialized");
    const firestore = db;

    const purchaseRef = doc(collection(firestore, "businesses", businessId, "shops", shopId, "purchases"));
    
    // Generate a secure pseudo-random purchase number without sharding bottlenecks
    const dateStr = new Date().toISOString().slice(0, 7).replace("-", ""); // e.g., 202608
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const purchaseNumber = `PO-${dateStr}-${randomSuffix}`;
    const now = new Date().toISOString();

    await runTransaction(firestore, async (transaction) => {
      // 1. Read all required data first!
      // In Firestore, ALL reads must happen before ANY writes in a transaction.
      
      const supplierRef = doc(firestore, "businesses", businessId, "suppliers", data.supplierId);
      const supplierDoc = await transaction.get(supplierRef);
      
      if (!supplierDoc.exists()) {
        throw new Error(`Supplier ${data.supplierId} not found`);
      }
      
      // Read all inventory items involved
      const inventoryRefs = data.items.map(item => 
        doc(firestore, "businesses", businessId, "shops", shopId, "inventory", item.itemId)
      );
      
      const inventoryDocs = await Promise.all(
        inventoryRefs.map(ref => transaction.get(ref))
      );
      
      const inventoryQuantities = new Map<string, number>();
      inventoryDocs.forEach((docSnap, index) => {
        if (!docSnap.exists()) {
          throw new Error(`Inventory item ${data.items[index].name} not found`);
        }
        inventoryQuantities.set(docSnap.id, docSnap.data().quantity as number);
      });

      // -------------------------------------------------------------
      // 2. Perform all writes
      // -------------------------------------------------------------

      const sanitizedItems: PurchaseItem[] = data.items.map(item => ({
        itemId: item.itemId,
        sku: item.sku || "N/A",
        name: item.name || "Product",
        quantity: Number(item.quantity || 1),
        unitCostMinor: Number(item.unitCostMinor || 0),
        discountMinor: Number(item.discountMinor || 0),
        totalMinor: Number(item.totalMinor || (item.unitCostMinor * item.quantity - item.discountMinor))
      }));

      // A. Create Purchase Record
      const purchaseRecord: Purchase = {
        id: purchaseRef.id,
        purchaseNumber,
        supplierId: data.supplierId,
        items: sanitizedItems,
        subtotalMinor: Number(data.subtotalMinor || 0),
        discountMinor: Number(data.discountMinor || 0),
        grandTotalMinor: Number(data.grandTotalMinor || 0),
        paymentMethod: data.paymentMethod || "cash",
        paymentStatus: data.paymentStatus || "paid",
        amountPaidMinor: Number(data.amountPaidMinor ?? 0),
        status: "completed",
        createdBy: userId || "system",
        createdAt: now,
      };
      transaction.set(purchaseRef, sanitizeFirestorePayload(purchaseRecord));

      // B. Update Inventory & Log Movements
      for (const item of sanitizedItems) {
        const invRef = doc(firestore, "businesses", businessId, "shops", shopId, "inventory", item.itemId);
        const currentQty = inventoryQuantities.get(item.itemId) || 0;
        const newQty = currentQty + item.quantity;

        // Update inventory qty
        transaction.update(invRef, {
          quantity: newQty,
          updatedAt: now,
        });

        // Log stock movement
        const movementRef = doc(collection(firestore, "businesses", businessId, "shops", shopId, "movements"));
        const movementLog: Omit<StockMovement, "id"> = {
          itemId: item.itemId,
          type: "purchase",
          quantityBefore: currentQty,
          quantityChange: item.quantity,
          quantityAfter: newQty,
          referenceType: "purchase",
          referenceId: purchaseRef.id,
          reason: `Purchase ${purchaseNumber}`,
          createdBy: userId || "system",
          createdAt: now,
        };
        transaction.set(movementRef, sanitizeFirestorePayload(movementLog));
      }

      // C. Update Supplier Ledger if unpaid/partial
      const amountUnpaid = data.grandTotalMinor - data.amountPaidMinor;
      if (amountUnpaid > 0) {
        const currentBalance = (supplierDoc.data()?.currentBalanceMinor as number) ?? 0;
        const newBalance = currentBalance + amountUnpaid; // Supplier balance is payables (how much we owe)

        transaction.update(supplierRef, {
          currentBalanceMinor: newBalance,
          updatedAt: now,
        });

        const ledgerRef = doc(collection(firestore, "businesses", businessId, "suppliers", data.supplierId, "ledger"));
        const ledgerEntry: Omit<SupplierLedgerEntry, "id"> = {
          supplierId: data.supplierId,
          type: "credit_purchase",
          amountMinor: amountUnpaid,
          referenceType: "purchase",
          referenceId: purchaseRef.id,
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
        action: "purchase_created",
        entityType: "purchase",
        entityId: purchaseRef.id,
        actorId: userId || "system",
        shopId: shopId,
        metadata: { purchaseNumber, amount: data.grandTotalMinor },
        createdAt: now,
      };
      transaction.set(auditRef, sanitizeFirestorePayload(auditLog));
    });

    return purchaseRef.id;
  }
}
