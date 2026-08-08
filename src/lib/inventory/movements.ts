import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { StockMovement } from "@/types";

export class StockMovementService {
  /**
   * Fetches recent stock movements for a specific shop.
   * Requires a composite index in Firestore for optimal ordering.
   */
  static async getRecentMovements(
    businessId: string,
    shopId: string,
    maxLimit: number = 100
  ): Promise<StockMovement[]> {
    if (!db) throw new Error("Firestore not initialized");

    const movementsRef = collection(db, "businesses", businessId, "shops", shopId, "movements");
    
    // We are ordering by createdAt descending. 
    // In a real prod setup with high volume, we should paginate.
    const q = query(
      movementsRef, 
      orderBy("createdAt", "desc"),
      limit(maxLimit)
    );
    
    const snapshot = await getDocs(q);

    const movements: StockMovement[] = [];
    snapshot.forEach((doc) => {
      movements.push({ id: doc.id, ...doc.data() } as StockMovement);
    });

    return movements;
  }
}
