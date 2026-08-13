const fs = require('fs');
const path = require('path');

// Load .env.local natively without external dependencies
function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valParts] = trimmed.split('=');
        process.env[key.trim()] = valParts.join('=').trim();
      }
    });
  }
}
loadEnvLocal();

const { initializeApp, getApps } = require('firebase/app');
const { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} = require('firebase/auth');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  writeBatch, 
  setDoc
} = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.error("❌ Firebase API Key is missing in .env.local!");
  process.exit(1);
}

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const MOCK_DIR = path.join(__dirname, '..', 'mock-data');

// Primary User & Business Targets
const TARGET_USER_UID = "ZAS1Qn0FDyMKjYfjkmF8oS1Xyy32";
const TARGET_BUSINESS_ID = "U6LwBWsEqtwv7hTynIia";

const SHOPS = [
  { id: 'shop_main', code: 'MAIN', name: 'MetroMart Main Branch (Gulshan)' },
  { id: 'shop_br02', code: 'BR-02', name: 'MetroMart Express (Clifton)' },
  { id: 'shop_br03', code: 'BR-03', name: 'MetroMart Superstore (DHA)' }
];

async function authenticateSeedUser() {
  const email = "seed.admin@metromart.com";
  const password = "MetroMartSeed123!";

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log(`🔐 Authenticated as admin (${cred.user.uid})`);
    return cred.user;
  } catch (err) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        console.log(`🔐 Created & authenticated admin (${cred.user.uid})`);
        return cred.user;
      } catch (createErr) {
        console.error("Failed to create admin user:", createErr.message);
        throw createErr;
      }
    }
    throw err;
  }
}

async function purgeDocs(docs) {
  if (!docs || docs.length === 0) return 0;
  let count = 0;
  const CHUNK_SIZE = 400;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    count += chunk.length;
  }
  return count;
}

async function purgeCollectionRef(colRef) {
  try {
    const snap = await getDocs(colRef);
    if (snap.empty) return 0;
    return await purgeDocs(snap.docs);
  } catch (err) {
    console.error(`  - Notice: ${err.message}`);
    return 0;
  }
}

