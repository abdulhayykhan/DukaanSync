import { 
  collection, 
  doc, 
   
  getDocs,
  getDoc,
  setDoc,
  updateDoc, 
  query, 
  orderBy, 
  runTransaction 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Customer, CustomerLedgerEntry, AuditLog } from "@/types";

export class CustomerService {
  /**
   * Fetches all customers for a given business.
   */
  static async getCustomers(businessId: string): Promise<Customer[]> {
    if (!db) throw new Error("Firestore not initialized");
    const q = query(
      collection(db, "businesses", businessId, "customers"),
      orderBy("name", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
  }

  /**
   * Fetches a single customer by ID.
   */
  static async getCustomer(businessId: string, customerId: string): Promise<Customer | null> {
    if (!db) throw new Error("Firestore not initialized");
    const snap = await getDoc(doc(db, "businesses", businessId, "customers", customerId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Customer;
  }

  /**
   * Creates a new customer.
   */
  static async createCustomer(
    businessId: string, 
    data: Omit<Customer, "id" | "currentBalanceMinor" | "isActive" | "createdAt" | "updatedAt">
  ): Promise<string> {
    if (!db) throw new Error("Firestore not initialized");
    const ref = doc(collection(db, "businesses", businessId, "customers"));
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
    customerId: string,
    data: Partial<Pick<Customer, "name" | "phone" | "email" | "isActive">>
  ): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const ref = doc(db, "businesses", businessId, "customers", customerId);
    await updateDoc(ref, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Fetches the ledger history for a customer.
   */
  static async getCustomerLedger(businessId: string, customerId: string): Promise<CustomerLedgerEntry[]> {
    if (!db) throw new Error("Firestore not initialized");
    const q = query(
      collection(db, "businesses", businessId, "customers", customerId, "ledger"),
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
    customerId: string,
    amountMinor: number,
    userId: string,
    referenceId?: string
  ): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const firestore = db as any;
    
    await runTransaction(firestore, async (transaction) => {
      const customerRef = doc(firestore, "businesses", businessId, "customers", customerId);
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
      const ledgerRef = doc(collection(firestore, "businesses", businessId, "customers", customerId, "ledger"));
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
      const auditRef = doc(collection(firestore, "businesses", businessId, "auditLogs"));
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
}
