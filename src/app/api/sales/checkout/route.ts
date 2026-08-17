import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { authorizeShopAccess } from '@/lib/server/authorize';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(token);
    } catch (err) {
      console.error("Token verification failed:", err);
      return NextResponse.json({ error: 'Unauthorized token' }, { status: 401 });
    }

    const body = await request.json();
    const { businessId, shopId, userId, data } = body;

    if (decodedToken.uid !== userId) {
      return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 });
    }

    const authCheck = await authorizeShopAccess(decodedToken, businessId, shopId, ['owner', 'manager', 'cashier']);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status || 403 });
    }


    // -----------------------------------------------------------------
    // SERVER-SIDE TRANSACTION LOGIC (Migrated from Client SDK)
    // -----------------------------------------------------------------
    const saleRef = adminDb.collection('businesses').doc(businessId).collection('shops').doc(shopId).collection('sales').doc();
    
    const dateStr = new Date().toISOString().slice(2, 7).replace("-", ""); // e.g., 2608
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;
    const now = new Date().toISOString();

    await adminDb.runTransaction(async (transaction: any) => {
      // 1. Read phase
      let customerDoc = null;
      let customerRef = null;
      const hasCustomer = Boolean(data.customerId && data.customerId !== "guest");
      const amountUnpaid = Math.max(0, data.grandTotalMinor - data.amountPaidMinor);
      const isCreditOrPartial = data.paymentStatus !== "paid" || amountUnpaid > 0 || data.paymentMethod === "credit";

      if (hasCustomer) {
        customerRef = adminDb.collection('businesses').doc(businessId).collection('shops').doc(shopId).collection('customers').doc(data.customerId);
        customerDoc = await transaction.get(customerRef);
        
        if (!customerDoc.exists) {
          const fallbackRef = adminDb.collection('businesses').doc(businessId).collection('customers').doc(data.customerId);
          const fallbackDoc = await transaction.get(fallbackRef);
          if (fallbackDoc.exists) {
            customerRef = fallbackRef;
            customerDoc = fallbackDoc;
          }
        }
      } else if (isCreditOrPartial) {
        throw new Error("Credit or partial sales require a valid Customer to be selected.");
      }

      // Read inventory and COST data securely
      const inventoryRefs = data.items.map((item: any) => 
        adminDb.collection('businesses').doc(businessId).collection('shops').doc(shopId).collection('inventory').doc(item.itemId)
      );
      
      const inventoryDocs = await Promise.all(inventoryRefs.map((ref: any) => transaction.get(ref)));
      
      const inventoryData = new Map<string, { quantity: number, costPriceMinor: number }>();
      
      // We must fetch the cost subdocuments!
      const costRefs = data.items.map((item: any) => 
        adminDb.collection('businesses').doc(businessId).collection('shops').doc(shopId).collection('inventory').doc(item.itemId).collection('cost').doc('data')
      );
      const costDocs = await Promise.all(costRefs.map((ref: any) => transaction.get(ref)));

      inventoryDocs.forEach((docSnap, index) => {
        if (!docSnap.exists) {
          throw new Error(`Inventory item ${data.items[index].name} not found in database.`);
        }
        const invData = docSnap.data()!;
        const currentQty = Number(invData.quantity);
        if (!Number.isFinite(currentQty)) {
          throw new Error(`Inventory item ${data.items[index].name} has invalid quantity data.`);
        }
        if (currentQty < data.items[index].quantity) {
          throw new Error(`Insufficient stock for ${data.items[index].name}. Requested: ${data.items[index].quantity}, Available: ${currentQty}`);
        }
        
        const costSnap = costDocs[index];
        const costPriceMinor = costSnap.exists ? (costSnap.data()?.costPriceMinor || 0) : (invData.costPriceMinor || 0);

        inventoryData.set(docSnap.id, { 
          quantity: currentQty, 
          costPriceMinor: costPriceMinor 
        });
      });

      // 2. Write phase
      const finalizedSaleItems = data.items.map((item: any) => {
        const inv = inventoryData.get(item.itemId)!;
        return {
          itemId: item.itemId,
          sku: item.sku || "N/A",
          name: item.name || "Product",
          quantity: Number(item.quantity || 1),
          unitPriceMinor: Number(item.unitPriceMinor || 0),
          discountMinor: Number(item.discountMinor || 0),
          costPriceMinor: Number(inv.costPriceMinor || 0),
          totalMinor: Number((item.unitPriceMinor * item.quantity) - item.discountMinor)
        };
      });

      const saleRecord = {
        id: saleRef.id,
        invoiceNumber,
        customerId: data.customerId ?? null,
        customerName: data.customerName || "Guest Customer",
        items: finalizedSaleItems,
        subtotalMinor: Number(data.subtotalMinor || 0),
        taxMinor: Number(data.taxMinor || 0),
        discountMinor: Number(data.discountMinor || 0),
        grandTotalMinor: Number(data.grandTotalMinor || 0),
        paymentMethod: data.paymentMethod || "cash",
        paymentStatus: data.paymentStatus || "paid",
        amountPaidMinor: Number(data.amountPaidMinor ?? 0),
        status: "completed",
        createdBy: userId || "system",
        createdAt: now,
      };

      // Sanitize undefined (optional for admin sdk, but safe to do)
      transaction.set(saleRef, JSON.parse(JSON.stringify(saleRecord)));

      for (const item of finalizedSaleItems) {
        const invRef = adminDb.collection('businesses').doc(businessId).collection('shops').doc(shopId).collection('inventory').doc(item.itemId);
        const invData = inventoryData.get(item.itemId)!;
        const newQty = invData.quantity - item.quantity;

        transaction.update(invRef, {
          quantity: newQty,
          updatedAt: now,
        });

        const movementRef = adminDb.collection('businesses').doc(businessId).collection('shops').doc(shopId).collection('stockMovements').doc();
        const movementLog = {
          itemId: item.itemId,
          businessId,
          shopId,
          type: "sale",
          quantityBefore: invData.quantity,
          quantityChange: -item.quantity,
          quantityAfter: newQty,
          referenceType: "sale",
          referenceId: saleRef.id,
          reason: `POS Sale ${invoiceNumber}`,
          createdBy: userId || "system",
          createdAt: now,
        };
        transaction.set(movementRef, JSON.parse(JSON.stringify(movementLog)));
      }

      if (hasCustomer && customerRef && customerDoc && customerDoc.exists) {
        const currentBalance = (customerDoc.data()?.currentBalanceMinor as number) ?? 0;
        const newBalance = currentBalance + amountUnpaid;

        transaction.update(customerRef, {
          currentBalanceMinor: newBalance,
          updatedAt: now,
        });

        const ledgerRef = adminDb.collection('businesses').doc(businessId).collection('shops').doc(shopId).collection('customers').doc(data.customerId).collection('ledger').doc();
        const ledgerEntry = {
          customerId: data.customerId,
          type: data.paymentMethod === "credit" ? "credit_sale" : (amountUnpaid > 0 ? "credit_sale" : "sale"),
          amountMinor: amountUnpaid > 0 ? amountUnpaid : data.grandTotalMinor,
          referenceType: "sale",
          referenceId: saleRef.id,
          balanceBeforeMinor: currentBalance,
          balanceAfterMinor: newBalance,
          createdBy: userId || "system",
          createdAt: now,
        };
        transaction.set(ledgerRef, JSON.parse(JSON.stringify(ledgerEntry)));
      }

      const auditRef = adminDb.collection('businesses').doc(businessId).collection('auditLogs').doc();
      const auditLog = {
        action: "sale_created",
        entityType: "sale",
        entityId: saleRef.id,
        actorId: userId,
        shopId: shopId,
        metadata: { invoiceNumber, amount: data.grandTotalMinor },
        createdAt: now,
      };
      transaction.set(auditRef, JSON.parse(JSON.stringify(auditLog)));
    });

    return NextResponse.json({ saleId: saleRef.id, invoiceNumber });

  } catch (error: any) {
    console.error("Sale checkout error:", error);
    return NextResponse.json({ error: error.message || 'Transaction failed' }, { status: 500 });
  }
}
