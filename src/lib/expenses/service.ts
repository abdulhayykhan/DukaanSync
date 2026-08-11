import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  writeBatch,
  query, 
  where,
  orderBy,
  QueryConstraint
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import type { Expense, ExpenseCategory } from "@/types";
import type { BulkImportResult } from "@/components/ui/BulkImportModal";

export interface ExpenseImportPayload {
  date: string;
  category: ExpenseCategory;
  description: string;
  amountMinor: number;
  paymentMethod: "cash" | "bank" | "card";
}

export class ExpenseService {
  /**
   * Fetch all expenses for a specific shop, optionally filtered by a date range.
   */
  static async getExpenses(
    businessId: string, 
    shopId: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<Expense[]> {
    if (!db) throw new Error("Firestore not initialized");
    
    const constraints: QueryConstraint[] = [orderBy("date", "desc")];
    
    if (startDate) constraints.push(where("date", ">=", startDate));
    if (endDate) constraints.push(where("date", "<=", endDate));
    
    const q = query(
      collection(db, "businesses", businessId, "shops", shopId, "expenses"),
      ...constraints
    );
    
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
  }

  /**
   * Create a new expense.
   */
  static async createExpense(
    businessId: string, 
    shopId: string, 
    data: Omit<Expense, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    if (!db) throw new Error("Firestore not initialized");
    
    const ref = doc(collection(db, "businesses", businessId, "shops", shopId, "expenses"));
    const now = new Date().toISOString();
    
    const newExpense: Omit<Expense, "id"> = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    
    await setDoc(ref, newExpense);
    return ref.id;
  }

  /**
   * Update an existing expense.
   */
  static async updateExpense(
    businessId: string,
    shopId: string,
    expenseId: string,
    data: Partial<Omit<Expense, "id" | "createdBy" | "createdAt" | "updatedAt">>
  ): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    
    const ref = doc(db, "businesses", businessId, "shops", shopId, "expenses", expenseId);
    await updateDoc(ref, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Delete an expense.
   */
  static async deleteExpense(
    businessId: string,
    shopId: string,
    expenseId: string
  ): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    
    const ref = doc(db, "businesses", businessId, "shops", shopId, "expenses", expenseId);
    await deleteDoc(ref);
  }

  /**
   * Bulk imports expense records from a parsed CSV/Excel payload.
   * Writes in chunks of 400 to stay under Firestore batch limits.
   */
  static async bulkImportExpenses(
    businessId: string,
    shopId: string,
    rows: ExpenseImportPayload[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<BulkImportResult> {
    if (!db) throw new Error("Firestore not initialized");

    const CHUNK_SIZE = 400;
    let successCount = 0;
    const errors: string[] = [];
    const uid = auth?.currentUser?.uid || "system";
    const expensesRef = collection(db, "businesses", businessId, "shops", shopId, "expenses");
    const total = rows.length;

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      const now = new Date().toISOString();

      for (const row of chunk) {
        const ref = doc(expensesRef);
        batch.set(ref, {
          ...row,
          businessId,
          shopId,
          createdBy: uid,
          createdAt: now,
          updatedAt: now,
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
