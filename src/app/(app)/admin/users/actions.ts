"use server";

import { adminDb } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";

export async function repairUsersAction(adminUid: string) {
  // 1. Verify adminUid is in the seed admins
  const isSeedAdmin = (process.env.NEXT_PUBLIC_SEED_ADMIN_UIDS || "").includes(adminUid);
  if (!isSeedAdmin) {
    throw new Error("Unauthorized");
  }

  // 2. Fetch all users from Firestore
  const usersSnap = await adminDb.collection("users").get();
  
  // 3. For each user, get auth record and update
  let updatedCount = 0;
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    if (!data.email || !data.displayName) {
      try {
        const authRecord = await getAuth().getUser(doc.id);
        await doc.ref.update({
          email: authRecord.email || "",
          displayName: authRecord.displayName || "",
          createdAt: authRecord.metadata.creationTime || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        updatedCount++;
      } catch (err) {
        console.error("Failed to repair user", doc.id, err);
      }
    }
  }

  return { success: true, count: updatedCount };
}
