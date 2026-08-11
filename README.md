# DukaanSync — Real-Time Multi-Shop POS & Retail Inventory Management System

A lightweight, multi-tenant POS and inventory analytics platform designed for Pakistani retail businesses and multi-branch chains.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-11.0%2B-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.0-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Hosted-000000?style=for-the-badge&logo=vercel&logoColor=white)

---

## 🏬 Features & Platform Capabilities

### ⚡ POS Terminal & Checkout
- **Fast Barcode / SKU Scanning:** Optimized product search input with instant scanner auto-add.
- **Keyboard Hotkeys:** High-speed cashier workflow (`F2` Search, `F8` Clear Cart, `F9` Checkout Modal).
- **Split Payment Handling:** Accepts Cash, Card, EasyPaisa, JazzCash, Mixed, and Customer Credit.
- **Automated Stock Deduction:** Atomically updates inventory quantity and logs stock movements on checkout.
- **Thermal Receipts:** Generates printable invoices formatted for thermal printers (`@media print`).

### 📊 Multi-Branch Telemetry & Analytics
- **Real-Time Context Switcher:** Switch seamlessly between individual branches (`MAIN`, `BR-02`, `BR-03`) and the aggregated chain view.
- **Chain-Wide Metrics:** Computes total Revenue, Gross Profit, Operating Expenses, Net Profit, Receivables, and Payables across all active shop locations.
- **Interactive Charts:** Recharts visualization for revenue vs. profit trends and expense distributions.

### 📦 Inventory & Stock Movement Audit
- **Item Cataloging:** Complete SKU management, cost prices, selling prices, and reorder levels.
- **Low Stock Threshold Alerts:** Automatic alerts when items fall below safety stock limits.
- **Immutable Stock Audit Logs:** Tracks every stock movement (`sale`, `purchase`, `adjustment`, `return`) with before-and-after quantity snapshots.

### 💸 Operating Expenses & Financial Reports
- **Categorized Expense Tracking:** Log shop expenses across Rent, Utilities (K-Electric), Salaries, Transport, Marketing, and Maintenance.
- **Profit & Loss Statement:** Enforces strict integer paisa accounting ($\text{Net Profit} = (\text{Revenue} - \text{COGS}) - \text{Expenses}$).

### 📥 Bulk Data Migration
- **CSV Data Ingestion:** Built-in bulk import wizards with Papaparse CSV validation across Inventory, Sales, Expenses, Customers, and Suppliers.

---

## 🛠️ Technology Stack & Architecture

- **Frontend Framework:** Next.js 16+ (App Router with Turbopack), React 19, TypeScript.
- **Styling & UI:** Tailwind CSS, Lucide Icons, Recharts, Framer Motion, Radix UI primitives.
- **Backend & Database:** Google Cloud Firestore (Multi-tenant hierarchy), Firebase Authentication, Firebase App Check.
- **Deployment:** Vercel Cloud Platform with automated CI/CD deployment.

---

## 📁 Project Structure Overview

```text
DukaanSync/
├── firestore.rules          # Production Cloud Firestore Security Rules
├── next.config.ts           # Next.js Configuration
├── package.json             # Dependencies and scripts
├── SETUP.md                 # Full Installation, Firebase & Data Import Guide
├── README.md                # Main documentation
├── mock-data/               # Sample CSV datasets for testing & seeding
│   ├── customers.csv
│   ├── expenses.csv
│   ├── inventory_items.csv
│   ├── purchase_orders.csv
│   ├── sales_transactions.csv
│   └── suppliers.csv
└── src/
    ├── app/                 # Next.js App Router Routes & Layouts
    │   ├── (app)/           # Protected Application Pages (/dashboard, /pos, /inventory, etc.)
    │   ├── (auth)/          # Authentication Pages (/login, /register, /forgot-password)
    │   ├── onboarding/      # Business Setup Wizard
    │   ├── error.tsx        # 500 Error Boundary
    │   └── not-found.tsx    # 404 Not Found Page
    ├── components/          # Reusable UI Components & Modals
    ├── contexts/            # React Context Providers (Auth, Business, Shop)
    ├── lib/                 # Core Logic, Firebase Services, and Analytics Engine
    └── types/               # TypeScript Definitions
```

---

## 🚀 Quick Start & Documentation

### 1. Local Setup Commands

```bash
# 1. Clone the repository
git clone https://github.com/abdulhayykhan/DukaanSync.git
cd DukaanSync

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Verify production build
npm run build
```

### 2. Comprehensive Setup & CSV Import Documentation
For full instructions on configuring Firebase Authentication, deploying `firestore.rules`, importing mock CSV files from `mock-data/`, and deploying to Vercel, refer to **[`SETUP.md`](./SETUP.md)**.

---

## 📄 License

This project is open-source and available for educational and commercial use under the MIT License.

---

**Made with ❤️ by [Abdul Hayy Khan](https://www.linkedin.com/in/abdulhayykhan)**
