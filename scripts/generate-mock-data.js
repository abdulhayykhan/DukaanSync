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
  { sku: 'GRO-RICE-5KG', name: 'Rice (5kg)', category: 'Groceries & Packaged Foods', unit: 'pack', costPricePKR: 1200, retailPricePKR: 1500 },
  { sku: 'GRO-OIL-1L', name: 'Cooking Oil (1L)', category: 'Groceries & Packaged Foods', unit: 'pack', costPricePKR: 450, retailPricePKR: 520 },
  { sku: 'GRO-FLOUR-10KG', name: 'Wheat Flour (10kg)', category: 'Groceries & Packaged Foods', unit: 'pack', costPricePKR: 1400, retailPricePKR: 1600 },
  { sku: 'GRO-MILK-1L', name: 'Milk Pack (1L)', category: 'Groceries & Packaged Foods', unit: 'pack', costPricePKR: 250, retailPricePKR: 280 },
  { sku: 'GRO-BISCUIT-FAM', name: 'Biscuits (Family Pack)', category: 'Groceries & Packaged Foods', unit: 'pack', costPricePKR: 100, retailPricePKR: 120 },
  { sku: 'GRO-TEA-900G', name: 'Tea (900g)', category: 'Groceries & Packaged Foods', unit: 'pack', costPricePKR: 1300, retailPricePKR: 1550 },
  { sku: 'GRO-SUGAR-1KG', name: 'Sugar (1kg)', category: 'Groceries & Packaged Foods', unit: 'kg', costPricePKR: 140, retailPricePKR: 160 },
  { sku: 'GRO-LENTIL-1KG', name: 'Daal Chana (1kg)', category: 'Groceries & Packaged Foods', unit: 'kg', costPricePKR: 280, retailPricePKR: 320 },

  // Beverages & Snacks
  { sku: 'BEV-WATER-1.5L', name: 'Mineral Water (1.5L)', category: 'Beverages & Snacks', unit: 'pcs', costPricePKR: 80, retailPricePKR: 100 },
  { sku: 'BEV-COLA-1.5L', name: 'Cola Soft Drink (1.5L)', category: 'Beverages & Snacks', unit: 'pcs', costPricePKR: 150, retailPricePKR: 180 },
  { sku: 'BEV-JUICE-1L', name: 'Mango Juice (1L)', category: 'Beverages & Snacks', unit: 'pcs', costPricePKR: 200, retailPricePKR: 240 },
  { sku: 'BEV-CHIPS-L', name: 'Potato Chips (Large)', category: 'Beverages & Snacks', unit: 'pack', costPricePKR: 80, retailPricePKR: 100 },
  { sku: 'BEV-CHOC-BAR', name: 'Chocolate Bar (50g)', category: 'Beverages & Snacks', unit: 'pcs', costPricePKR: 90, retailPricePKR: 120 },
  { sku: 'BEV-ENERGY-250ML', name: 'Energy Drink (250ml)', category: 'Beverages & Snacks', unit: 'pcs', costPricePKR: 200, retailPricePKR: 250 },

  // Personal Care & Hygiene
  { sku: 'PER-SOAP', name: 'Hand Soap (100g)', category: 'Personal Care & Hygiene', unit: 'pcs', costPricePKR: 80, retailPricePKR: 110 },
  { sku: 'PER-SHAMPOO-200ML', name: 'Shampoo (200ml)', category: 'Personal Care & Hygiene', unit: 'pcs', costPricePKR: 350, retailPricePKR: 450 },
  { sku: 'PER-TOOTHPASTE', name: 'Toothpaste (120g)', category: 'Personal Care & Hygiene', unit: 'pcs', costPricePKR: 180, retailPricePKR: 230 },
  { sku: 'PER-TISSUE', name: 'Tissue Box (150s)', category: 'Personal Care & Hygiene', unit: 'pcs', costPricePKR: 160, retailPricePKR: 200 },
  { sku: 'PER-DETERGENT-1KG', name: 'Laundry Detergent (1kg)', category: 'Personal Care & Hygiene', unit: 'pack', costPricePKR: 400, retailPricePKR: 500 },
  { sku: 'PER-FACEWASH', name: 'Face Wash (100ml)', category: 'Personal Care & Hygiene', unit: 'pcs', costPricePKR: 250, retailPricePKR: 320 },

  // Electronics & Accessories
  { sku: 'ELE-USB-32GB', name: 'USB Flash Drive 32GB', category: 'Electronics & Accessories', unit: 'pcs', costPricePKR: 800, retailPricePKR: 1200 },
  { sku: 'ELE-CABLE-C', name: 'Type-C Charging Cable', category: 'Electronics & Accessories', unit: 'pcs', costPricePKR: 300, retailPricePKR: 500 },
  { sku: 'ELE-EARBUDS', name: 'Wireless Earbuds', category: 'Electronics & Accessories', unit: 'pcs', costPricePKR: 1500, retailPricePKR: 2500 },
  { sku: 'ELE-POWERBANK', name: 'Power Bank (10000mAh)', category: 'Electronics & Accessories', unit: 'pcs', costPricePKR: 3000, retailPricePKR: 4500 },
  { sku: 'ELE-CHARGER', name: 'Wall Charger (18W)', category: 'Electronics & Accessories', unit: 'pcs', costPricePKR: 600, retailPricePKR: 1000 }
];

const KARACHI_NAMES = ["Ahmed", "Ali", "Fatima", "Hassan", "Ayesha", "Usman", "Zainab", "Bilal", "Sana", "Fahad", "Rabia", "Imran", "Nida", "Tariq", "Hira", "Kamran", "Sadia", "Zeeshan", "Kiran", "Noman", "Farhan", "Salman", "Mehwish", "Waqas"];
const LAST_NAMES = ["Khan", "Ahmed", "Syed", "Qureshi", "Ansari", "Sheikh", "Malik", "Rajput", "Baig", "Siddiqui"];

