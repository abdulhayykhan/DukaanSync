# DukaanSync — Real-Time Multi-Shop POS & Retail Inventory Management System

A lightweight, multi-tenant POS and inventory analytics platform designed for Pakistani retail businesses and multi-branch chains.

![Next.js](https://img.shields.io/badge/Next.js-16.3.0-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-11.0%2B-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.0-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Hosted-000000?style=for-the-badge&logo=vercel&logoColor=white)

---

## 📋 Table of Contents
1. [Executive Overview & Business Context](#1-executive-overview--business-context)
2. [Service Architecture & Method Index](#2-service-architecture--method-index)
3. [State Management & Context Scoping](#3-state-management--context-scoping)
4. [UI Component & Page Map](#4-ui-component--page-map)
5. [In-Depth Database Schema & Security Policy](#5-in-depth-database-schema--security-policy)
6. [Financial & Accounting Algorithms](#6-financial--accounting-algorithms)
7. [Project Directory Tree](#7-project-directory-tree)
8. [Quick Start & Setup Reference](#8-quick-start--setup-reference)
9. [License & Credits](#9-license--credits)

---

## 1. Executive Overview & Business Context

Retail management across Pakistan (supermarkets, apparel stores, electronics outlets, and wholesale marts) suffers from four critical operational bottlenecks:

1. **Multi-Branch Visibility Deficit:** Store owners lack a unified view of chain-wide sales, profit margins, and inventory levels, relying on fragmented branch-by-branch manual reports.
2. **Inventory Leakage & Stock Mismatches:** Disconnected registers lead to unrecorded stock movements, phantom inventory, sudden stockouts, and undetected shrinkage.
3. **Manual Paper Ledgers (*Khata*):** Paper registers cause calculation errors, uncollected customer credit receivables, and missed supplier payables.
4. **Rigid Payment Processing:** Modern shoppers expect flexible split payment channels (Cash, Bank Transfer, EasyPaisa, JazzCash, and Customer Credit), which legacy POS software fails to track.

### The DukaanSync Solution
**DukaanSync** addresses these bottlenecks with a cloud-native SaaS architecture:
- **Instant Branch Switching:** Access individual branch views (`MAIN`, `BR-02`, `BR-03`) or an aggregated **All Shops (Multi-Branch)** view seamlessly without relogging.
- **High-Speed POS Checkout:** Barcode hardware integration, rapid keyboard hotkeys (<kbd>F2</kbd>, <kbd>F8</kbd>, <kbd>F9</kbd>), and split payment support.
- **Automated Thermal Invoicing:** Thermal receipts formatted for standard 80mm printers via CSS `@media print`.
- **Integer Paisa Accounting:** Eliminates floating-point calculation drift across all financial ledgers and P&L calculations.

---

## 2. Service Architecture & Method Index

DukaanSync encapsulates core business logic into domain-driven service modules located in `src/lib/services/`:

### 2.1 `AnalyticsEngine.ts` (Telemetry Aggregation)
- **`getDashboardTelemetry(businessId: string, shopId: string, timeRange: TimeRange)`**:
  - Executes parallel Firestore queries across sales, purchases, expenses, and inventory subcollections.
  - When `shopId === "all"`, fetches active branch IDs from `businesses/{businessId}/shops/` and executes parallel multi-shop `Promise.all` queries.
  - Groups sales data into time buckets (`Today`, `This Week`, `This Month`, `This Year`).
  - Calculates total Revenue, Gross Profit, Operating Expenses, Net Profit, Customer Receivables, and Supplier Payables.

### 2.2 `SalesService.ts` (Point of Sale Transactions)
- **`createSaleTransaction(businessId: string, shopId: string, saleData: SaleInput)`**:
  - Executes atomic Firestore transactions (`db.runTransaction`).
  - Validates item stock availability before decrementing quantities.
  - Snapshots historical Cost Price per item (`costPricePKR`) into line items to preserve COGS accuracy.
  - Generates immutable stock movement records in `movements/`.
  - Atomically updates customer balance if payment is on credit.

### 2.3 `InventoryService.ts` (Catalog & Stock Control)
- **`getInventoryItems(businessId: string, shopId: string)`**: Retrieves active stock items for the specified shop context.
- **`updateStockLevel(businessId: string, shopId: string, itemId: string, delta: number, reason: string)`**: Updates inventory quantity and logs an audit record in `movements/`.
- **`checkLowStock(item: InventoryItem)`**: Returns `true` if `quantity <= reorderLevel`.

### 2.4 `AuditService.ts` (Append-Only Movement Auditing)
- **`logStockMovement(businessId: string, shopId: string, movement: StockMovementInput)`**:
  - Creates append-only documents inside `businesses/{businessId}/shops/{shopId}/movements/`.
  - Captures movement type (`sale`, `purchase`, `adjustment`, `return`), quantity change, actor UID, and timestamp.

### 2.5 Operational & Ledger Services
- **`ExpenseService.ts`**: CRUD operations for operating expenses, category breakdown calculations, and bulk CSV imports.
- **`PurchaseService.ts`**: Handles stock purchase entries, updates inventory counts, and manages supplier payables.
- **`CustomerService.ts`**: Manages customer profiles, credit limits, and receivables ledger transactions.
- **`SupplierService.ts`**: Manages supplier directory, contact details, and payables ledger transactions.

---

## 3. State Management & Context Scoping

DukaanSync utilizes React Context API providers (`src/contexts/`) for global state management:

### 3.1 `AuthContext.tsx`
- Wraps Firebase Authentication listeners (`onAuthStateChanged`).
- Persists user auth state, access tokens, and user profiles.

### 3.2 `BusinessContext.tsx`
- Fetches business profile document from `businesses/{businessId}` upon authentication.
- Resolves member role (`owner`, `manager`, `cashier`, `inventory_manager`) from `businesses/{businessId}/members/{uid}`.

### 3.3 `ShopContext.tsx`
- Controls active shop location selection.
- Stores active `shopId` (`"shop_main"`, `"shop_br02"`, `"shop_br03"`, or `"all"`).
- Automatically resets active shop context across inventory queries, POS cart state, and transaction logs.

---

## 4. UI Component & Page Map

### 4.1 Protected Application Routes (`src/app/(app)/`)
- **/dashboard**: Executive financial telemetry, KPI stat cards, Recharts revenue/profit trends, and expense distribution charts.
- **/pos**: Barcode checkout interface with cart management, keyboard shortcuts (<kbd>F2</kbd>, <kbd>F8</kbd>, <kbd>F9</kbd>), checkout dialog, and thermal receipt printing.
- **/inventory**: Stock catalog table, search filters, low-stock threshold badges, item CRUD modal, and `/inventory/movements` audit log.
- **/purchases**: Stock purchase order entries, supplier selection, payment status tracking, and `/purchases/new` wizard.
- **/expenses**: Expense logger with category filters (Rent, Utilities, Salaries, Transport, Marketing, Maintenance) and summary totals.
- **/customers**: Customer directory, credit limits, outstanding receivables, and customer profile details (`/customers/[id]`).
- **/suppliers**: Supplier directory, contact info, outstanding payables, and supplier profile details (`/suppliers/[id]`).
- **/reports**: Profit & Loss reports, export controls (CSV/Excel), and range filters.
- **/settings**: Business profile settings (`/settings/business`), team member management (`/settings/users`), and shop configuration (`/settings/shops`).

### 4.2 POS Keyboard Hotkeys & Thermal Printing
- **<kbd>F2</kbd>**: Focus Product Search Input.
- **<kbd>F8</kbd>**: Clear Current Cart (with prompt).
- **<kbd>F9</kbd>**: Open Checkout Modal.
- **Thermal Receipt Printing:** CSS `@media print` targets `.thermal-receipt` container with fixed 80mm width, monospaced font rendering, and zero margins.

---

## 5. In-Depth Database Schema & Security Policy

### 5.1 Cloud Firestore Document Tree
```text
users/{userId}
  ├── email: string
  ├── businessId: string
  └── createdAt: timestamp

businesses/{businessId}
  ├── name: string
  ├── ownerId: string
  ├── createdAt: timestamp
  │
  ├── members/{memberUid}
  │     ├── email: string
  │     ├── role: "owner" | "manager" | "cashier" | "inventory_manager"
  │     └── joinedAt: timestamp
  │
  ├── customers/{customerId}
  │     ├── name: string
  │     ├── phone: string
  │     ├── currentBalancePKR: number
  │     └── creditLimitPKR: number
  │
  ├── suppliers/{supplierId}
  │     ├── name: string
  │     ├── phone: string
  │     └── currentBalancePKR: number
  │
  └── shops/{shopId}
        ├── name: string
        ├── code: string
        │
        ├── inventory/{itemId}
        │     ├── sku: string
        │     ├── name: string
        │     ├── costPricePKR: number
        │     ├── sellingPricePKR: number
        │     ├── quantity: number
        │     └── reorderLevel: number
        │
        ├── sales/{saleId}
        │     ├── invoiceNumber: string
        │     ├── items: array
        │     ├── grandTotalPKR: number
        │     ├── paymentStatus: string
        │     └── createdAt: timestamp
        │
        ├── expenses/{expenseId}
        │     ├── category: string
        │     ├── amountPKR: number
        │     └── date: string
        │
        └── movements/{movementId}
              ├── type: "sale" | "purchase" | "adjustment" | "return"
              ├── quantityDelta: number
              ├── actorUid: string
              └── timestamp: timestamp
```

### 5.2 Security Policy Rules (`firestore.rules`)
- **Tenant Access Control:** Read and write permissions require authentication (`request.auth != null`).
- **Business Authorization:** Users can only access `businesses/{businessId}` if `request.auth.uid` matches `ownerId` OR exists in `businesses/{businessId}/members/{request.auth.uid}`.
- **Role Permissions:** Write operations on business settings and team members are restricted to `owner` and `manager` roles.

---

## 6. Financial & Accounting Algorithms

### 6.1 Integer Minor Unit Currency Accounting
To avoid IEEE 754 floating-point drift, currency operations convert decimal PKR amounts to integer paisa:
$$1 \text{ PKR} = 100 \text{ paisa}$$

### 6.2 Financial Profit & Loss Formulas
- **Gross Profit:**
  $$\text{Gross Profit} = \text{Revenue} - \text{Cost of Goods Sold (COGS)}$$

- **Net Profit:**
  $$\text{Net Profit} = \text{Gross Profit} - \text{Operating Expenses}$$

- **Net Profit Margin Percentage:**
  $$\text{Margin \%} = \left( \frac{\text{Net Profit}}{\text{Revenue}} \right) \times 100$$

---

## 7. Project Directory Tree

```text
DukaanSync/
├── firestore.rules          # Production Cloud Firestore Security Rules
├── next.config.ts           # Next.js Configuration
├── package.json             # Package manifest & dependencies
├── tsconfig.json            # TypeScript compiler configuration
├── README.md                # Main documentation
├── SETUP.md                 # Full Installation, Firebase & Data Import Guide
├── mock-data/               # Sample CSV datasets for testing & seeding
│   ├── customers.csv
│   ├── expenses.csv
│   ├── inventory_items.csv
│   ├── purchase_orders.csv
│   ├── sales_transactions.csv
│   └── suppliers.csv
└── src/
    ├── app/
    │   ├── (app)/           # Protected Application Routes (/dashboard, /pos, /inventory, etc.)
    │   ├── (auth)/          # Authentication Routes (/login, /register, /forgot-password)
    │   ├── onboarding/      # Business Setup Wizard
    │   ├── error.tsx        # 500 Error Boundary
    │   └── not-found.tsx    # 404 Not Found Page
    ├── components/          # Reusable UI Components & Modals
    ├── contexts/            # React State Contexts (Auth, Business, Shop)
    ├── lib/                 # Core Logic, Firebase Services, and Analytics Engine
    │   ├── analytics/       # Telemetry Aggregation Engine
    │   ├── audit/           # Audit Trail Service
    │   ├── customers/       # Customer Ledger Service
    │   ├── expenses/        # Expense Management Service
    │   ├── firebase/        # Firebase Initialization & Client Config
    │   ├── inventory/       # Inventory & Stock Movement Services
    │   ├── purchases/       # Atomic Purchase Transactions
    │   ├── sales/           # Atomic Sales Transactions
    │   ├── shops/           # Shop CRUD Service
    │   └── suppliers/       # Supplier Service
    └── types/               # Full System TypeScript Declarations
```

---

## 8. Quick Start & Setup Reference

### 8.1 Local Terminal Commands
```bash
# Clone the repository
git clone https://github.com/abdulhayykhan/DukaanSync.git
cd DukaanSync

# Install dependencies
npm install

# Run local development server
npm run dev

# Verify production build
npm run build
```

### 8.2 Setup Documentation Reference
For complete step-by-step instructions on configuring your Firebase Console, deploying Firestore security rules (`firestore.rules`), setting environment variables (`.env.local`), manual CSV data seeding from `mock-data/`, and Vercel hosting, please refer to **[`SETUP.md`](./SETUP.md)**.

---

## 9. License & Credits

## 📄 License

This project is open-source and available for educational and commercial use under the MIT License.

---

**Made with ❤️ by [Abdul Hayy Khan](https://www.linkedin.com/in/abdulhayykhan)**
