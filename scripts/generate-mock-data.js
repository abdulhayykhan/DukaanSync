const fs = require('fs');
const path = require('path');

// --- Configuration & Constants ---
const OUT_DIR = path.join(__dirname, '..', 'mock-data');
const DAYS_AGO = 30;

const SHOPS = [
  { code: 'MAIN', name: 'MetroMart Main Branch (Gulshan)' },
  { code: 'BR-02', name: 'MetroMart Express (Clifton)' },
  { code: 'BR-03', name: 'MetroMart Superstore (DHA)' }
];

const EMPLOYEES = ['Ahmed', 'Ali', 'Fatima', 'Ayesha', 'Usman', 'Zainab', 'Bilal', 'Sana', 'Fahad', 'Kamran', 'Kiran'];

const CATALOG_TEMPLATES = [
  // Groceries & Packaged Foods
  { sku: 'GRO-RICE-5KG', name: 'Rice (5kg)', category: 'Groceries', unit: 'pack', costPricePKR: 1200, retailPricePKR: 1600 },
  { sku: 'GRO-OIL-1L', name: 'Cooking Oil (1L)', category: 'Groceries', unit: 'pack', costPricePKR: 450, retailPricePKR: 580 },
  { sku: 'GRO-FLOUR-10KG', name: 'Wheat Flour (10kg)', category: 'Groceries', unit: 'pack', costPricePKR: 1400, retailPricePKR: 1800 },
  { sku: 'GRO-MILK-1L', name: 'Milk Pack (1L)', category: 'Groceries', unit: 'pack', costPricePKR: 250, retailPricePKR: 310 },
  { sku: 'GRO-BISCUIT-FAM', name: 'Biscuits (Family Pack)', category: 'Groceries', unit: 'pack', costPricePKR: 100, retailPricePKR: 135 },
  { sku: 'GRO-TEA-900G', name: 'Tea (900g)', category: 'Groceries', unit: 'pack', costPricePKR: 1300, retailPricePKR: 1700 },
  { sku: 'GRO-SUGAR-1KG', name: 'Sugar (1kg)', category: 'Groceries', unit: 'kg', costPricePKR: 140, retailPricePKR: 175 },
  { sku: 'GRO-LENTIL-1KG', name: 'Daal Chana (1kg)', category: 'Groceries', unit: 'kg', costPricePKR: 280, retailPricePKR: 360 },

  // Beverages & Snacks
  { sku: 'BEV-WATER-1.5L', name: 'Mineral Water (1.5L)', category: 'Beverages', unit: 'pcs', costPricePKR: 80, retailPricePKR: 110 },
  { sku: 'BEV-COLA-1.5L', name: 'Cola Soft Drink (1.5L)', category: 'Beverages', unit: 'pcs', costPricePKR: 150, retailPricePKR: 200 },
  { sku: 'BEV-JUICE-1L', name: 'Mango Juice (1L)', category: 'Beverages', unit: 'pcs', costPricePKR: 200, retailPricePKR: 270 },
  { sku: 'BEV-CHIPS-L', name: 'Potato Chips (Large)', category: 'Beverages', unit: 'pack', costPricePKR: 80, retailPricePKR: 115 },
  { sku: 'BEV-CHOC-BAR', name: 'Chocolate Bar (50g)', category: 'Beverages', unit: 'pcs', costPricePKR: 90, retailPricePKR: 130 },
  { sku: 'BEV-ENERGY-250ML', name: 'Energy Drink (250ml)', category: 'Beverages', unit: 'pcs', costPricePKR: 200, retailPricePKR: 280 },

  // Personal Care & Hygiene
  { sku: 'PER-SOAP', name: 'Hand Soap (100g)', category: 'Personal Care', unit: 'pcs', costPricePKR: 80, retailPricePKR: 120 },
  { sku: 'PER-SHAMPOO-200ML', name: 'Shampoo (200ml)', category: 'Personal Care', unit: 'pcs', costPricePKR: 350, retailPricePKR: 480 },
  { sku: 'PER-TOOTHPASTE', name: 'Toothpaste (120g)', category: 'Personal Care', unit: 'pcs', costPricePKR: 180, retailPricePKR: 250 },
  { sku: 'PER-TISSUE', name: 'Tissue Box (150s)', category: 'Personal Care', unit: 'pcs', costPricePKR: 160, retailPricePKR: 220 },
  { sku: 'PER-DETERGENT-1KG', name: 'Laundry Detergent (1kg)', category: 'Personal Care', unit: 'pack', costPricePKR: 400, retailPricePKR: 550 },
  { sku: 'PER-FACEWASH', name: 'Face Wash (100ml)', category: 'Personal Care', unit: 'pcs', costPricePKR: 250, retailPricePKR: 360 },

  // Electronics & Accessories
  { sku: 'ELE-USB-32GB', name: 'USB Flash Drive 32GB', category: 'Electronics', unit: 'pcs', costPricePKR: 800, retailPricePKR: 1300 },
  { sku: 'ELE-CABLE-C', name: 'Type-C Charging Cable', category: 'Electronics', unit: 'pcs', costPricePKR: 300, retailPricePKR: 550 },
  { sku: 'ELE-EARBUDS', name: 'Wireless Earbuds', category: 'Electronics', unit: 'pcs', costPricePKR: 1500, retailPricePKR: 2700 },
  { sku: 'ELE-POWERBANK', name: 'Power Bank (10000mAh)', category: 'Electronics', unit: 'pcs', costPricePKR: 3000, retailPricePKR: 4900 },
  { sku: 'ELE-CHARGER', name: 'Wall Charger (18W)', category: 'Electronics', unit: 'pcs', costPricePKR: 600, retailPricePKR: 1100 }
];

