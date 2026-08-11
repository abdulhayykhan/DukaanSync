# DukaanSync — Real-Time Multi-Shop POS & Retail Inventory Management System

A lightweight, multi-tenant POS and inventory analytics platform designed for Pakistani retail businesses and multi-branch chains.

![Next.js](https://img.shields.io/badge/Next.js-16.3.0-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-11.0%2B-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.0-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Hosted-000000?style=for-the-badge&logo=vercel&logoColor=white)

---

## 💼 Non-Technical Executive Overview

### Retail Challenges in Pakistan
Managing retail stores, supermarkets, pharmacies, electronics shops, and wholesale chains across Pakistan presents significant operational friction:

1. **Inventory Leakage & Stock Mismatches:** Tracking inventory across multiple physical branches manually leads to phantom stock, sudden stockouts, undetected theft, and unrecorded inter-branch transfers.
2. **Manual Paper Ledgers & Khata:** Physical register entries and paper *Khata* notebooks result in frequent calculation errors, uncollected customer credit receivables, and missed supplier payment deadlines.
3. **Multi-Branch Visibility Deficit:** Store owners and franchise managers lack real-time visibility into overall chain profitability, branch sales performance, and operational expense drains (such as utility bills, rent, and staff salaries).
4. **Payment Method Rigidity:** Modern Pakistani shoppers utilize diverse split payment channels (Cash, Bank Transfer, EasyPaisa, JazzCash, and Customer Credit). Legacy POS setups fail to capture split payments cleanly.

### DukaanSync Solution Framework
**DukaanSync** solves these challenges by unifying multi-branch operations into a single, cloud-native SaaS platform:

- **Instant Branch Context Switching:** A merchant logs in once and seamlessly switches between individual branches (`MAIN`, `BR-02`, `BR-03`) or views an aggregated **All Shops (Multi-Branch)** chain view without logging out.
- **High-Speed Cashier Checkout:** A barcode-scanner-optimized POS terminal equipped with instant keyboard hotkeys (<kbd>F2</kbd>, <kbd>F8</kbd>, <kbd>F9</kbd>) and split-payment processing.
- **Thermal Receipt Engine:** Auto-generates clean thermal receipts formatted specifically for standard 80mm thermal receipt printers via CSS `@media print`.
- **Real-Time Telemetry & Profitability:** Integer paisa financial accounting, Profit & Loss tracking, receivables/payables management, and automated low-stock reorder alerts.

---

## 🔬 Technical Feature Matrix & Architecture Capabilities

### ⚡ 1. POS Terminal & High-Speed Checkout Engine
- **Barcode & SKU Auto-Add Mechanics:** The product search input actively listens to barcode scanner hardware inputs, automatically resolving SKUs and updating cart item quantities in real time.
- **Keyboard Shortcut Navigation:**
  - <kbd>F2</kbd> — Focus product search bar instantly.
  - <kbd>F8</kbd> — Clear current cart safely with confirmation modal.
  - <kbd>F9</kbd> — Open payment checkout dialog.
- **Split & Digital Payment Processing:** Supports Cash (with change due calculation), Bank Transfer, EasyPaisa, JazzCash, Customer Credit, and Mixed Payments.
- **Atomic Stock Deduction & COGS Preservation:** Checkout operations execute within atomic Cloud Firestore transactions (`runTransaction`), preventing race conditions, decrementing stock atomically, and snapshotting historical Cost of Goods Sold (COGS) per item.
- **Thermal Printing CSS Formatting:** Clean CSS `@media print` layout engineered specifically for 80mm thermal receipt printers.

### 📊 2. Multi-Branch Telemetry & Analytics Engine
- **Tenant Context Scoping:** All database queries are scoped dynamically via `businesses/{businessId}/shops/{shopId}`.
- **Aggregated Multi-Shop Query Handler (`AnalyticsEngine`):** When `shopId === "all"`, `AnalyticsEngine` executes parallel queries (`Promise.all`) across all active shop subcollections, merging total revenue, gross profit, expenses, net profit, receivables, and payables in under 500ms.
- **Recharts Visual Analytics:** Interactive trend charts displaying sales vs. net profit trajectories across `Today`, `This Week`, `This Month`, and `This Year` time horizons.

### 📦 3. Inventory & Immutable Stock Movement Auditing
- **Catalog Management:** Item SKU tracking, category definitions, cost prices, retail selling prices, and safety stock reorder levels.
- **Real-Time Low-Stock Alerts:** Automated visual badges and notifications when inventory quantities fall below threshold levels.
- **Immutable Movement Audit Logs:** Append-only stock movement logging (`movements/{movementId}`) capturing movement types (`sale`, `purchase`, `adjustment`, `return`), reference document IDs, actor UIDs, and timestamps.

### 💸 4. Operating Expenses & Financial P&L Engine
- **Categorized Expense Tracking:** Categorized operational deductions across Rent, Utilities (K-Electric/Gas), Staff Salaries, Transport, Marketing, and Maintenance.
- **Exact Integer Paisa Accounting:** Eliminates IEEE floating-point rounding errors by storing all currency values strictly as integer minor units (paisa).
- **Formal P&L Formula:**
  $$\text{Net Profit} = (\text{Revenue} - \text{COGS}) - \text{Operating Expenses}$$

### 📥 5. Bulk Data Migration & CSV Import Engine
- **Client-Side CSV Parser:** Papaparse integration for bulk data ingestion across Inventory, Sales, Expenses, Customers, and Suppliers.
- **Flexible Header Normalization:** Header normalizer maps diverse CSV column variations (e.g., `Customer Name`, `customer_name`, `client`) into canonical lookup keys.

---

## 🛠️ Technology Stack & Multi-Tenant Database Architecture

### Frontend Stack & UI Libraries
- **Framework:** Next.js 16+ (App Router with Turbopack compiler)
- **Language:** TypeScript 5.0+ (Strict type checking)
- **Styling:** Tailwind CSS v3 & Glassmorphism Utility Tokens
- **Icons & Visuals:** Lucide React, Recharts & Framer Motion
- **UI Primitives:** Radix UI Dialog & Dropdown Menu
- **State & Context:** React Context API (`AuthContext`, `BusinessContext`, `ShopContext`)

### Backend & Cloud Infrastructure
- **Database Engine:** Google Cloud Firestore (Multi-tenant document hierarchy)
- **Authentication:** Firebase Authentication (Email/Password provider)
- **Security:** Firebase App Check & `firestore.rules` security policies
- **Hosting & CI/CD:** Vercel Cloud Platform with automated build pipelines

### Database Schema Hierarchy & Multi-Tenant Scoping
```text
users/{userId} ───────────────────► User Profile & Business Reference
businesses/{businessId} ──────────► Core Business Entity & Owner Metadata
  ├── members/{userId} ──────────► Role & Shop Access Permissions
  ├── suppliers/{supplierId} ────► Supplier Profile & Payables Ledger
  ├── customers/{customerId} ────► Customer Profile & Receivables Ledger
  ├── auditLogs/{logId} ─────────► System Audit Trail
  └── shops/{shopId} ────────────► Shop Branch Configuration
        ├── inventory/{itemId} ──► Product Catalog & Stock Levels
        ├── sales/{saleId} ──────► Sales Transactions & Invoices
        ├── purchases/{id} ─────► Stock Purchase Orders
        ├── expenses/{id} ──────► Branch Operating Expenses
        └── movements/{id} ─────► Append-Only Stock Audit Trail
```

---

## 📁 Project Directory Tree

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
    │   ├── (app)/           # Protected Application Routes
    │   │   ├── dashboard/   # Financial Telemetry & Profitability
    │   │   ├── pos/         # High-Speed POS Checkout Terminal
    │   │   ├── inventory/   # Catalog & Stock Movements Audit
    │   │   ├── purchases/   # Stock Purchase Entry
    │   │   ├── suppliers/   # Supplier Directory & Payables Ledger
    │   │   ├── customers/   # Customer Directory & Receivables Ledger
    │   │   ├── expenses/    # Expense Management
    │   │   ├── reports/     # Financial Reports & CSV Export
    │   │   └── settings/    # Business, Users & Shop Configuration
    │   ├── (auth)/          # Authentication Routes (Login, Register, Forgot Password)
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

## ⚡ Quick Start & Setup Documentation Reference

### 1. Local Terminal Execution Commands

```bash
# 1. Clone the repository
git clone https://github.com/abdulhayykhan/DukaanSync.git
cd DukaanSync

# 2. Install dependencies
npm install

# 3. Run local development server
npm run dev

# 4. Verify production build
npm run build
```

### 2. Complete Setup & Deployment Guide Reference
For complete step-by-step instructions on configuring your Firebase Console, deploying Firestore security rules (`firestore.rules`), setting environment variables (`.env.local`), manual CSV data seeding from `mock-data/`, and Vercel hosting, please refer to **[`SETUP.md`](./SETUP.md)**.

---

## 📄 License

This project is open-source and available for educational and commercial use under the MIT License.

---

**Made with ❤️ by [Abdul Hayy Khan](https://www.linkedin.com/in/abdulhayykhan)**