async function runPurgeAndSeed() {
  console.log("🚀 Starting DukaanSync Targeted Business Purge & Re-Seed...");
  console.log(`🎯 Target Business ID: [${TARGET_BUSINESS_ID}]`);
  console.log(`👤 Target User UID: [${TARGET_USER_UID}]`);

  // 0. Authenticate
  const seedUser = await authenticateSeedUser();

  const candidateBusinessIds = Array.from(new Set([
    TARGET_BUSINESS_ID,
    "biz_metromart",
    "biz_default",
    "metromart"
  ]));

  const targetCollections = [
    "sales",
    "purchases",
    "expenses",
    "inventory",
    "stockMovements",
    "stock_movements",
    "customers",
    "suppliers"
  ];

  // 1. Align User Profile & Permissions safely
  console.log("\n👤 Aligning Business Membership...");
  
  try {
    // Attempt updating target user profile (if permitted)
    await setDoc(doc(db, "users", TARGET_USER_UID), {
      businessId: TARGET_BUSINESS_ID,
      role: "owner",
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`  - Updated users/${TARGET_USER_UID} -> businessId: "${TARGET_BUSINESS_ID}"`);
  } catch (userErr) {
    console.log(`  - Notice: Could not update users/${TARGET_USER_UID} directly (${userErr.message})`);
  }

  // Process Each Business Candidate
  for (const businessId of candidateBusinessIds) {
    console.log(`\n==================================================`);
    console.log(`📌 Processing Business ID: [${businessId}]`);
    console.log(`==================================================`);

    // Grant seedUser initial member document (uid == request.auth.uid matches security rules)
    await setDoc(doc(db, "businesses", businessId, "members", seedUser.uid), {
      role: "owner",
      shopIds: SHOPS.map(s => s.id),
      joinedAt: new Date().toISOString()
    }, { merge: true });

    // Ensure Business doc exists
    await setDoc(doc(db, "businesses", businessId), {
      name: businessId === TARGET_BUSINESS_ID ? "Naeem Documentation" : "MetroMart Retailers",
      ownerId: businessId === TARGET_BUSINESS_ID ? TARGET_USER_UID : seedUser.uid,
      currency: "PKR",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Grant target user owner access
    try {
      await setDoc(doc(db, "businesses", businessId, "members", TARGET_USER_UID), {
        role: "owner",
        shopIds: SHOPS.map(s => s.id),
        joinedAt: new Date().toISOString()
      }, { merge: true });
    } catch {}

    // Setup shop mapping
    const shopIdMap = new Map();
    const shopsColRef = collection(db, "businesses", businessId, "shops");
    try {
      const existingShopsSnap = await getDocs(shopsColRef);
      existingShopsSnap.docs.forEach(d => {
        const data = d.data();
        if (data.code) shopIdMap.set(data.code, d.id);
      });
    } catch {}

    for (const shop of SHOPS) {
      let sId = shopIdMap.get(shop.code) || shop.id;
      const sRef = doc(db, "businesses", businessId, "shops", sId);
      await setDoc(sRef, {
        name: shop.name,
        code: shop.code,
        businessId: businessId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      shopIdMap.set(shop.code, sId);
    }

    console.log(`  - Shop Mapping for ${businessId}:`, Object.fromEntries(shopIdMap));

    // A. Purge stale documents
    console.log(`\n  🧹 Purging collections for [${businessId}]...`);
    let bizPurged = 0;
    for (const [code, sId] of shopIdMap.entries()) {
      // Customer ledgers
      try {
        const custSnap = await getDocs(collection(db, "businesses", businessId, "shops", sId, "customers"));
        for (const custDoc of custSnap.docs) {
          bizPurged += await purgeCollectionRef(collection(db, "businesses", businessId, "shops", sId, "customers", custDoc.id, "ledger"));
        }
      } catch {}

      // Supplier ledgers
      try {
        const supSnap = await getDocs(collection(db, "businesses", businessId, "shops", sId, "suppliers"));
        for (const supDoc of supSnap.docs) {
          bizPurged += await purgeCollectionRef(collection(db, "businesses", businessId, "shops", sId, "suppliers", supDoc.id, "ledger"));
        }
      } catch {}

      // Main subcollections
      for (const colName of targetCollections) {
        const purged = await purgeCollectionRef(collection(db, "businesses", businessId, "shops", sId, colName));
        if (purged > 0) {
          console.log(`    - Purged ${purged} docs from [shops/${sId}/${colName}]`);
          bizPurged += purged;
        }
      }
    }
    console.log(`  ✅ Purged ${bizPurged} total documents for [${businessId}]`);

    // B. Seed Fresh Clean Dataset
    console.log(`\n  🌱 Seeding clean dataset into [${businessId}]...`);

    // 1. Inventory Items
    const inventoryFile = path.join(MOCK_DIR, 'inventory_items.json');
    if (fs.existsSync(inventoryFile)) {
      const items = JSON.parse(fs.readFileSync(inventoryFile, 'utf-8'));
      let count = 0;
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const sId = shopIdMap.get(item.shopCode || 'MAIN') || Array.from(shopIdMap.values())[0];
        const invRef = doc(collection(db, "businesses", businessId, "shops", sId, "inventory"));
        
        const catName = (item.category || '').toLowerCase();
        let categoryId = "cat_general";
        if (catName.includes("grocer")) categoryId = "cat_groceries";
        else if (catName.includes("beverag")) categoryId = "cat_beverages";
        else if (catName.includes("personal") || catName.includes("care")) categoryId = "cat_cosmetics";
        else if (catName.includes("electr")) categoryId = "cat_electronics";

        const locationPreset = catName.includes("grocer") 
          ? "Room A - Shelf 2" 
          : catName.includes("beverag") 
          ? "Cold Room - Shelf 1" 
          : "Warehouse B - Shelf 4";

        const costMinor = Math.round((item.costPricePKR || 0) * 100);
        const retailMinor = Math.round((item.retailPricePKR || 0) * 100);
        const wholesaleMinor = Math.round(retailMinor * 0.85);

        await setDoc(invRef, {
          sku: item.sku || `SKU-${idx + 1000}`,
          name: item.name,
          categoryId: categoryId,
          unit: item.unit || "pcs",
          costPriceMinor: costMinor,
          retailPriceMinor: retailMinor,
          wholesalePriceMinor: wholesaleMinor,
          quantity: Number(item.quantity || 0),
          reorderLevel: Number(item.reorderLevel || 10),
          storageLocation: item.storageLocation || locationPreset,
          businessId,
          shopId: sId,
          createdBy: TARGET_USER_UID,
          isActive: true,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString()
        });
        count++;
      }
      console.log(`    - Seeded ${count} inventory items with storage locations & wholesale prices`);
    }

    // 2. Customers
    const customersFile = path.join(MOCK_DIR, 'customers.json');
    if (fs.existsSync(customersFile)) {
      const customers = JSON.parse(fs.readFileSync(customersFile, 'utf-8'));
      let count = 0;
      const defaultShopId = Array.from(shopIdMap.values())[0];

      for (let idx = 0; idx < customers.length; idx++) {
        const cust = customers[idx];
        const custRef = doc(collection(db, "businesses", businessId, "shops", defaultShopId, "customers"));
        const balanceMinor = Math.round((cust.initialOutstandingBalance || cust.currentBalancePKR || 0) * 100);
        const custType = (cust.customerType === "wholesale" || cust.type === "wholesaler" || idx % 3 === 0) ? "wholesaler" : "retailer";
        const cityLoc = cust.city || cust.location || (idx % 2 === 0 ? "Lahore" : "Karachi");

        await setDoc(custRef, {
          name: cust.name,
          phone: cust.phone || "",
          email: cust.email || "",
          type: custType,
          city: cityLoc,
          location: cityLoc,
          currentBalanceMinor: balanceMinor,
          isActive: true,
          createdAt: cust.createdAt || new Date().toISOString(),
          updatedAt: cust.updatedAt || new Date().toISOString()
        });

        if (balanceMinor > 0) {
          const ledgerRef = doc(collection(db, "businesses", businessId, "shops", defaultShopId, "customers", custRef.id, "ledger"));
          await setDoc(ledgerRef, {
            customerId: custRef.id,
            type: "credit_sale",
            amountMinor: balanceMinor,
            referenceType: "sale",
            balanceBeforeMinor: 0,
            balanceAfterMinor: balanceMinor,
            createdBy: TARGET_USER_UID,
            createdAt: cust.createdAt || new Date().toISOString()
          });
        }
        count++;
      }
      console.log(`    - Seeded ${count} customers with classification types & ledger balances`);
    }

    // 3. Suppliers
    const suppliersFile = path.join(MOCK_DIR, 'suppliers.json');
    if (fs.existsSync(suppliersFile)) {
      const suppliers = JSON.parse(fs.readFileSync(suppliersFile, 'utf-8'));
      let count = 0;
      const defaultShopId = Array.from(shopIdMap.values())[0];

      for (let idx = 0; idx < suppliers.length; idx++) {
        const sup = suppliers[idx];
        const supRef = doc(collection(db, "businesses", businessId, "shops", defaultShopId, "suppliers"));
        const balanceMinor = Math.round((sup.initialPayableBalance || sup.currentBalancePKR || 0) * 100);
        const cityLoc = sup.city || sup.location || (idx % 2 === 0 ? "Karachi" : "Lahore");

        await setDoc(supRef, {
          name: sup.name,
          phone: sup.phone || "",
          email: sup.email || "",
          city: cityLoc,
          location: cityLoc,
          currentBalanceMinor: balanceMinor,
          isActive: true,
          createdAt: sup.createdAt || new Date().toISOString(),
          updatedAt: sup.updatedAt || new Date().toISOString()
        });

        if (balanceMinor > 0) {
          const ledgerRef = doc(collection(db, "businesses", businessId, "shops", defaultShopId, "suppliers", supRef.id, "ledger"));
          await setDoc(ledgerRef, {
            supplierId: supRef.id,
            type: "credit_purchase",
            amountMinor: balanceMinor,
            referenceType: "purchase",
            balanceBeforeMinor: 0,
            balanceAfterMinor: balanceMinor,
            createdBy: TARGET_USER_UID,
            createdAt: sup.createdAt || new Date().toISOString()
          });
        }
        count++;
      }
      console.log(`    - Seeded ${count} suppliers with city locations & ledger balances`);
    }

    // 4. Expenses
    const expensesFile = path.join(MOCK_DIR, 'expenses.json');
    if (fs.existsSync(expensesFile)) {
      const expenses = JSON.parse(fs.readFileSync(expensesFile, 'utf-8'));
      let count = 0;

      for (const exp of expenses) {
        const sId = shopIdMap.get(exp.shopCode || 'MAIN') || Array.from(shopIdMap.values())[0];
        const expRef = doc(collection(db, "businesses", businessId, "shops", sId, "expenses"));

        await setDoc(expRef, {
          date: exp.date || new Date().toISOString(),
          category: (exp.category || "other").toLowerCase(),
          description: exp.description || "Branch Operating Expense",
          amountMinor: Math.round((exp.amountPKR || 0) * 100),
          paymentMethod: (exp.paymentMethod || "bank").toLowerCase(),
          businessId,
          shopId: sId,
          createdBy: TARGET_USER_UID,
          createdAt: exp.date || new Date().toISOString(),
          updatedAt: exp.date || new Date().toISOString()
        });
        count++;
      }
      console.log(`    - Seeded ${count} operating expenses`);
    }

    // 5. Sales Transactions
    const salesFile = path.join(MOCK_DIR, 'sales_transactions.json');
    if (fs.existsSync(salesFile)) {
      const sales = JSON.parse(fs.readFileSync(salesFile, 'utf-8'));
      let count = 0;

      for (let i = 0; i < sales.length; i += 300) {
        const chunk = sales.slice(i, i + 300);
        const batch = writeBatch(db);

        for (const sale of chunk) {
          const sId = shopIdMap.get(sale.shopCode || 'MAIN') || Array.from(shopIdMap.values())[0];
          const saleRef = doc(collection(db, "businesses", businessId, "shops", sId, "sales"));

          const grandTotalMinor = Math.round((sale.grandTotalPKR || 0) * 100);
          const subtotalMinor = Math.round((sale.subtotalPKR || sale.grandTotalPKR || 0) * 100);
          const discountMinor = Math.round((sale.discountPKR || 0) * 100);
          const pStatus = sale.paymentStatus || "paid";

          batch.set(saleRef, {
            invoiceNumber: sale.invoiceNumber || `INV-${Date.now()}`,
            customerName: sale.customerName || "Walk-in Customer",
            customerId: sale.customerId || "walk_in",
            items: (sale.items || []).map(it => ({
              itemId: it.itemId || "item_default",
              sku: it.sku || "SKU-DEF",
              name: it.name || "Default Item",
              quantity: it.quantity || 1,
              unitPriceMinor: Math.round((it.unitPricePKR || (it.unitPriceMinor ? it.unitPriceMinor / 100 : 500)) * 100),
              costPriceMinor: Math.round((it.costPricePKR || (it.costPriceMinor ? it.costPriceMinor / 100 : 350)) * 100),
              totalMinor: Math.round((it.totalPKR || (it.totalMinor ? it.totalMinor / 100 : 500)) * 100),
            })),
            subtotalMinor,
            taxMinor: 0,
            discountMinor,
            grandTotalMinor,
            paymentMethod: (sale.paymentMethod || "cash").toLowerCase(),
            paymentStatus: pStatus,
            amountPaidMinor: pStatus === "paid" ? grandTotalMinor : Math.round(grandTotalMinor * 0.5),
            status: "completed",
            cashierName: sale.cashierName || "Main Cashier",
            businessId,
            shopId: sId,
            createdBy: TARGET_USER_UID,
            createdAt: sale.timestamp || sale.date || new Date().toISOString()
          });
          count++;
        }
        await batch.commit();
      }
      console.log(`    - Seeded ${count} sales transactions`);
    }

    // 6. Purchase Orders
    const purchasesFile = path.join(MOCK_DIR, 'purchase_orders.json');
    if (fs.existsSync(purchasesFile)) {
      const purchases = JSON.parse(fs.readFileSync(purchasesFile, 'utf-8'));
      let count = 0;

      for (let idx = 0; idx < purchases.length; idx++) {
        const po = purchases[idx];
        const sId = shopIdMap.get(po.shopCode || 'MAIN') || Array.from(shopIdMap.values())[0];
        const poRef = doc(collection(db, "businesses", businessId, "shops", sId, "purchases"));

        const baseTotalMinor = Math.round((po.grandTotalPKR || 50000) * 100);
        const extraCostMinor = 150000; // PKR 1,500 shipping overhead
        const grandTotalMinor = baseTotalMinor + extraCostMinor;
        const pStatus = po.paymentStatus || "paid";

        await setDoc(poRef, {
          purchaseNumber: po.purchaseNumber || `PO-${idx + 1000}`,
          supplierId: po.supplierId || "sup_xxszhqz1v",
          supplierName: po.supplierName || "Unilever Pakistan",
          items: [
            {
              itemId: "item_po_01",
              sku: "GRO-RICE-5KG",
              name: "Rice (5kg)",
              quantity: 50,
              unitCostMinor: 120000,
              discountMinor: 0,
              totalMinor: 6000000,
            }
          ],
          subtotalMinor: baseTotalMinor,
          discountMinor: 0,
          extraCostMinor: extraCostMinor,
          extraCostsMinor: extraCostMinor,
          grandTotalMinor: grandTotalMinor,
          paymentMethod: (po.paymentMethod || "bank").toLowerCase(),
          paymentStatus: pStatus,
          amountPaidMinor: pStatus === "paid" ? grandTotalMinor : Math.round(grandTotalMinor * 0.5),
          status: "completed",
          notes: po.notes || "Stock Replenishment & Transport Overhead",
          businessId,
          shopId: sId,
          createdBy: TARGET_USER_UID,
          createdAt: po.date || new Date().toISOString()
        });
        count++;
      }
      console.log(`    - Seeded ${count} purchase orders with shipping overhead fees`);
    }

    // 7. Stock Movements Audit
    const movementsFile = path.join(MOCK_DIR, 'stock_movements.json');
    if (fs.existsSync(movementsFile)) {
      const movements = JSON.parse(fs.readFileSync(movementsFile, 'utf-8'));
      let count = 0;

      for (let i = 0; i < movements.length; i += 300) {
        const chunk = movements.slice(i, i + 300);
        const batch = writeBatch(db);

        for (const mov of chunk) {
          const sId = shopIdMap.get(mov.shopCode || 'MAIN') || Array.from(shopIdMap.values())[0];
          const movRef = doc(collection(db, "businesses", businessId, "shops", sId, "stockMovements"));

          batch.set(movRef, {
            itemId: mov.itemId || "inv_79x52rwly",
            sku: mov.sku || "GRO-RICE-5KG",
            productName: mov.productName || "Rice (5kg)",
            type: mov.type || "sale",
            quantityBefore: Number(mov.quantityBefore || 50),
            quantityChange: Number(mov.quantityChange || -2),
            quantityAfter: Number(mov.quantityAfter || 48),
            reason: mov.reason || "POS Sale Deduction",
            businessId,
            shopId: sId,
            createdBy: TARGET_USER_UID,
            createdAt: mov.timestamp || mov.createdAt || new Date().toISOString()
          });
          count++;
        }
        await batch.commit();
      }
      console.log(`    - Seeded ${count} stock movement audit records`);
    }

    console.log(`✅ Finished seeding business: [${businessId}]`);
  }

  console.log(`\n🎉 Targeted Purge & Seed Finished Successfully for User [${TARGET_USER_UID}] and Business [${TARGET_BUSINESS_ID}]! 🎉`);
}

runPurgeAndSeed().catch((err) => {
  console.error("❌ Script execution failed:", err);
  process.exit(1);
});
