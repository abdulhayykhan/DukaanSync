import { doc, collection, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { AuditLogService } from "@/lib/audit/service";
import type { Sale, InventoryItem, Customer, AuditLog } from "@/types";

export class SaleReversalService {
  
  /**
   * Reverses a sale in a completely atomic, non-destructive transaction.
   * Modifies sale status, restores inventory, reverts ledgers, and logs the action.
   */
  static async cancelSale(
    businessId: string,
    shopId: string,
    saleId: string,
    actorId: string,
    reason: string
  ): Promise<void> {
    const firestore = db;
    if (!firestore) throw new Error("Firestore not initialized");

    return await runTransaction(firestore, async (transaction) => {
      // 1. Read Phase
      const saleRef = doc(firestore, "businesses", businessId, "shops", shopId, "sales", saleId);
      const saleDoc = await transaction.get(saleRef);
      if (!saleDoc.exists()) throw new Error("Sale not found");
      
      const saleData = saleDoc.data() as Sale;
      if (saleData.status === "cancelled" || saleData.status === "returned") {
        throw new Error("Sale is already cancelled or returned");
      }

      // Read all inventory items involved
      const inventoryRefs = saleData.items.map(item => 
        doc(firestore, "businesses", businessId, "shops", shopId, "inventory", item.itemId)
      );
      const inventoryDocs = await Promise.all(inventoryRefs.map(ref => transaction.get(ref)));

      // Read customer if this was a credit sale or partial payment
      let customerRef = null;
      let customerData: Customer | null = null;
      const amountOwed = saleData.grandTotalMinor - saleData.amountPaidMinor;
      
      if (saleData.customerId && (saleData.paymentMethod === 'credit' || amountOwed > 0)) {
        customerRef = doc(firestore, "businesses", businessId, "customers", saleData.customerId);
        const customerDoc = await transaction.get(customerRef);
        if (customerDoc.exists()) {
          customerData = customerDoc.data() as Customer;
        }
      }

      // 2. Write Phase
      const now = new Date().toISOString();

      // Update Sale Status
      transaction.update(saleRef, {
        status: "cancelled",
        updatedAt: now
      });

      // Restore Inventory & Log Stock Movements
      saleData.items.forEach((item, index) => {
        const invDoc = inventoryDocs[index];
        if (invDoc.exists()) {
          const invData = invDoc.data() as InventoryItem;
          // Re-increment stock
          transaction.update(inventoryRefs[index], {
            quantity: invData.quantity + item.quantity,
            updatedAt: now
          });

          // Write Movement
          const moveRef = doc(collection(firestore, "businesses", businessId, "shops", shopId, "inventory", item.itemId, "movements"));
          transaction.set(moveRef, {
            type: "customer_return",
            quantityMinor: item.quantity,
            referenceType: "sale_cancellation",
            referenceId: saleId,
            balanceAfter: invData.quantity + item.quantity,
            createdBy: actorId,
            createdAt: now
          });
        }
      });

      // Revert Customer Ledger if applicable
      if (customerRef && customerData && amountOwed > 0) {
        const newBalance = customerData.currentBalanceMinor - amountOwed;
        
        transaction.update(customerRef, {
          currentBalanceMinor: newBalance,
          updatedAt: now
        });

        const ledgerRef = doc(collection(firestore, "businesses", businessId, "customers", customerData.id, "ledger"));
        transaction.set(ledgerRef, {
          type: "adjustment", // Credit reversal
          amountMinor: amountOwed,
          referenceType: "sale_cancellation",
          referenceId: saleId,
          balanceBeforeMinor: customerData.currentBalanceMinor,
          balanceAfterMinor: newBalance,
          createdBy: actorId,
          createdAt: now
        });
      }

      // Write Audit Log
      const auditRef = AuditLogService.getTransactionRef(businessId, shopId);
      const auditLog: Omit<AuditLog, "id"> = {
        action: "sale_cancelled",
        actorId,
        entityType: "sale",
        entityId: saleId,
        shopId,
        metadata: {
          reason,
          grandTotalReversed: saleData.grandTotalMinor
        },
        createdAt: now
      };
      transaction.set(auditRef, auditLog);
    });
  }
}
