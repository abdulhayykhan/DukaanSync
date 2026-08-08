# 🛒 DukaanSync
**Multi-Shop Management & Point of Sale SaaS System**

![Next.js](https://img.shields.io/badge/Next.js-16.0%2B-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-10.0%2B-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## 🏬 What is DukaanSync?

DukaanSync is a cloud-native, multi-tenant Point of Sale (POS) and retail management SaaS platform engineered for multi-branch retail businesses, wholesalers, pharmacies, and hardware stores.

It allows **one authenticated user account to manage multiple physical shops without logging in separately for each branch**, enforcing strict database-level tenant isolation, atomic ledger-backed financial consistency, real-time telemetry analytics, and sub-15-second cashier checkouts.

---

## 🌐 Live Demo & Repository

| Service | Link / URL |
|---------|------------|
| GitHub Repository | [https://github.com/abdulhayykhan/DukaanSync](https://github.com/abdulhayykhan/DukaanSync) |
| Production Web App | Coming Soon |

---

## ✨ Key Capabilities & Features

### 🏪 Multi-Tenant & Multi-Shop Hierarchy
- **Single Sign-On Switching:** Seamlessly switch active branch contexts (`Main Branch`, `Branch B`) without re-authenticating.
- **Tenant Isolation:** Firestore security rules enforce strict data boundaries between different business entities.

### ⚡ Fast POS Checkout Terminal
- **Sub-15s Checkout Target:** Optimized dual-panel catalog and shopping cart workflow.
- **Barcode & Keyboard Hotkeys:** Instant search (`F2`), clear cart (`F8`), checkout modal (`F9`).
- **Thermal & A4 Invoice Generator:** Integrated print layout for 80mm/58mm thermal receipt printers and downloadable A4 PDFs.

### 📦 Inventory & Stock Movement Auditing
- **Integer Minor Unit Currency:** Monetary calculations stored in paisa/minor units to prevent floating-point drift.
- **Low-Stock Telemetry:** Real-time visual alerts when product stock reaches reorder levels.
- **Stock Movements Audit Trail:** Every purchase, sale, damage, or adjustment logs precise `quantityBefore`, `quantityChange`, and `quantityAfter` entries.

### 💰 Ledger Accounting & Payables/Receivables
- **Customer Receivables Ledger:** Track customer credit sales, outstanding balances, and payment collections.
- **Supplier Payables Ledger:** Manage credit purchases and supplier balances.
- **Non-Destructive Reversals:** Cancelled or returned transactions generate balancing ledger and stock entries rather than destructive deletions.

### 📊 Real-Time Analytics & Profitability Engine
- **Telemetry Dashboard:** Live tracking of Revenue, COGS, Gross Profit, Expenses, and Net Profit.
- **Historical COGS Calculation:** Preserves the cost price recorded at the exact moment of sale.
- **Data Export:** Export financial reports and inventories to CSV or formatted print views.

---

## 🛠️ Tech Stack

### Frontend & Core
- **Next.js 16 (App Router)**
- **TypeScript (Strict Mode)**
- **Tailwind CSS (v4+)**
- **Framer Motion** (3D Glassmorphism interactions)
- **Recharts** (Data visualizers)
- **Lucide React** (Iconography)

### Backend & Cloud
- **Firebase Authentication**
- **Cloud Firestore**
- **Firestore Security Rules**

---

## 🚀 Quick Setup Guide

For complete step-by-step setup instructions, please refer to [SETUP.md](./SETUP.md).

```bash
# Clone the repository
git clone https://github.com/abdulhayykhan/DukaanSync.git

# Install dependencies
npm install

# Run local development server
npm run dev
```

---

## 📄 License

This project is open-source and available under the [MIT License](https://www.google.com/search?q=LICENSE).

**Crafted with ❤️ by [Abdul Hayy Khan](https://github.com/abdulhayykhan)**
