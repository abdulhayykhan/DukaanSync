import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { ShopFormData } from "@/lib/validation/shop";

export class ShopService {
  /**
   * Creates a new shop and assigns it to the user's member record.
   */
  static async createShop(
    businessId: string,
    userId: string,
    data: ShopFormData
  ): Promise<string> {
    if (!db) throw new Error("Firestore not initialized");

    // 1. Check if shop code is unique within the business
    const shopsRef = collection(db, "businesses", businessId, "shops");
    const q = query(shopsRef, where("code", "==", data.code));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      throw new Error(`A shop with code ${data.code} already exists.`);
    }

    // 2. Prepare batch write
    const batch = writeBatch(db);

    // Create the shop doc
    const newShopRef = doc(collection(db, "businesses", businessId, "shops"));
    batch.set(newShopRef, {
      ...data,
      status: "active",
      isMain: false, // New shops are never main by default
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // We must also update the member's shopIds array if they aren't the owner.
    // However, since we are only letting owners/managers create shops, 
    // owners already have access to all shops via `isBusinessOwner` rule.
    // But to keep `ShopContext` generic and ensure managers get immediate access,
    // we append it to their array.
    const memberRef = doc(db, "businesses", businessId, "members", userId);
    
    // Note: To append to an array safely in a batch without reading, we'd use arrayUnion.
    // But since we can't easily do arrayUnion with batch.set (unless merge is true),
    // we'll use batch.update for arrayUnion.
    // First, let's just do an updateDoc with arrayUnion if they are a manager.
    // Actually, Firebase's `arrayUnion` can be used via `updateDoc`. 
    // For a batch:
    const { arrayUnion } = await import("firebase/firestore");
    batch.update(memberRef, {
      shopIds: arrayUnion(newShopRef.id),
      updatedAt: new Date().toISOString(),
    });

    await batch.commit();

    return newShopRef.id;
  }

  /**
   * Updates an existing shop's details.
   */
  static async updateShop(
    businessId: string,
    shopId: string,
    updates: Partial<ShopFormData>
  ): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const shopRef = doc(db, "businesses", businessId, "shops", shopId);
    await updateDoc(shopRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Toggles the active/inactive status of a shop.
   * Prevents deactivating a main shop.
   */
  static async toggleShopStatus(
    businessId: string,
    shopId: string,
    currentStatus: "active" | "inactive",
    isMain: boolean
  ): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    if (isMain && currentStatus === "active") {
      throw new Error("Cannot deactivate the main branch.");
    }

    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const shopRef = doc(db, "businesses", businessId, "shops", shopId);
    
    await updateDoc(shopRef, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Sets a shop as the main branch, atomicaly demoting the current main branch.
   */
  static async setMainShop(businessId: string, newMainShopId: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const batch = writeBatch(db);
    const shopsRef = collection(db, "businesses", businessId, "shops");

    // Get all shops to find the current main shop(s)
    const snapshot = await getDocs(shopsRef);

    snapshot.docs.forEach((shopDoc) => {
      const data = shopDoc.data();
      const ref = shopDoc.ref;

      if (shopDoc.id === newMainShopId) {
        // Set new main
        batch.update(ref, { 
          isMain: true,
          updatedAt: new Date().toISOString()
        });
      } else if (data.isMain === true) {
        // Demote old main
        batch.update(ref, { 
          isMain: false,
          updatedAt: new Date().toISOString()
        });
      }
    });

    await batch.commit();
  }
}
