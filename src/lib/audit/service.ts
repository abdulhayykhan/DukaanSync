import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  
  orderBy,
  limit,
  setDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { AuditLog, AuditAction, AuditEntityType } from "@/types";

export class AuditLogService {
  
  /**
   * Appends an audit log to the active shop's append-only audit trail.
   */
  static async createLog(
    businessId: string, 
    shopId: string,
    action: AuditAction,
    actorId: string,
    entityType: AuditEntityType,
    entityId: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    if (!db) throw new Error("Firestore not initialized");

    const ref = doc(collection(db, "businesses", businessId, "shops", shopId, "auditLogs"));
    const now = new Date().toISOString();

    const newLog: Omit<AuditLog, "id"> = {
      action,
      actorId,
      entityType,
      entityId,
      shopId,
      metadata,
      createdAt: now
    };

    await setDoc(ref, newLog);
    return ref.id;
  }

  /**
   * Used as a helper inside transaction boundaries.
   * Takes a transaction object and writes the audit log atomically.
   */
  static getTransactionRef(businessId: string, shopId: string) {
    if (!db) throw new Error("Firestore not initialized");
    return doc(collection(db, "businesses", businessId, "shops", shopId, "auditLogs"));
  }

  /**
   * Retrieves the most recent audit logs for a shop. Only owners/managers should be able to view these.
   */
  static async getLogs(
    businessId: string,
    shopId: string,
    maxLimit: number = 100
  ): Promise<AuditLog[]> {
    if (!db) throw new Error("Firestore not initialized");

    const q = query(
      collection(db, "businesses", businessId, "shops", shopId, "auditLogs"),
      orderBy("createdAt", "desc"),
      limit(maxLimit)
    );

    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
  }
}
