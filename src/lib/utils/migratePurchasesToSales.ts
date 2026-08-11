import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

/**
 * Migrates customer sales transactions that were mistakenly imported into the 'purchases'
 * collection over to the 'sales' collection, and deletes the legacy purchase records.
 */
export async function migratePurchasesToSales(businessId: string): Promise<{ convertedCount: number }> {
  if (!db || !businessId) return { convertedCount: 0 };

  let convertedCount = 0;

  try {
    const shopsSnap = await getDocs(collection(db, "businesses", businessId, "shops"));
    let shopIds = shopsSnap.docs.map((d) => d.id);
    if (shopIds.length === 0) shopIds = ["MAIN"];

    for (const shopId of shopIds) {
      const purchasesRef = collection(db, "businesses", businessId, "shops", shopId, "purchases");
      const salesRef = collection(db, "businesses", businessId, "shops", shopId, "sales");
      const purchasesSnap = await getDocs(purchasesRef);

      if (purchasesSnap.empty) continue;

      let batch = writeBatch(db);
      let batchOpsCount = 0;

      for (const purchaseDoc of purchasesSnap.docs) {
        const data = purchaseDoc.data();
        const supplierName = String(data.supplierName || data.supplierId || "").trim();
        const pNum = String(data.purchaseNumber || purchaseDoc.id || "").trim();

        // Detect if this record is a customer sale transaction
        const isSalesRecord =
          supplierName === "Walk-in Customer" ||
          supplierName.toLowerCase().includes("customer") ||
          supplierName.toLowerCase().includes("client") ||
          pNum.toUpperCase().startsWith("INV") ||
          !!data.invoiceNumber ||
          !!data.customerName;

        if (isSalesRecord) {
          const newSaleRef = doc(salesRef);
          batch.set(newSaleRef, {
            invoiceNumber: data.invoiceNumber || pNum || `INV-${Date.now()}`,
            customerName: data.customerName || supplierName || "Walk-in Customer",
            customerId: data.customerId || data.supplierId || "walk_in",
            items: data.items || [],
            subtotalMinor: data.subtotalMinor || data.grandTotalMinor || 0,
            taxMinor: data.taxMinor || 0,
            discountMinor: data.discountMinor || 0,
            grandTotalMinor: data.grandTotalMinor || 0,
            paymentMethod: data.paymentMethod || "cash",
            paymentStatus: data.paymentStatus || "unpaid",
            amountPaidMinor: data.amountPaidMinor || (data.paymentStatus === "paid" ? (data.grandTotalMinor || 0) : 0),
            status: data.status || "completed",
            notes: data.notes || "",
            businessId,
            shopId,
            createdBy: data.createdBy || "system",
            createdAt: data.createdAt || data.date || new Date().toISOString(),
          });

          batch.delete(purchaseDoc.ref);
          convertedCount++;
          batchOpsCount += 2;

          if (batchOpsCount >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            batchOpsCount = 0;
          }
        }
      }

      if (batchOpsCount > 0) {
        await batch.commit();
      }
    }
  } catch (err) {
    console.error("Error during purchases-to-sales migration:", err);
  }

  return { convertedCount };
}
