import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export interface BusinessMember {
  uid: string;
  email: string;
  role: "owner" | "manager" | "cashier" | "inventory_manager";
  joinedAt?: any;
}

export class UserService {
  /**
   * Fetches team members for a given business with null-safety and error catching.
   */
  static async getTeamMembers(businessId: string): Promise<BusinessMember[]> {
    if (!db || !businessId) return [];

    try {
      const membersRef = collection(db, "businesses", businessId, "members");
      const snapshot = await getDocs(membersRef);
      const membersData: BusinessMember[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        membersData.push({
          uid: docSnap.id,
          email: data.email || docSnap.id || "Team Member",
          role: data.role || "cashier",
          joinedAt: data.joinedAt || null,
        });
      });

      return membersData;
    } catch (err: any) {
      console.error("Failed to fetch team members in UserService:", err?.message || err);
      return [];
    }
  }
}
