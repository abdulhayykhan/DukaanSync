import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where,
  orderBy,
  QueryConstraint
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Expense } from "@/types";

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
}
