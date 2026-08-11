const fs = require('fs');
const path = require('path');

// --- Configuration & Constants ---
const OUT_DIR = path.join(__dirname, '..', 'mock-data');
const DAYS_AGO = 30;

// Employees
const EMPLOYEES = [
  { name: 'Ashar', role: 'Night Operator' },
  { name: 'Azan', role: 'Night Typist' },
  { name: 'Omar', role: 'Night Manager / Biometrics Specialist' },
  { name: 'Ali', role: 'Night Assistant' },
  { name: 'Hamza', role: 'Day Operator' },
  { name: 'Saqib', role: 'Day Operator' },
  { name: 'Abdi', role: 'IT Manager' }
];

// Product Catalog (Prices in PKR)
const CATALOG = [
  { sku: 'PRINT-BW', name: 'Print Out (Black & White)', category: 'Printing', unit: 'pcs', costPrice: 5, retailPrice: 20 },
  { sku: 'PRINT-COL', name: 'Print Out (Color)', category: 'Printing', unit: 'pcs', costPrice: 15, retailPrice: 50 },
  { sku: 'COPY-BW', name: 'Photo Copy (Black)', category: 'Printing', unit: 'pcs', costPrice: 3, retailPrice: 10 },
  { sku: 'COPY-COL', name: 'Photo Copy (Color)', category: 'Printing', unit: 'pcs', costPrice: 15, retailPrice: 50 },
  { sku: 'CNIC-COPY', name: 'CNIC Copy (4 / 8 per page)', category: 'Printing', unit: 'pcs', costPrice: 5, retailPrice: 30 },
  { sku: 'SCAN-1', name: 'Scanning (1-Side)', category: 'Documentation', unit: 'pcs', costPrice: 10, retailPrice: 50 },
  { sku: 'SCAN-2', name: 'Scanning (2-Side)', category: 'Documentation', unit: 'pcs', costPrice: 15, retailPrice: 100 },
  { sku: 'PASS-PHOTO', name: 'Passport Size Photos (4 / 8 pack)', category: 'Photography', unit: 'pack', costPrice: 30, retailPrice: 150 },
  
  { sku: 'BIO-VERIFY', name: 'Biometrics Verification', category: 'NADRA Services', unit: 'pcs', costPrice: 50, retailPrice: 300 },
  { sku: 'APP-URDU', name: 'Application Writing / Urdu Typing', category: 'Documentation', unit: 'pcs', costPrice: 20, retailPrice: 150 },
  { sku: 'AFFIDAVIT', name: 'Affidavit / Sale Agreement / Rent Agreement', category: 'Documentation', unit: 'pcs', costPrice: 100, retailPrice: 500 },
  { sku: 'CV-NORMAL', name: 'CV Normal Creation', category: 'Documentation', unit: 'pcs', costPrice: 50, retailPrice: 150 },
  { sku: 'CV-PRO', name: 'CV Professional Creation', category: 'Documentation', unit: 'pcs', costPrice: 100, retailPrice: 500 },
  { sku: 'ONLINE-FORM', name: 'Online Form Filling (NADRA / Driving License)', category: 'Documentation', unit: 'pcs', costPrice: 20, retailPrice: 250 },
  
  { sku: 'PVC-PRINT', name: 'PVC Card Printing', category: 'Cards & Binding', unit: 'pcs', costPrice: 100, retailPrice: 350 },
  { sku: 'PLASTIC-COAT', name: 'Soft / Hard Plastic Coating', category: 'Cards & Binding', unit: 'pcs', costPrice: 15, retailPrice: 80 },
  { sku: 'TAPE-BIND', name: 'Tape Binding', category: 'Cards & Binding', unit: 'pcs', costPrice: 20, retailPrice: 100 },
  { type: 'VARIABLE', sku: 'SPIRAL-BIND', name: 'Spiral Binding', category: 'Cards & Binding', unit: 'pcs', costRange: [30, 200], retailRange: [150, 1500] },
  
  { sku: 'BILL-FEE', name: 'K-Electric / SSGC Bill Payment Service Fee', category: 'Utility', unit: 'pcs', costPrice: 0, retailPrice: 30 },
  { type: 'VARIABLE', sku: 'EASYLOAD', name: 'Mobile Recharge / Easyload', category: 'Utility', unit: 'pcs', marginRange: [0.02, 0.05], retailRange: [100, 2000] }
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

function generateInventory() {
  return CATALOG.map((item, idx) => {
    let cost = item.costPrice || 0;
    let retail = item.retailPrice || 0;
    
    if (item.type === 'VARIABLE') {
      retail = item.retailRange[0]; // Set base display price
      if (item.costRange) cost = item.costRange[0];
    }
    
    return {
      id: generateId('inv'),
      sku: item.sku,
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity: randomInt(50, 5000), // High quantities for paper/supplies
      costPricePKR: cost,
      retailPricePKR: retail,
      reorderLevel: randomInt(10, 100),
      isActive: true,
      createdAt: randomDate(60),
      updatedAt: randomDate(5)
    };
  });
}

function generateCustomers(count) {
  const customers = [];
  for (let i = 0; i < count; i++) {
    const fName = randomChoice(KARACHI_NAMES);
    const lName = randomChoice(LAST_NAMES);
    // 30% have outstanding balance
    const balance = Math.random() < 0.3 ? randomInt(1, 50) * 100 : 0;
    customers.push({
      id: generateId('cust'),
      name: `${fName} ${lName}`,
      phone: `03${randomInt(0, 4)}${randomInt(0, 9)}${randomInt(1000000, 9999999)}`,
      email: Math.random() < 0.4 ? `${fName.toLowerCase()}.${lName.toLowerCase()}${randomInt(1, 99)}@gmail.com` : "",
      currentBalancePKR: balance,
      isActive: true,
      createdAt: randomDate(90),
      updatedAt: randomDate(10)
    });
  }
  return customers;
}

function generateSuppliers() {
  const suppliers = [
    { name: "Karachi Paper Mart Wholesale", phone: "03001234567", balance: randomInt(5000, 25000) },
    { name: "Sindh PVC & Plastics Co.", phone: "03211234567", balance: randomInt(0, 10000) },
    { name: "K-Electric", phone: "118", balance: randomInt(15000, 45000) },
    { name: "Digital Print Supplies & Toner", phone: "03331234567", balance: randomInt(2000, 8000) },
    { name: "Tariq Stationers", phone: "03111234567", balance: 0 }
  ];
  
  return suppliers.map(s => ({
    id: generateId('sup'),
    name: s.name,
    phone: s.phone,
    email: "",
    currentBalancePKR: s.balance,
    isActive: true,
    createdAt: randomDate(120),
    updatedAt: randomDate(2)
  }));
}

function generateExpenses(count, suppliers) {
  const categories = ["Rent", "Electricity", "Internet", "Tea & Snacks", "Maintenance", "Office Supplies", "Marketing"];
  const expenses = [];
  
  // Predictable recurring expenses
  expenses.push({
    id: generateId('exp'),
    date: randomDate(DAYS_AGO),
    category: "Electricity",
    description: "K-Electric Monthly Bill",
    paymentMethod: "bank",
    amountPKR: randomInt(18000, 35000),
    supplierId: suppliers.find(s => s.name === "K-Electric").id
  });
  
  for (let i = 0; i < count; i++) {
    const isDaily = Math.random() > 0.5;
    const cat = isDaily ? "Tea & Snacks" : randomChoice(categories);
    let amount = 0;
    let desc = "";
    
    if (cat === "Tea & Snacks") {
      amount = randomInt(150, 600);
      desc = "Staff Tea & Lunch";
    } else if (cat === "Office Supplies") {
      amount = randomInt(2000, 8000);
      desc = "Paper reams and toner refill";
    } else if (cat === "Maintenance") {
      amount = randomInt(1000, 5000);
      desc = "Photocopier repair/maintenance";
    } else {
      amount = randomInt(500, 3000);
      desc = "Misc expense";
    }
    
    expenses.push({
      id: generateId('exp'),
      date: randomDate(DAYS_AGO),
      category: cat,
      description: desc,
      paymentMethod: randomChoice(["cash", "cash", "easypaisa"]),
      amountPKR: amount
    });
  }
  
  // Sort by date desc
  return expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function generateSales(count, inventoryItems, customers) {
  const sales = [];
  for (let i = 0; i < count; i++) {
    const numItems = randomInt(1, 5);
    const items = [];
    let subtotal = 0;
    
    for (let j = 0; j < numItems; j++) {
      const catalogItem = randomChoice(CATALOG);
      const invItem = inventoryItems.find(inv => inv.sku === catalogItem.sku);
      
      let price = invItem.retailPricePKR;
      let cost = invItem.costPricePKR;
      
      if (catalogItem.type === 'VARIABLE') {
        price = randomInt(catalogItem.retailRange[0], catalogItem.retailRange[1]);
        if (catalogItem.sku === 'EASYLOAD') {
          cost = price * (1 - randomChoice(catalogItem.marginRange));
        } else if (catalogItem.costRange) {
          cost = randomInt(catalogItem.costRange[0], catalogItem.costRange[1]);
        }
      }
      
      let qty = 1;
      if (catalogItem.category === 'Printing') {
        qty = randomInt(1, 50); // Copies/Prints often bulk
      } else if (catalogItem.sku === 'PASS-PHOTO') {
        qty = randomInt(1, 3);
      }
      
      const itemTotal = price * qty;
      subtotal += itemTotal;
      
      items.push({
        itemId: invItem.id,
        sku: invItem.sku,
        name: invItem.name,
        quantity: qty,
        unitCostPKR: cost,
        unitRetailPKR: price,
        discountPKR: 0,
        totalPKR: itemTotal
      });
    }
    
    const discount = Math.random() > 0.8 ? randomInt(10, 50) : 0;
    const grandTotal = Math.max(0, subtotal - discount);
    
    // Assign customer 30% of the time
    const cust = Math.random() > 0.7 ? randomChoice(customers) : null;
    
    sales.push({
      id: generateId('sale'),
      invoiceNumber: `INV-${String(i+1001).padStart(5, '0')}`,
      customerId: cust ? cust.id : null,
      customerName: cust ? cust.name : "Walk-in Customer",
      items: items,
      subtotalPKR: subtotal,
      discountPKR: discount,
      taxPKR: 0,
      grandTotalPKR: grandTotal,
      paymentMethod: randomChoice(["cash", "cash", "cash", "easypaisa", "jazzcash", "card"]),
      paymentStatus: "paid",
      createdAt: randomDate(DAYS_AGO)
    });
  }
  
  return sales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function generateWorkLogs(sales) {
  const logs = [];
  
  // Distribute some work logs to employees for random sales (e.g. typing or NADRA services)
  const serviceSales = sales.filter(s => 
    s.items.some(i => i.sku.includes('BIO') || i.sku.includes('CV') || i.sku.includes('APP') || i.sku.includes('ONLINE'))
  );
  
  serviceSales.forEach(sale => {
    // Pick an employee
    const emp = randomChoice(EMPLOYEES);
    
    sale.items.forEach(item => {
      if (item.sku.includes('BIO') || item.sku.includes('CV') || item.sku.includes('APP') || item.sku.includes('ONLINE')) {
        logs.push({
          id: generateId('log'),
          employeeName: emp.name,
          employeeRole: emp.role,
          date: sale.createdAt,
          taskName: item.name,
          saleId: sale.id,
          revenueGeneratedPKR: item.totalPKR,
          notes: Math.random() > 0.5 ? "Completed successfully" : ""
        });
      }
    });
  });
  
  return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
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
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  console.log("Starting generation of Naeem Documentation Mock Data...");

  const inventory = generateInventory();
  const customers = generateCustomers(25);
  const suppliers = generateSuppliers();
  const expenses = generateExpenses(45, suppliers);
  const sales = generateSales(180, inventory, customers);
  const workLogs = generateWorkLogs(sales);

  const datasets = {
    'inventory_items': inventory,
    'customers': customers,
    'suppliers': suppliers,
    'expenses': expenses,
    'sales_transactions': sales,
    'employee_work_logs': workLogs
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
