import { 
  collection, 
  doc, 
  getDocs,
  getDoc,
  setDoc,
  updateDoc, 
  query, 
  orderBy, 
  runTransaction,
  writeBatch
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Customer, CustomerLedgerEntry, AuditLog } from "@/types";

export class CustomerService {
  /**
   * Fetches all customers for a given shop.
   */
  static async getCustomers(businessId: string, shopId: string): Promise<Customer[]> {
    if (!db) throw new Error("Firestore not initialized");
    const q = query(
      collection(db, "businesses", businessId, "shops", shopId, "customers"),
      orderBy("name", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
  }

  /**
   * Fetches a single customer by ID.
   */
  static async getCustomer(businessId: string, shopId: string, customerId: string): Promise<Customer | null> {
    if (!db) throw new Error("Firestore not initialized");
    const snap = await getDoc(doc(db, "businesses", businessId, "shops", shopId, "customers", customerId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Customer;
  }

  /**
   * Creates a new customer.
   */
  static async createCustomer(
    businessId: string, 
    shopId: string,
    data: Omit<Customer, "id" | "currentBalanceMinor" | "isActive" | "createdAt" | "updatedAt">
  ): Promise<string> {
    if (!db) throw new Error("Firestore not initialized");
    const ref = doc(collection(db, "businesses", businessId, "shops", shopId, "customers"));
    const now = new Date().toISOString();
    const newCustomer: Omit<Customer, "id"> = {
      ...data,
      currentBalanceMinor: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(ref, newCustomer);
    return ref.id;
  }

  /**
   * Updates customer details.
   */
  static async updateCustomer(
    businessId: string,
    shopId: string,
    customerId: string,
    data: Partial<Pick<Customer, "name" | "phone" | "email" | "isActive">>
  ): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const ref = doc(db, "businesses", businessId, "shops", shopId, "customers", customerId);
    await updateDoc(ref, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Fetches the ledger history for a customer.
   */
  static async getCustomerLedger(businessId: string, shopId: string, customerId: string): Promise<CustomerLedgerEntry[]> {
    if (!db) throw new Error("Firestore not initialized");
    const q = query(
      collection(db, "businesses", businessId, "shops", shopId, "customers", customerId, "ledger"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomerLedgerEntry));
  }

  /**
   * Records a payment received from a customer using an atomic transaction.
   * Decreases the customer's outstanding balance (receivables).
   */
  static async recordCustomerPayment(
    businessId: string,
    shopId: string,
    customerId: string,
    amountMinor: number,
    userId: string,
    referenceId?: string
  ): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const firestore = db;

    await runTransaction(firestore, async (transaction) => {
      const customerRef = doc(firestore, "businesses", businessId, "shops", shopId, "customers", customerId);
      const customerSnap = await transaction.get(customerRef);
      
      if (!customerSnap.exists()) {
        throw new Error("Customer not found");
      }
      
      const currentBalance = customerSnap.data().currentBalanceMinor as number;
      const newBalance = currentBalance - amountMinor;
      const now = new Date().toISOString();

      // Update customer balance
      transaction.update(customerRef, {
        currentBalanceMinor: newBalance,
        updatedAt: now
      });

      // Insert ledger entry
      const ledgerRef = doc(collection(firestore, "businesses", businessId, "shops", shopId, "customers", customerId, "ledger"));
      const entry: Omit<CustomerLedgerEntry, "id"> = {
        customerId,
        type: "payment",
        amountMinor,
        referenceType: "payment",
        referenceId,
        balanceBeforeMinor: currentBalance,
        balanceAfterMinor: newBalance,
        createdBy: userId,
        createdAt: now
      };
      transaction.set(ledgerRef, entry);
      
      // System audit log
      const auditRef = doc(collection(firestore, "businesses", businessId, "shops", shopId, "auditLogs"));
      const auditLog: Omit<AuditLog, "id"> = {
        action: "customer_payment",
        entityType: "customer",
        entityId: ledgerRef.id,
        actorId: userId,
        metadata: { details: `Recorded payment of ${amountMinor} minor units from customer ${customerId}` },
        createdAt: now,
      };
      transaction.set(auditRef, auditLog);
    });
  }

  /**
   * Bulk imports customers.
   * Processes in chunks of 250 to stay under the 500 writes batch limit.
   */
  static async bulkImportCustomers(
    businessId: string,
    shopId: string,
    customers: { name: string; phone?: string; email?: string; currentBalanceMinor: number }[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<{ successCount: number; errors: string[] }> {
    if (!db) throw new Error("Firestore not initialized");

    const CHUNK_SIZE = 250;
    let successCount = 0;
    const errors: string[] = [];
    const total = customers.length;

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = customers.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      const now = new Date().toISOString();

      for (const data of chunk) {
        const newCustomerRef = doc(collection(db, "businesses", businessId, "shops", shopId, "customers"));
        
        batch.set(newCustomerRef, {
          name: data.name,
          phone: data.phone || "",
          email: data.email || "",
          currentBalanceMinor: data.currentBalanceMinor,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });

        // Add ledger entry if there is an initial balance
        if (data.currentBalanceMinor > 0) {
          const ledgerRef = doc(collection(db, "businesses", businessId, "shops", shopId, "customers", newCustomerRef.id, "ledger"));
          batch.set(ledgerRef, {
            customerId: newCustomerRef.id,
            type: "opening_balance",
            amountMinor: data.currentBalanceMinor,
            referenceType: "import",
            balanceBeforeMinor: 0,
            balanceAfterMinor: data.currentBalanceMinor,
            createdBy: "system",
            createdAt: now,
          });
        }
      }

      try {
        await batch.commit();
        successCount += chunk.length;
        if (onProgress) {
          onProgress(successCount, total);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown batch error";
        errors.push(`Batch write failed at index ${i}: ${msg}`);
      }
    }

    return { successCount, errors };
  }
}
