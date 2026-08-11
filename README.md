# DukaanSync — Real-Time Multi-Shop POS & Retail Inventory Management System

A lightweight, multi-tenant POS and inventory analytics platform designed for Pakistani retail businesses and multi-branch chains.

![Next.js](https://img.shields.io/badge/Next.js-16.3.0-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-11.0%2B-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.0-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Hosted-000000?style=for-the-badge&logo=vercel&logoColor=white)

---

## 💼 Non-Technical Executive Overview

Managing multi-branch retail operations across Pakistan (supermarkets, apparel stores, electronics outlets, and wholesale marts) comes with critical operational friction:
- **Inventory Leakage & Stock Mismatches:** Tracking stock levels across multiple locations manually leads to phantom inventory, stockouts, and undetected shrinkage.
- **Manual Paper Ledgers:** Record keeping via paper registers or disconnected spreadsheets results in human error, delayed customer credit receivables, and uncollected supplier payables.
- **Multi-Branch Visibility Deficit:** Store owners lack real-time visibility into overall chain profitability, branch sales performance, and operational expense drains (such as utility bills, rent, and staff salaries).
- **Payment Method Rigidity:** Modern Pakistani shoppers use split payment modes (Cash, Bank Transfer, EasyPaisa, JazzCash, and Store Credit). Disconnected POS terminals fail to capture these payments cleanly.

### How DukaanSync Solves This
**DukaanSync** unifies multi-branch retail management into a single, cloud-native SaaS platform. With a single merchant account, store owners manage their entire chain seamlessly:
- **Instant Branch Context Switching:** Switch between individual shop branches (`MAIN`, `BR-02`, `BR-03`) or view an aggregated **All Shops (Multi-Branch)** chain dashboard without logging out.
- **High-Speed Cashier Checkout:** A barcode-scanner-optimized POS terminal with instant keyboard hotkeys (`F2`, `F8`, `F9`) and split-payment support.
- **Automated Thermal Printing:** Auto-generates clean, professional thermal receipts formatted specifically for standard 80mm thermal receipt printers.
- **Real-Time Financial Telemetry:** Automated Profit & Loss tracking, receivables/payables accounting, and low-stock alerts powered by integer paisa precision.

---

## 🔬 Technical Feature Matrix & Architecture Capabilities

### ⚡ 1. POS Terminal & High-Speed Checkout Engine
- **Barcode & SKU Auto-Add:** Scanner input listener automatically matches SKUs and updates cart quantities in real time.
- **Keyboard Hotkey Navigation:**
  - <kbd>F2</kbd> — Focus product search bar.
  - <kbd>F8</kbd> — Clear current cart with modal confirmation.
  - <kbd>F9</kbd> — Open payment checkout dialog.
- **Split & Digital Payment Handling:** Supports Cash (with change due calculation), Bank Transfer, EasyPaisa, JazzCash, Mixed Payments, and Customer Credit.
- **Atomic Stock Deduction:** Runs checkout inside atomic Cloud Firestore transactions (`runTransaction`), preventing race conditions and decrementing inventory atomically while creating historical COGS snapshots.
- **Print-Ready CSS Thermal Receipts:** Formatted `@media print` layout engineered for 80mm thermal receipt printers.

### 📊 2. Multi-Branch Telemetry & Analytics Engine
- **Tenant Context Scoping:** Queries are scoped dynamically via `businesses/{businessId}/shops/{shopId}`.
- **Aggregated Chain Query Handler (`AnalyticsEngine`):** When `shopId === "all"`, `AnalyticsEngine` executes parallel queries (`Promise.all`) across all active branch subcollections, merging revenue, profit, receivables, payables, and chart series in under 500ms.
- **Recharts Data Trajectories:** Interactive trend charts displaying revenue vs. net profit trajectories across `Today`, `This Week`, `This Month`, and `This Year`.

### 📦 3. Inventory & Immutable Stock Movement Auditing
- **Catalog Management:** Item SKU management, unit definitions, cost prices, retail selling prices, and reorder levels.
- **Low Stock Threshold Alerts:** Automatic visual alerts when inventory quantity drops below threshold levels.
- **Immutable Movement Audit Trail:** Logged append-only stock movement records (`movements/{movementId}`) capturing movement types (`sale`, `purchase`, `adjustment`, `return`), reference IDs, actor UIDs, and timestamps.

### 💸 4. Operating Expenses & Financial P&L Engine
- **Expense Categorization:** Categorized deductions across Rent, Utilities (K-Electric/Gas), Staff Salaries, Transport, Marketing, and Maintenance.
- **Exact Integer Paisa Accounting:** Eliminates IEEE floating-point rounding errors by storing all financial amounts as integer minor units (paisa).
- **Strict P&L Formula:**
  $$\text{Net Profit} = (\text{Revenue} - \text{COGS}) - \text{Operating Expenses}$$

### 📥 5. Bulk Data Migration & CSV Import Engine
- **Client-Side CSV Parser:** Integrates Papaparse for client-side CSV validation across Inventory, Sales, Expenses, Customers, and Suppliers.
- **Flexible Header Normalization:** Header normalizer maps diverse CSV column variations (e.g., `Customer Name`, `customer_name`, `client`) into canonical lookup keys.

---

## 🛠️ Technology Stack & Database Architecture

### Frontend Framework & UI Libraries
- **Framework:** Next.js 16+ (App Router with Turbopack)
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

### 1. Local Execution Commands

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

### 2. Complete Setup & Deployment Guide Reference
For complete step-by-step instructions on configuring your Firebase Console, deploying Firestore security rules (`firestore.rules`), setting environment variables (`.env.local`), manual CSV data seeding from `mock-data/`, and Vercel hosting, please refer to **[`SETUP.md`](./SETUP.md)**.

---

## 📄 License

This project is open-source and available for educational and commercial use under the MIT License.

---

**Made with ❤️ by [Abdul Hayy Khan](https://www.linkedin.com/in/abdulhayykhan)**
