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
    const authUsers = await getAuth().listUsers(1000); // Fetch up to 1000 users
    
    // 3. Map to UserProfile format
    const users: UserProfile[] = authUsers.users.map(user => {
      return {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "N/A",
        createdAt: user.metadata.creationTime || new Date().toISOString(),
        updatedAt: user.metadata.lastSignInTime || new Date().toISOString()
      };
    });

    return { success: true, users };
  } catch (error: any) {
    console.error("Firebase Admin Error:", error);
    return { success: false, error: error.message || "An unknown server error occurred." };
  }
}
