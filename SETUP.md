# DukaanSync — End-to-End Setup & Deployment Guide

Welcome to **DukaanSync**, a multi-tenant Point of Sale (POS) and multi-branch retail management SaaS platform built with Next.js 16 (App Router), TypeScript, Tailwind CSS, and Firebase Cloud Firestore.

---

## 📋 Table of Contents
1. [System Requirements & Architecture Overview](#1-system-requirements--architecture-overview)
2. [Environment Variables Configuration](#2-environment-variables-configuration)
3. [Complete Firebase & Firestore Setup](#3-complete-firebase--firestore-setup)
4. [Local Development Walkthrough](#4-local-development-walkthrough)
5. [Manual Data Import Guide (`mock-data/`)](#5-manual-data-import-guide-mock-data)
6. [Multi-Branch Context & Navigation](#6-multi-branch-context--navigation)
7. [Vercel Deployment & Production Verification](#7-vercel-deployment--production-verification)

---

## 1. System Requirements & Architecture Overview

### Core Technology Stack
- **Framework:** Next.js 16+ (App Router with Turbopack)
- **Language:** TypeScript 5.0+ (Strict type checking)
- **Styling:** Vanilla CSS & Tailwind CSS v3
- **Database & Auth:** Firebase Web SDK v11 (Cloud Firestore & Authentication)
- **State & Context:** React Context API (`AuthContext`, `BusinessContext`, `ShopContext`)
- **Icons & Visuals:** Lucide React, Recharts & Framer Motion
- **Parsing & Exports:** PapaParse & XLSX

### System Prerequisites
- **Node.js:** v18.17.0 LTS or higher (Node 20+ recommended)
- **Package Manager:** npm (v9.0.0+) or pnpm
- **Git:** v2.30+
- **Firebase CLI:** `npm install -g firebase-tools` or via `npx firebase`

---

## 2. Environment Variables Configuration

Create a `.env.local` file in the project root directory. Use the template below to configure your Firebase project credentials:

```env
# =============================================================================
# DukaanSync — Environment Configuration
# =============================================================================

NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
```

---

## 3. Complete Firebase & Firestore Setup

### 3.1 Authentication Configuration
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your Firebase project (or create a new one).
3. Navigate to **Build > Authentication**.
4. Click **Get Started** and enable the **Email/Password** sign-in provider.

### 3.2 Cloud Firestore Database
1. Navigate to **Build > Firestore Database**.
2. Click **Create Database** and select **Start in production mode**.
3. Choose a Firestore location close to your primary user base (e.g., `asia-south1`).

### 3.3 Security Rules Deployment
DukaanSync relies on `firestore.rules` for tenant isolation and role-based permissions across `/businesses/{businessId}/shops/{shopId}/...`.

Deploy rules directly using the Firebase CLI:
```bash
npx firebase login
npx firebase use --add # Select your Firebase project ID
npx firebase deploy --only firestore:rules
```

---

## 4. Local Development Walkthrough

Follow these steps to run DukaanSync on your local machine:

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/abdulhayykhan/DukaanSync.git
   cd DukaanSync
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Set Up Environment File:**
   Create `.env.local` as described in Section 2.

4. **Launch Local Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Manual Data Import Guide (`mock-data/` Directory)

DukaanSync supports bulk CSV importing across all operational pages. Realistic seed files are provided inside the `mock-data/` directory.

### 5.1 Import Locations & Dashboard Navigation

| CSV File Name | Target Dashboard Route | Header Action Button |
| :--- | :--- | :--- |
| `suppliers.csv` | `/suppliers` | `Import Data` |
| `customers.csv` | `/customers` | `Import Data` |
| `inventory_items.csv` | `/inventory` | `Import Data` |
| `expenses.csv` | `/expenses` | `Import Data` |
| `purchase_orders.csv` | `/purchases` | `Import Data` |
| `sales_transactions.csv` | `/pos` | `Import Sales` |

### 5.2 CSV Schema & Formatting Expectations

#### A. `suppliers.csv`
- **Required Columns:** `name`, `contactPerson`, `email`, `phone`, `category`, `address`, `city`
- **Currency Columns:** `currentBalancePKR` (Numeric in PKR)

#### B. `customers.csv`
- **Required Columns:** `name`, `email`, `phone`, `city`
- **Currency Columns:** `creditLimitPKR`, `currentBalancePKR`

#### C. `inventory_items.csv`
- **Required Columns:** `sku`, `name`, `category`, `quantity`, `reorderLevel`, `unit`
- **Currency Columns:** `costPricePKR`, `sellingPricePKR`

#### D. `expenses.csv`
- **Required Columns:** `date` (YYYY-MM-DD), `category` (rent, utilities, salary, transport, marketing, maintenance, other), `description`, `paymentMethod` (cash, bank, card)
- **Currency Columns:** `amountPKR`

#### E. `purchase_orders.csv`
- **Required Columns:** `supplierName`, `supplierId`, `status` (received, pending), `paymentStatus` (paid, unpaid, partial), `paymentMethod`, `date`
- **Currency Columns:** `subtotalPKR`, `discountPKR`, `taxPKR`, `grandTotalPKR`

#### F. `sales_transactions.csv`
- **Required Columns:** `invoiceNumber`, `customerName`, `paymentStatus` (paid, unpaid, partial), `paymentMethod`, `date`
- **Currency Columns:** `subtotalPKR`, `discountPKR`, `taxPKR`, `grandTotalPKR`

### 5.3 Recommended Import Sequence
To maintain referential integrity, import CSV files in the following order:
1. **Suppliers** (`suppliers.csv`) & **Customers** (`customers.csv`)
2. **Inventory Items** (`inventory_items.csv`)
3. **Purchase Orders** (`purchase_orders.csv`) & **Operating Expenses** (`expenses.csv`)
4. **Sales Transactions** (`sales_transactions.csv`)

---

## 6. Multi-Branch Context & Navigation

### Tenant Data Hierarchy
DukaanSync enforces strict data isolation using a multi-tenant hierarchy:
```
businesses/{businessId}
  ├── members/{userId}
  └── shops/{shopId}
        ├── sales/{saleId}
        ├── inventory/{itemId}
        ├── expenses/{expenseId}
        ├── purchases/{purchaseId}
        ├── customers/{customerId}
        └── suppliers/{supplierId}
```

### Switching Branch Views
Use the **Shop Switcher Dropdown** in the top navigation bar:
- **Individual Branch (`MAIN`, `BR-02`, `BR-03`):** Displays telemetry and records scoped strictly to the selected shop location.
- **All Shops (Multi-Branch):** Triggers `AnalyticsEngine` multi-shop parallel query aggregation across all branches, showing total chain metrics.

---

## 7. Vercel Deployment & Production Verification

### 7.1 Vercel Deployment Steps
1. Push your repository to GitHub.
2. Import the project into the [Vercel Dashboard](https://vercel.com/import).
3. In **Environment Variables**, paste all keys from your `.env.local` file.
4. Click **Deploy**.

### 7.2 Production Build Verification
Verify clean compilation locally prior to deployment:
```bash
npm run build
```
A clean build output confirms zero TypeScript or App Router metadata errors.
