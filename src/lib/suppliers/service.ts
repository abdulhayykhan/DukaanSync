import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  updateDoc,
  writeBatch
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Supplier, SupplierLedgerEntry } from "@/types";

export class SupplierService {
  /**
   * Fetches suppliers for a specific business.
   */
  static async getSuppliers(businessId: string): Promise<Supplier[]> {
    if (!db) throw new Error("Firestore not initialized");

    const suppliersRef = collection(db, "businesses", businessId, "suppliers");
    const q = query(suppliersRef, where("isActive", "==", true));
    const snapshot = await getDocs(q);

    const suppliers: Supplier[] = [];
    snapshot.forEach((doc) => {
      suppliers.push({ id: doc.id, ...doc.data() } as Supplier);
    });

    return suppliers;
  }

  static async getSupplier(businessId: string, supplierId: string): Promise<Supplier | null> {
    if (!db) return null;
    const ref = doc(db, "businesses", businessId, "suppliers", supplierId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Supplier;
  }

  /**
   * Fetches ledger entries for a supplier
   */
  static async getSupplierLedger(businessId: string, supplierId: string): Promise<SupplierLedgerEntry[]> {
    if (!db) throw new Error("Firestore not initialized");
    const ledgerRef = collection(db, "businesses", businessId, "suppliers", supplierId, "ledger");
    const snapshot = await getDocs(ledgerRef); // Ideally order by createdAt desc, but requires indexes
    
    const entries: SupplierLedgerEntry[] = [];
    snapshot.forEach((doc) => {
      entries.push({ id: doc.id, ...doc.data() } as SupplierLedgerEntry);
    });
    
    // Sort client-side for now to avoid needing composite indexes for the demo
    return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async createSupplier(
    businessId: string,
    data: Omit<Supplier, "id" | "currentBalanceMinor" | "isActive" | "createdAt" | "updatedAt">
  ): Promise<string> {
    if (!db) throw new Error("Firestore not initialized");

    const batch = writeBatch(db);
    const newRef = doc(collection(db, "businesses", businessId, "suppliers"));
    const now = new Date().toISOString();

    batch.set(newRef, {
      ...data,
      currentBalanceMinor: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await batch.commit();
    return newRef.id;
  }

  static async updateSupplier(
    businessId: string,
    supplierId: string,
    updates: Partial<Omit<Supplier, "id" | "currentBalanceMinor" | "createdAt" | "updatedAt">>
  ): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    
    const ref = doc(db, "businesses", businessId, "suppliers", supplierId);
    await updateDoc(ref, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Records a manual payment to a supplier, ensuring atomicity via runTransaction.
   */
  static async recordSupplierPayment(
    businessId: string,
    supplierId: string,
    amountMinor: number,
    userId: string,
    notes?: string
  ): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const supplierRef = doc(db, "businesses", businessId, "suppliers", supplierId);
    const ledgerRef = doc(collection(db, "businesses", businessId, "suppliers", supplierId, "ledger"));
    
    await runTransaction(db, async (transaction) => {
      const supplierDoc = await transaction.get(supplierRef);
      if (!supplierDoc.exists()) {
        throw new Error("Supplier does not exist");
      }

      const currentBalance = supplierDoc.data().currentBalanceMinor as number;
      const newBalance = currentBalance - amountMinor;

      // Log the payment
      const now = new Date().toISOString();
      const ledgerEntry: Omit<SupplierLedgerEntry, "id"> = {
        supplierId,
        type: "payment",
        amountMinor,
        referenceType: "payment",
        referenceId: notes, // Store notes here or add a notes field to ledger
        balanceBeforeMinor: currentBalance,
        balanceAfterMinor: newBalance,
        createdBy: userId,
        createdAt: now,
      };

      transaction.set(ledgerRef, ledgerEntry);

      // Update the supplier's balance
      transaction.update(supplierRef, {
        currentBalanceMinor: newBalance,
        updatedAt: now,
      });
    });
  }
}
