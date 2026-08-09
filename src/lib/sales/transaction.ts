import { 
  collection, 
  doc, 
  runTransaction,
  type DocumentSnapshot,
  type DocumentReference
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { 
  Sale, 
  SaleItem, 
  StockMovement, 
  CustomerLedgerEntry, 
  AuditLog,
  PaymentMethod,
  PaymentStatus
} from "@/types";

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
      const isCreditOrPartial = data.paymentStatus !== "paid" && data.amountPaidMinor < data.grandTotalMinor;

      if (isCreditOrPartial) {
        if (!data.customerId) {
          throw new Error("Credit sales require a valid Customer ID.");
        }
        customerRef = doc(firestore, "businesses", businessId, "customers", data.customerId);
        customerDoc = await transaction.get(customerRef);
        
        if (!customerDoc.exists()) {
          throw new Error(`Customer ${data.customerId} not found`);
        }
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
          ...item,
          costPriceMinor: inv.costPriceMinor,
          totalMinor: (item.unitPriceMinor * item.quantity) - item.discountMinor
        };
      });

      // A. Create Sale Record
      const saleRecord: Sale = {
        id: saleRef.id,
        invoiceNumber,
        customerId: data.customerId,
        customerName: data.customerName,
        items: finalizedSaleItems,
        subtotalMinor: data.subtotalMinor,
        taxMinor: data.taxMinor,
        discountMinor: data.discountMinor,
        grandTotalMinor: data.grandTotalMinor,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus,
        amountPaidMinor: data.amountPaidMinor,
        status: "completed",
        createdBy: userId,
        createdAt: now,
      };
      transaction.set(saleRef, saleRecord);

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

      // C. Update Customer Ledger if unpaid/partial
      if (isCreditOrPartial && customerRef && customerDoc) {
        const amountUnpaid = data.grandTotalMinor - data.amountPaidMinor;
        const currentBalance = customerDoc.data()?.currentBalanceMinor as number ?? 0;
        const newBalance = currentBalance + amountUnpaid; // Customer balance is receivables (how much they owe us)

        transaction.update(customerRef, {
          currentBalanceMinor: newBalance,
          updatedAt: now,
        });

        const ledgerRef = doc(collection(firestore, "businesses", businessId, "customers", data.customerId!, "ledger"));
        const ledgerEntry: Omit<CustomerLedgerEntry, "id"> = {
          customerId: data.customerId!,
          type: "credit_sale",
          amountMinor: amountUnpaid,
          referenceType: "sale",
          referenceId: saleRef.id,
          balanceBeforeMinor: currentBalance,
          balanceAfterMinor: newBalance,
          createdBy: userId,
          createdAt: now,
        };
        transaction.set(ledgerRef, ledgerEntry);
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
}
