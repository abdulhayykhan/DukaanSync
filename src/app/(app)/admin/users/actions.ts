"use server";

import { getAuth } from "firebase-admin/auth";
import { UserProfile } from "@/types";

export async function getAllUsersAction(adminUid: string) {
  // 1. Verify adminUid is in the seed admins
  const isSeedAdmin = (process.env.NEXT_PUBLIC_SEED_ADMIN_UIDS || "").includes(adminUid);
  if (!isSeedAdmin) {
    throw new Error("Unauthorized");
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
}
