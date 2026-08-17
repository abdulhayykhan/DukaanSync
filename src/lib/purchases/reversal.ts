import { doc, collection, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { AuditLogService } from "@/lib/audit/service";
import type { Purchase, InventoryItem, Supplier, AuditLog } from "@/types";

export class PurchaseReversalService {
  
  /**
   * Reverses a purchase in a completely atomic, non-destructive transaction.
   * Modifies purchase status, deducts inventory, reverts ledgers, and logs the action.
   */
  static async cancelPurchase(
    businessId: string,
    shopId: string,
    purchaseId: string,
    actorId: string,
    reason: string
  ): Promise<void> {
    const firestore = db;
    if (!firestore) throw new Error("Firestore not initialized");

    await runTransaction(firestore, async (transaction) => {
      // 1. Read Phase
      const purchaseRef = doc(firestore, "businesses", businessId, "shops", shopId, "purchases", purchaseId);
      const purchaseDoc = await transaction.get(purchaseRef);
      if (!purchaseDoc.exists()) throw new Error("Purchase not found");
      
      const purchaseData = purchaseDoc.data() as Purchase;
      // Purchases don't have a status field yet; we could check paymentStatus or similar,
      // but for now we just proceed with reversal.
      // TODO: Add 'status' to Purchase interface if needed.

      // Read all inventory items involved
      const inventoryRefs = purchaseData.items.map(item => 
        doc(firestore, "businesses", businessId, "shops", shopId, "inventory", item.itemId)
      );
      const inventoryDocs = await Promise.all(inventoryRefs.map(ref => transaction.get(ref)));

      // Enforce stock invariant - if cancelling the purchase causes negative stock, block it.
      inventoryDocs.forEach((invDoc, index) => {
        if (invDoc.exists()) {
          const invData = invDoc.data() as InventoryItem;
          const returnQty = purchaseData.items[index].quantity;
          if (invData.quantity - returnQty < 0) {
            throw new Error(`Cannot cancel purchase: Returning ${returnQty} of ${invData.name} would result in negative stock.`);
          }
        }
      });

      // Read supplier if this was a credit purchase or partial payment
      let supplierRef = null;
      let supplierData: Supplier | null = null;
      const amountOwed = purchaseData.grandTotalMinor - purchaseData.amountPaidMinor;
      
      if (purchaseData.paymentMethod === 'credit' || amountOwed > 0) {
        supplierRef = doc(firestore, "businesses", businessId, "shops", shopId, "suppliers", purchaseData.supplierId);
        let supplierDoc = await transaction.get(supplierRef);
        if (!supplierDoc.exists()) {
          supplierRef = doc(firestore, "businesses", businessId, "suppliers", purchaseData.supplierId);
          supplierDoc = await transaction.get(supplierRef);
        }
        if (supplierDoc.exists()) {
          supplierData = supplierDoc.data() as Supplier;
        }
      }

      // 2. Write Phase
      const now = new Date().toISOString();

      // Update Purchase Status
      transaction.update(purchaseRef, {
        status: "cancelled",
        updatedAt: now
      });

      // Restore (Decrement) Inventory & Log Stock Movements
      purchaseData.items.forEach((item, index) => {
        const invDoc = inventoryDocs[index];
        if (invDoc.exists()) {
          const invData = invDoc.data() as InventoryItem;
          // Decrement stock
          transaction.update(inventoryRefs[index], {
            quantity: invData.quantity - item.quantity,
            updatedAt: now
          });

          // Log stock movement to shop-level stockMovements subcollection
          const moveRef = doc(collection(firestore, "businesses", businessId, "shops", shopId, "stockMovements"));
          transaction.set(moveRef, {
            itemId: item.itemId,
            businessId,
            shopId,
            type: "supplier_return",
            quantityBefore: invData.quantity,
            quantityChange: -item.quantity,
            quantityAfter: invData.quantity - item.quantity,
            referenceType: "purchase",
            referenceId: purchaseId,
            reason: `Purchase Return/Cancellation for PO ${purchaseData.purchaseNumber}`,
            createdBy: actorId || "system",
            createdAt: now
          });
        }
      });

      // Revert Supplier Ledger if applicable
      if (supplierRef && supplierData && amountOwed > 0) {
        const newBalance = supplierData.currentBalanceMinor - amountOwed;
        
        transaction.update(supplierRef, {
          currentBalanceMinor: newBalance,
          updatedAt: now
        });

        const ledgerRef = doc(collection(supplierRef, "ledger"));
        transaction.set(ledgerRef, {
          type: "adjustment", // Debt reversal
          amountMinor: amountOwed,
          referenceType: "purchase_cancellation",
          referenceId: purchaseId,
          balanceBeforeMinor: supplierData.currentBalanceMinor,
          balanceAfterMinor: newBalance,
          createdBy: actorId,
          createdAt: now
        });
      }

      // Write Audit Log
      const auditRef = AuditLogService.getTransactionRef(businessId, shopId);
      const auditLog: Omit<AuditLog, "id"> = {
        action: "purchase_cancelled",
        actorId,
        entityType: "purchase",
        entityId: purchaseId,
        shopId,
        metadata: {
          reason,
          grandTotalReversed: purchaseData.grandTotalMinor
        },
        createdAt: now
      };
      transaction.set(auditRef, auditLog);
    });
  }
}