// --- Helpers ---
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysAgo));
  date.setHours(randomInt(8, 23), randomInt(0, 59), randomInt(0, 59));
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
      const quantity = randomInt(10, 100);
      const reorderLevel = randomInt(5, 20);
      
      const invId = generateId('inv');
      const now = randomDate(DAYS_AGO + 10);
      
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
        itemId: invId,
        type: 'initial',
        quantityBefore: 0,
        quantityChange: quantity,
        quantityAfter: quantity,
        reason: 'Initial setup',
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
    const balance = Math.random() < 0.4 ? randomInt(1, 50) * 1000 : 0;
    
    customers.push({
      id: generateId('cust'),
      name: `${fName} ${lName}`,
      phone: `03${randomInt(0, 4)}${randomInt(0, 9)}${randomInt(1000000, 9999999)}`,
      email: Math.random() < 0.3 ? `${fName.toLowerCase()}.${lName.toLowerCase()}${randomInt(1, 99)}@gmail.com` : "",
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
    { name: "Unilever Pakistan", phone: "0800-13000", balance: randomInt(50000, 250000) },
    { name: "Nestlé Wholesale", phone: "0800-00000", balance: randomInt(30000, 150000) },
    { name: "Metro Logistics", phone: "0321-1234567", balance: randomInt(10000, 50000) },
    { name: "Tech Imports Karachi", phone: "0333-7654321", balance: randomInt(0, 80000) },
    { name: "Shan Foods Distributor", phone: "0300-9998887", balance: randomInt(5000, 20000) },
    { name: "Reckitt Benckiser Dist.", phone: "0311-2223334", balance: randomInt(15000, 60000) },
    { name: "National Foods", phone: "0301-3334445", balance: randomInt(0, 10000) },
    { name: "Engro Foods", phone: "0322-4445556", balance: randomInt(20000, 90000) }
  ];
  
  return suppliers.map(s => ({
    id: generateId('sup'),
    name: s.name,
    phone: s.phone,
    email: `${s.name.split(' ')[0].toLowerCase()}@wholesale.com.pk`,
    currentBalancePKR: s.balance,
    isActive: true,
    createdAt: randomDate(120),
    updatedAt: randomDate(2)
  }));
}

function generateExpenses() {
  const expenses = [];
  const categories = ["Rent", "Electricity", "Staff Salary", "Cleaning Supplies", "Maintenance"];
  
  SHOPS.forEach(shop => {
    // Fixed monthly per branch
    expenses.push({
      id: generateId('exp'),
      shopCode: shop.code,
      date: randomDate(5),
      category: "Rent",
      description: "Monthly Shop Rent",
      paymentMethod: "bank",
      amountPKR: randomInt(50000, 150000)
    });
    
    expenses.push({
      id: generateId('exp'),
      shopCode: shop.code,
      date: randomDate(10),
      category: "Electricity",
      description: "K-Electric Bill",
      paymentMethod: "bank",
      amountPKR: randomInt(20000, 80000)
    });
    
    // Random branch expenses
    for (let i = 0; i < randomInt(5, 12); i++) {
      const cat = randomChoice(["Cleaning Supplies", "Maintenance"]);
      let amount = (cat === "Cleaning Supplies") ? randomInt(1000, 5000) : randomInt(3000, 15000);
      
      expenses.push({
        id: generateId('exp'),
        shopCode: shop.code,
        date: randomDate(DAYS_AGO),
        category: cat,
        description: `${cat} for ${shop.name}`,
        paymentMethod: randomChoice(["cash", "cash", "easypaisa"]),
        amountPKR: amount
      });
    }
  });
  
  return expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function generateSales(count, customers) {
  const sales = [];
  for (let i = 0; i < count; i++) {
    const shop = randomChoice(SHOPS);
    const shopItems = allInventoryItems.filter(item => item.shopCode === shop.code);
    
    const numItems = randomInt(1, 6);
    const cart = [];
    let subtotal = 0;
    const saleDate = randomDate(DAYS_AGO);
    
    for (let j = 0; j < numItems; j++) {
      const invItem = randomChoice(shopItems);
      const qty = randomInt(1, 3);
      
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
        itemId: invItem.id,
        type: 'sale',
        quantityBefore: invItem.quantity,
        quantityChange: -qty,
        quantityAfter: invItem.quantity - qty,
        reason: 'Customer Sale',
        createdAt: saleDate
      });
      invItem.quantity -= qty; // update current stock
    }
    
    const discount = Math.random() > 0.85 ? randomInt(50, 200) : 0;
    const grandTotal = Math.max(0, subtotal - discount);
    
    // Assign customer 20% of the time
    const cust = Math.random() > 0.8 ? randomChoice(customers) : null;
    
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
      paymentMethod: randomChoice(["cash", "cash", "cash", "card", "credit"]),
      cashierName: randomChoice(EMPLOYEES),
      timestamp: saleDate
    });
  }
  
  return sales.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function convertToCSV(arr) {
  if (!arr || arr.length === 0) return '';
  const headers = Object.keys(arr[0]);
  const rows = arr.map(obj => 
    headers.map(header => {
      let val = obj[header];
      if (typeof val === 'object' && val !== null) {
        val = JSON.stringify(val); // e.g. items array
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
  const sales = generateSales(250, customers);

  const datasets = {
    'inventory_items': inventory,
    'customers': customers,
    'suppliers': suppliers,
    'expenses': expenses,
    'sales_transactions': sales,
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