const KARACHI_NAMES = ["Ahmed", "Ali", "Fatima", "Hassan", "Ayesha", "Usman", "Zainab", "Bilal", "Sana", "Fahad", "Rabia", "Imran", "Nida", "Tariq", "Hira", "Kamran", "Sadia", "Zeeshan", "Kiran", "Noman", "Farhan", "Salman", "Mehwish", "Waqas"];
const LAST_NAMES = ["Khan", "Ahmed", "Syed", "Qureshi", "Ansari", "Sheikh", "Malik", "Rajput", "Baig", "Siddiqui"];

// --- Helpers ---
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysAgo));
  date.setHours(randomInt(8, 21), randomInt(0, 59), randomInt(0, 59));
  return date.toISOString();
};
const generateId = (prefix) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

// --- Generators ---

let allInventoryItems = [];
let allStockMovements = [];

function generateInventory() {
  allInventoryItems = [];
  allStockMovements = [];

  SHOPS.forEach(shop => {
    CATALOG_TEMPLATES.forEach(template => {
      const quantity = randomInt(15, 120);
      const reorderLevel = randomInt(5, 15);
      
      const invId = generateId('inv');
      const now = randomDate(DAYS_AGO + 5);
      
      const item = {
        id: invId,
        shopCode: shop.code,
        sku: template.sku,
        name: template.name,
        category: template.category,
        unit: template.unit,
        costPricePKR: template.costPricePKR,
        retailPricePKR: template.retailPricePKR,
        quantity: quantity,
        reorderLevel: reorderLevel,
        isActive: true,
        createdAt: now,
        updatedAt: now
      };
      
      allInventoryItems.push(item);
      
      // Initial Stock Movement
      allStockMovements.push({
        id: generateId('mov'),
        shopCode: shop.code,
        sku: template.sku,
        productName: template.name,
        type: 'initial',
        quantityBefore: 0,
        quantityChange: quantity,
        quantityAfter: quantity,
        reason: 'Initial store inventory upload',
        timestamp: now,
        createdAt: now
      });
    });
  });
  
  return allInventoryItems;
}

function generateCustomers(count) {
  const customers = [];
  for (let i = 0; i < count; i++) {
    const fName = randomChoice(KARACHI_NAMES);
    const lName = randomChoice(LAST_NAMES);
    const balance = Math.random() < 0.35 ? randomInt(2, 45) * 1000 : 0;
    
    customers.push({
      id: generateId('cust'),
      name: `${fName} ${lName}`,
      phone: `03${randomInt(0, 4)}${randomInt(0, 9)}${randomInt(1000000, 9999999)}`,
      email: `${fName.toLowerCase()}.${lName.toLowerCase()}${randomInt(1, 99)}@gmail.com`,
      initialOutstandingBalance: balance,
      currentBalancePKR: balance,
      customerType: Math.random() > 0.8 ? 'wholesale' : 'retail',
      isActive: true,
      createdAt: randomDate(90),
      updatedAt: randomDate(10)
    });
  }
  return customers;
}

