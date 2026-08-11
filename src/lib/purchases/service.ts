import { collection, query, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Purchase } from "@/types";

export class PurchaseService {
  /**
   * Fetches recent purchases for a shop.
   */
  static async getPurchases(
    businessId: string,
    shopId: string,
    limitCount: number = 100
  ): Promise<Purchase[]> {
    if (!db) throw new Error("Firestore not initialized");
    
    const purchasesRef = collection(db, "businesses", businessId, "shops", shopId, "purchases");
    const q = query(purchasesRef, orderBy("createdAt", "desc"), limit(limitCount));
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Purchase[];
  }
}
