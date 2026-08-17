"use server";

import "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import { UserProfile } from "@/types";

export async function getAllUsersAction(adminUid: string) {
  try {
    // 1. Verify adminUid is in the seed admins
    const isSeedAdmin = (process.env.NEXT_PUBLIC_SEED_ADMIN_UIDS || "").includes(adminUid);
    if (!isSeedAdmin) {
      return { success: false, error: "Unauthorized: You are not an admin." };
    }

    // 2. Fetch all users from Firebase Auth
    const authUsers = await getAuth().listUsers(1000); 
    
    // 3. Map to UserProfile format (ensure deep copy of plain strings)
    const users: UserProfile[] = authUsers.users.map(user => {
      return {
        uid: String(user.uid),
        email: String(user.email || ""),
        displayName: String(user.displayName || "N/A"),
        createdAt: String(user.metadata.creationTime || new Date().toISOString()),
        updatedAt: String(user.metadata.lastSignInTime || new Date().toISOString())
      };
    });

    return { success: true, users };
  } catch (error: any) {
    console.error("Firebase Admin Error:", error);
    // Explicitly return a serializable string instead of passing raw error properties
    return { success: false, error: String(error?.message || "An unknown server error occurred.") };
  }
}