function generateSuppliers() {
  const suppliers = [
    { name: "Unilever Pakistan", phone: "0800-13000", balance: 180000 },
    { name: "Nestlé Wholesale", phone: "0800-00000", balance: 120000 },
    { name: "Metro Logistics", phone: "0321-1234567", balance: 35000 },
    { name: "Tech Imports Karachi", phone: "0333-7654321", balance: 65000 },
    { name: "Shan Foods Distributor", phone: "0300-9998887", balance: 15000 },
    { name: "Reckitt Benckiser Dist.", phone: "0311-2223334", balance: 45000 },
    { name: "National Foods", phone: "0301-3334445", balance: 0 },
    { name: "Engro Foods", phone: "0322-4445556", balance: 50000 }
  ];
  
  return suppliers.map(s => ({
    id: generateId('sup'),
    name: s.name,
    phone: s.phone,
    email: `${s.name.split(' ')[0].toLowerCase()}@wholesale.com.pk`,
    initialPayableBalance: s.balance,
    currentBalancePKR: s.balance,
    isActive: true,
    createdAt: randomDate(120),
    updatedAt: randomDate(2)
  }));
}

function generateExpenses() {
  const expenses = [];
  
  // Total Target Expenses: ~Rs 300,000 for 30 days
  // Rent: Rs 50,000 x 3 = Rs 150,000
  // Utilities (K-Electric): Rs 25,000 x 3 = Rs 75,000
  // Salary / Maintenance: Rs 25,000 x 3 = Rs 75,000
  SHOPS.forEach(shop => {
    // 1. Rent (50k per branch)
    expenses.push({
      id: generateId('exp'),
      shopCode: shop.code,
      date: randomDate(5),
      category: "rent",
      description: `Monthly Branch Rent - ${shop.name}`,
      paymentMethod: "bank",
      amountPKR: 50000
    });
    
    // 2. K-Electric Bill (25k per branch)
    expenses.push({
      id: generateId('exp'),
      shopCode: shop.code,
      date: randomDate(12),
      category: "utilities",
      description: `K-Electric Commercial Bill - ${shop.name}`,
      paymentMethod: "bank",
      amountPKR: 25000
    });
    
    // 3. Staff Salary & Maintenance (25k per branch)
    expenses.push({
      id: generateId('exp'),
      shopCode: shop.code,
      date: randomDate(18),
      category: "salary",
      description: `Branch Staff Payroll Support - ${shop.name}`,
      paymentMethod: "bank",
      amountPKR: 18000
    });

    expenses.push({
      id: generateId('exp'),
      shopCode: shop.code,
      date: randomDate(22),
      category: "maintenance",
      description: `Store Equipment & AC Maintenance`,
      paymentMethod: "cash",
      amountPKR: 7000
    });
  });
  
  return expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function generateSales(count, customers) {
  const sales = [];
  
  // Target: 330 sales transactions totaling ~Rs 2,750,000 revenue
  for (let i = 0; i < count; i++) {
    const shop = randomChoice(SHOPS);
    const shopItems = allInventoryItems.filter(item => item.shopCode === shop.code);
    
    const numItems = randomInt(2, 6);
    const cart = [];
    let subtotal = 0;
    const saleDate = randomDate(DAYS_AGO);
    
    for (let j = 0; j < numItems; j++) {
      const invItem = randomChoice(shopItems);
      const qty = randomInt(1, 4);
      
      const itemTotal = invItem.retailPricePKR * qty;
      subtotal += itemTotal;
      
      cart.push({
        itemId: invItem.id,
        sku: invItem.sku,
        name: invItem.name,
        quantity: qty,
        unitCostPKR: invItem.costPricePKR,
        unitRetailPKR: invItem.retailPricePKR,
        discountPKR: 0,
        totalPKR: itemTotal
      });
      
      // Log stock movement for sale
      allStockMovements.push({
        id: generateId('mov'),
        shopCode: shop.code,
        sku: invItem.sku,
        productName: invItem.name,
        type: 'sale',
        quantityBefore: invItem.quantity,
        quantityChange: -qty,
        quantityAfter: Math.max(0, invItem.quantity - qty),
        reason: 'Customer Sale',
        timestamp: saleDate,
        createdAt: saleDate
      });
      invItem.quantity = Math.max(0, invItem.quantity - qty);
    }
    
    const discount = Math.random() > 0.85 ? randomInt(100, 300) : 0;
    const grandTotal = Math.max(0, subtotal - discount);
    
    const cust = Math.random() > 0.75 ? randomChoice(customers) : null;
    const paymentStatus = Math.random() > 0.8 ? "unpaid" : (Math.random() > 0.9 ? "partial" : "paid");

    sales.push({
      id: generateId('sale'),
      invoiceNumber: `INV-${shop.code}-${String(i+1001).padStart(5, '0')}`,
      shopCode: shop.code,
      customerId: cust ? cust.id : null,
      customerName: cust ? cust.name : "Walk-in Customer",
      items: cart,
      subtotalPKR: subtotal,
      discountPKR: discount,
      taxPKR: 0,
      grandTotalPKR: grandTotal,
      paymentStatus: paymentStatus,
      paymentMethod: paymentStatus === "unpaid" ? "credit" : randomChoice(["cash", "cash", "bank", "card", "easypaisa"]),
      cashierName: randomChoice(EMPLOYEES),
      timestamp: saleDate,
      date: saleDate,
      createdAt: saleDate
    });
  }
  
  return sales.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function generatePurchaseOrders(suppliers) {
  const purchases = [];
  const poCount = 18;

  for (let i = 0; i < poCount; i++) {
    const shop = randomChoice(SHOPS);
    const supplier = randomChoice(suppliers);
    const orderDate = randomDate(DAYS_AGO);
    const total = randomInt(25, 75) * 1000;
    const paymentStatus = Math.random() > 0.5 ? "unpaid" : "paid";

    purchases.push({
      id: generateId('po'),
      purchaseNumber: `PO-${shop.code}-${String(i+2001).padStart(5, '0')}`,
      shopCode: shop.code,
      supplierName: supplier.name,
      grandTotalPKR: total,
      paymentStatus: paymentStatus,
      paymentMethod: paymentStatus === "unpaid" ? "credit" : randomChoice(["bank", "cash"]),
      notes: "Stock Replenishment Order",
      date: orderDate,
      createdAt: orderDate
    });
  }

  return purchases.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function convertToCSV(arr) {
  if (!arr || arr.length === 0) return '';
  const headers = Object.keys(arr[0]);
  const rows = arr.map(obj => 
    headers.map(header => {
      let val = obj[header];
      if (typeof val === 'object' && val !== null) {
        val = JSON.stringify(val);
      }
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

// --- Main Execution ---
function main() {
  if (fs.existsSync(OUT_DIR)) {
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("Starting generation of MetroMart Retailers Mock Data...");

  const inventory = generateInventory();
  const customers = generateCustomers(20);
  const suppliers = generateSuppliers();
  const expenses = generateExpenses();
  const sales = generateSales(330, customers);
  const purchases = generatePurchaseOrders(suppliers);

  const datasets = {
    'inventory_items': inventory,
    'customers': customers,
    'suppliers': suppliers,
    'expenses': expenses,
    'sales_transactions': sales,
    'purchase_orders': purchases,
    'stock_movements': allStockMovements
  };

  const summary = [];

  for (const [basename, data] of Object.entries(datasets)) {
    const jsonPath = path.join(OUT_DIR, `${basename}.json`);
    const csvPath = path.join(OUT_DIR, `${basename}.csv`);
    
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.writeFileSync(csvPath, convertToCSV(data), 'utf-8');
    
    summary.push({ File: basename, Format: 'JSON & CSV', RecordCount: data.length });
  }

  console.log("\nMock Data Generation Complete! 🎉\n");
  console.table(summary);
  console.log(`\nFiles written to: ${OUT_DIR}`);
}

main();
