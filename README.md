# 🛒 DukaanSync

```text
 ___       _                      ___             
|   \ _  _| |____ _ __ _ __ _ _  / __|_  _ _ _  __
| |) | || | / / _` / _` | ' \| | \__ \ || | ' \/ _|
|___/ \_,_|_\_\__,_\__,_|_||_|_| |___/\_, |_||_\__|
                                      |__/        
```

**Multi-Shop Management & Point of Sale SaaS Platform**

![Next.js](https://img.shields.io/badge/Next.js-16.3.0-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-11.8%2B-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## 🏬 What is DukaanSync?

**DukaanSync** is a cloud-native, multi-tenant Point of Sale (POS) and retail management SaaS platform engineered for multi-branch retail stores, supermarkets, pharmacies, electronics shops, and wholesale distribution networks.

### 🎯 Core Operational Philosophy
> **"One account. One login. One business. Multiple shops. Strict data isolation."**

DukaanSync eliminates the hassle of logging out and switching user credentials to manage different physical branches. An authorized merchant logs in **once** and seamlessly switches active shop contexts via a top header switcher dropdown. Database security rules and context providers enforce strict tenant isolation at the Firestore query level, guaranteeing zero cross-branch data leaks.

---

## ✨ Key Architectural & Business Features

### 🏪 1. Multi-Tenant Business & Shop Hierarchy
- **Single-Sign-On Multi-Branch Context:** Business owners manage multiple physical shops under a single business entity.
- **Dynamic Context Switcher:** Switch between active shop locations on the fly. Cart state, inventory queries, stock movement audits, and transaction logs automatically reset to scope to the active shop.
- **Role-Based Member Authorization:** Support for `owner`, `manager`, and `cashier` roles with fine-grained document access rules.

### ⚡ 2. High-Speed POS Terminal & Keyboard Workflow
- **Barcode Scanner Optimization:** Product search input features instant barcode scanning auto-add.
- **Rapid Keyboard Hotkeys:**
  - `F2` — Instant search focus.
  - `F8` — Clear cart safely with confirmation.
  - `F9` — Open payment checkout modal.
- **Multi-Payment Methods:** Accepts Cash, Card, EasyPaisa, JazzCash, Mixed, and Customer Credit sales.
- **Instant Thermal Invoices:** Auto-generates printable thermal receipts formatted for `@media print` printables.

### 💰 3. Integer Minor Unit Currency Accounting (Paisa Invariant)
- **Zero Floating-Point Financial Drift:** All monetary values (`costPriceMinor`, `retailPriceMinor`, `subtotalMinor`, `grandTotalMinor`) are stored strictly as 64-bit integer minor units (paisa/cents).
- **Exact Decimal Formatting:** Currency utilities convert values seamlessly between frontend inputs (e.g., `Rs. 150.50`) and backend storage (`15050` minor units).

### 🔄 4. Atomic Sales & Purchase Transactions
- **ACID Firestore Transactions:** Sales checkout and stock purchases run inside single atomic Firestore transactions (`runTransaction`).
- **Automated Inventory Deductions & Adjustments:** Sales decrement item quantity atomically. Purchases increment quantity automatically.
- **Historical COGS Preservation:** Every line-item in a sale captures the exact historical cost price (`costPriceMinor`) at the moment of checkout, ensuring accurate profit calculation even if item cost prices change later.

### 📚 5. Customer & Supplier Ledger Accounting
- **Customer Receivables Ledger:** Tracks credit sales, partial payments, and outstanding balances per customer.
- **Supplier Payables Ledger:** Records purchase payables, credit purchases, and payment transactions linked to supplier accounts.
- **Audit Trails:** Logs every financial ledger event (`credit_sale`, `payment`, `credit_purchase`, `refund`) with before-and-after balance snapshots.

### 📊 6. Real-Time Telemetry & Financial Analytics
- **Bounded Time Aggregations:** Period filtering across `Today`, `This Week`, `This Month`, and `This Year`.
- **Strict P&L Equation:** Net profit calculation strictly enforces:
  $$\text{Net Profit} = (\text{Revenue} - \text{COGS}) - \text{Expenses}$$
- **Recharts Visualizations:** Interactive revenue vs. expense trend lines and category distribution pie charts.

### 🛡️ 7. Non-Destructive Transaction Reversals & Audit Trail
- **Reversal Logging:** Reversing a sale or purchase restores stock atomically, creates an inverted stock movement, logs a ledger counter-entry, and marks the record `cancelled` without destroying historical records.
- **System Audit Logs:** Captures actor UID, action timestamp, entity target, and metadata for security compliance.

---

## 🎹 POS Keyboard Shortcuts Reference

| Hotkey | Action | Scope / Context |
| :---: | :--- | :--- |
| <kbd>F2</kbd> | **Focus Product Search** | POS Terminal Search Input |
| <kbd>F8</kbd> | **Clear Current Cart** | POS Terminal Cart (Triggers safety prompt) |
| <kbd>F9</kbd> | **Open Checkout Modal** | POS Terminal (Requires cart items > 0) |
| <kbd>ESC</kbd> | **Close Active Dialog** | Any open Modal Dialog overlay |

---

## 🏗️ System Architecture & Data Flow

```text
 ┌───────────────────────────────────────────────────────────────────┐
 │                       Client Browser (Next.js 16)                 │
 └─────────────────────────────────┬─────────────────────────────────┘
                                   │
 ┌─────────────────────────────────▼─────────────────────────────────┐
 │                       App Layout & Providers                      │
 │ ┌──────────────┐ ┌──────────────────┐ ┌─────────────────────────┐ │
 │ │ AuthProvider │ │ BusinessProvider │ │      ShopProvider       │ │
 │ └──────┬───────┘ └────────┬─────────┘ └────────────┬────────────┘ │
 └────────┼──────────────────┼────────────────────────┼──────────────┘
          │                  │                        │
          │ User Profile     │ Business Record        │ Active Shop ID
          ▼                  ▼                        ▼
 ┌───────────────────────────────────────────────────────────────────┐
 │                   Cloud Firestore Security Rules                  │
 └─────────────────────────────────┬─────────────────────────────────┘
                                   │
 ┌─────────────────────────────────▼─────────────────────────────────┐
 │                       Database Hierarchy                          │
 │                                                                   │
 │  users/{userId}                                                   │
 │  businesses/{businessId}                                          │
 │   ├── members/{userId}                                            │
 │   ├── suppliers/{supplierId} ──► ledger/{entryId}                 │
 │   ├── customers/{customerId} ──► ledger/{entryId}                 │
 │   ├── auditLogs/{logId}                                           │
 │   └── shops/{shopId}                                              │
 │        ├── inventory/{itemId}                                     │
 │        ├── sales/{saleId}                                         │
 │        ├── purchases/{purchaseId}                                 │
 │        ├── expenses/{expenseId}                                   │
 │        └── movements/{movementId}                                 │
 └───────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Core Framework & Runtime
- **Next.js 16 (App Router):** Server and Client components using Turbopack compiler.
- **React 19 & TypeScript 5:** Strict type checking, zero `any` explicit type warnings.

### Database & Authentication
- **Firebase SDK 11:** Firebase Authentication & Cloud Firestore database engine.

### Styling & Animation
- **Tailwind CSS 4:** Modern CSS design tokens, utility classes, and glassmorphic utilities.
- **Framer Motion:** Spring physics animations, layout transitions, and interactive 3D card tilt effects.
- **Lucide React:** Accessible icon set.
- **Radix UI Primitives:** `@radix-ui/react-dialog` & `@radix-ui/react-dropdown-menu` for accessible modals and dropdowns.

### State & Forms
- **Zod 4 & React Hook Form 7:** Type-safe form validation and schemas (`@hookform/resolvers`).
- **Sonner:** Toast notifications for instant user feedback.
- **Recharts 3:** Responsive financial data charts.

---

## 📁 Project Structure

```text
DukaanSync/
├── firestore.rules          # Production Cloud Firestore Security Rules
├── next.config.ts           # Next.js Configuration
├── package.json             # Package manifest & dependencies
├── tsconfig.json            # TypeScript compiler configuration
├── README.md                # Main documentation
├── SETUP.md                 # Local installation & Firebase deployment guide
├── PRD.md                   # Product Requirements Document
├── TRD.md                   # Technical Requirements Document
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
    │   │   └── settings/    # Multi-Shop Configuration
    │   ├── (auth)/          # Authentication Routes (Login, Register, Forgot Password)
    │   ├── onboarding/      # Business & Initial Shop Onboarding Wizard
    │   ├── globals.css      # Global Glassmorphic CSS Utility Tokens
    │   └── icon.svg         # SVG Brand Site Icon
    ├── components/          # Reusable UI Components
    │   ├── customers/       # Customer Modal Form
    │   ├── inventory/       # Product Modal Form
    │   ├── layout/          # AppShell, Header, Sidebar, BottomNav
    │   ├── pos/             # Printable Receipt Invoice Modal
    │   ├── providers/       # AuthGuard & Application Providers
    │   ├── shops/           # Shop Configuration Modal Form
    │   ├── suppliers/       # Supplier Modal Form
    │   └── ui/              # 3D Cards, Buttons, Inputs, Ambient Background
    ├── contexts/            # React State Contexts (Auth, Business, Shop, Theme, Toast)
    ├── lib/                 # Core Logic, Firebase Clients, and Service Modules
    │   ├── analytics/       # Telemetry Aggregation Engine
    │   ├── audit/           # Audit Trail Service
    │   ├── customers/       # Customer Ledger Service
    │   ├── expenses/        # Expense Management Service
    │   ├── firebase/        # Firebase Initialization & Client Config
    │   ├── inventory/       # Inventory & Stock Movement Services
    │   ├── purchases/       # Atomic Purchase Transactions & Reversals
    │   ├── sales/           # Atomic Sales Transactions & Reversals
    │   ├── shops/           # Shop CRUD Service
    │   ├── suppliers/       # Supplier Service
    │   ├── utils/           # Minor Unit Currency Conversion Utilities
    │   └── validation/      # Zod Validation Schemas
    └── types/               # Full System TypeScript Declarations
```

---

## ⚡ Quick Start & Setup Guide

### 1. Prerequisites
Ensure you have the following installed on your local machine:
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **Firebase Account:** A Firebase project with Firebase Authentication & Cloud Firestore enabled.

### 2. Installation & Configuration

1. **Clone the repository:**
   ```bash
   git clone https://github.com/abdulhayykhan/DukaanSync.git
   cd DukaanSync
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the project root:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Deploy Firestore Security Rules:**
   Deploy the included `firestore.rules` file to your Firebase console:
   ```bash
   firebase deploy --only firestore:rules
   ```

5. **Run Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

6. **Production Build:**
   ```bash
   npm run build
   npm run start
   ```

---

## 🛡️ License

Distributed under the **MIT License**. See `LICENSE` for details.
