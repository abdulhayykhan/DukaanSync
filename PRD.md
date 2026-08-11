# DukaanSync — Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** Production Baseline  
**Product:** DukaanSync — Multi-Shop Management & Point of Sale System

---

## 1. Executive Summary

DukaanSync is a cloud-native, multi-tenant Point of Sale (POS) and retail management SaaS platform for small and medium-sized retail businesses, wholesalers, pharmacies, hardware stores, and similar businesses.

The platform allows **one authenticated user account to manage multiple physical shops without logging in separately for each shop**.

The user interface follows a modern **3D Animated Glassmorphism** design aesthetic. This includes:
- Translucent, frosted glass cards and modals
- Subtle neon glows and gradients
- Smooth, micro-animated transitions and hover effects
- A premium, dark-mode focused or vibrant dual-theme appearance

The fundamental business hierarchy is:

```text
Firebase Auth User
        ↓
Business
        ↓
Multiple Shops
        ↓
Shop-scoped operational data
```

The system must provide strict tenant isolation, role-based authorization, transactional data consistency, auditable inventory and financial records, real-time operational telemetry, and a fast POS workflow.

### Core Product Principle

> One account. One login. One business. Multiple shops. Strict data isolation. Consistent financial and inventory records.

---

# 2. Product Goals

## 2.1 Primary Goals

1. Provide a fast, reliable POS checkout experience.
2. Allow one user/business account to manage multiple shops.
3. Maintain strict isolation between different businesses.
4. Maintain strict shop context for shop-specific operations.
5. Keep inventory, sales, purchases, and ledgers financially consistent.
6. Provide real-time business telemetry and low-stock alerts.
7. Provide customer and supplier account management.
8. Provide expense management and profitability reporting.
9. Provide printable invoices and exportable reports.
10. Provide responsive desktop/tablet/mobile UX.
11. Meet WCAG 2.1 AA accessibility requirements.
12. Maintain zero TypeScript/build/lint errors in production.

---

# 3. Target Users

## 3.1 Business Owner

Needs:

- Multi-shop management
- Revenue and profit visibility
- Inventory valuation
- Receivables and payables
- Financial reports
- User/role management
- Shop switching
- Business settings

## 3.2 Manager

Needs:

- Sales monitoring
- Inventory management
- Purchases
- Customer/supplier management
- Expenses
- Reports

## 3.3 Cashier

Needs:

- Fast product search
- Cart management
- Customer lookup
- Discount application
- Payment collection
- Invoice printing

Cashiers should not automatically have access to sensitive cost/profit/business-management information.

## 3.4 Inventory Manager

Needs:

- Stock intake
- Product catalog
- Stock adjustments
- Supplier management
- Purchase orders
- Reorder levels
- Stock movement history

---

# 4. Authentication & Account Model

## 4.1 Authentication

Firebase Authentication shall provide:

- Email/password authentication
- Email verification
- Password reset
- Persistent sessions
- Optional Google authentication
- Optional MFA

Firebase `uid` is the authoritative user identity.

Email must not be used as the primary database identity key.

## 4.2 One Account, Multiple Shops

A user logs in once.

Example:

```text
user@email.com
      ↓
   Login
      ↓
 Business: Khan Traders
      ↓
 ┌───────────────────────┐
 │ Main Market           │
 │ Gulshan Branch        │
 │ North Branch          │
 └───────────────────────┘
```

Switching shops must not require another login.

---

# 5. Multi-Tenant Business Model

The business is the primary security boundary.

```text
User
 ↓
Business
 ├── Shop A
 ├── Shop B
 └── Shop C
```

A user belonging to Business A must never be able to read, write, update, or delete Business B data.

The client application must never be trusted to enforce tenant isolation.

Authorization must be enforced at the database/trusted backend layer.

---

# 6. Shop Management

Business owners can:

- Create shops
- Edit shops
- Activate/deactivate shops
- Mark a main shop
- Switch active shops
- View shop-specific reports
- Manage shop-specific inventory

Each shop must have a unique identifier within its business.

Example:

```text
Business: Khan Traders

SHOP-001 — Main Market
SHOP-002 — Gulshan Branch
SHOP-003 — North Branch
```

---

# 7. Core Functional Requirements

## Epic 1 — Authentication & Onboarding

### Requirements

- User registration
- Login/logout
- Email verification
- Password reset
- User profile
- Business creation
- Initial shop creation
- Session persistence
- Authorization loading before protected application access

### Acceptance Criteria

- User can create an account.
- A business can be created during onboarding.
- At least one shop can be created.
- User can log in again without recreating the business.
- Unauthorized users cannot access protected application routes.

---

# 8. Epic 2 — Multi-Shop Management

### Requirements

- Shop list
- Shop creation
- Shop editing
- Shop activation/deactivation
- Active-shop selector
- Main-shop designation
- Shop-specific dashboard
- Shop-specific inventory
- Shop-specific sales
- Shop-specific purchases
- Shop-specific expenses
- Shop-specific reports

### Acceptance Criteria

- User logs in once.
- User can switch between authorized shops.
- Changing the active shop refreshes shop-scoped data.
- Data from Shop A must not appear as Shop B data.
- Switching shops does not require authentication again.

---

# 9. Epic 3 — POS

The POS must prioritize speed and minimal interaction.

### Requirements

- SKU search
- Product-name search
- Category filtering
- Cart
- Quantity editing
- Discount
- Tax
- Customer selection
- Payment method selection
- Cash
- Card
- EasyPaisa
- JazzCash
- Credit
- Partial/mixed payment support where enabled
- Checkout validation
- Invoice generation
- PDF invoice
- Thermal receipt layout
- Print support

### Checkout Flow

```text
Search Product
      ↓
Add to Cart
      ↓
Adjust Quantity
      ↓
Select Customer
      ↓
Apply Discount
      ↓
Select Payment
      ↓
Validate Stock
      ↓
Atomic Checkout
      ↓
Sale + Inventory + Ledger Updates
      ↓
Invoice
```

### KPI

Average invoice completion time should be below **15 seconds** for normal checkout scenarios.

---

# 10. Epic 4 — Inventory

### Requirements

- Product catalog
- SKU
- Product name
- Category
- Unit
- Cost price
- Retail price
- Wholesale price
- Quantity
- Reorder level
- Active/inactive state
- Stock adjustment
- Stock movement history
- Low-stock alerts
- Inventory valuation

### Low Stock Rule

```text
quantity <= reorderLevel
```

should trigger a low-stock indicator.

### Negative Inventory

Negative inventory must be prevented by default.

If the business explicitly enables negative inventory, the behavior must be clearly configured and audited.

---

# 11. Epic 5 — Stock Movements

Every material stock change must have an auditable movement.

Movement types:

- Opening stock
- Purchase
- Sale
- Customer return
- Supplier return
- Damage
- Adjustment

The system must preserve:

- Quantity before
- Quantity change
- Quantity after
- Reference transaction
- User who performed the operation
- Timestamp

---

# 12. Epic 6 — Customers & Receivables

### Requirements

- Customer directory
- Customer profile
- Phone/email
- Sale history
- Outstanding balance
- Payment collection
- Ledger history
- Customer statement
- Credit sale
- Customer return/refund
- Balance adjustment with authorization

Customer balance must be backed by ledger entries rather than being an unexplained manually edited number.

---

# 13. Epic 7 — Suppliers & Payables

### Requirements

- Supplier directory
- Supplier profile
- Purchase history
- Outstanding payable
- Supplier payments
- Supplier ledger
- Supplier returns
- Supplier statements

Purchases on credit must update supplier payable records consistently.

---

# 14. Epic 8 — Purchases

### Requirements

- Purchase entry
- Supplier selection
- Product selection
- Quantity
- Cost price
- Discount
- Payment status
- Purchase history
- Stock intake

A completed purchase must update inventory and supplier payable data atomically.

---

# 15. Epic 9 — Expenses

Supported categories:

- Rent
- Utilities
- Salaries
- Transport
- Maintenance
- Marketing
- Other

Requirements:

- Add expense
- Edit expense according to permissions
- Expense history
- Date filtering
- Category filtering
- Expense reports

---

# 16. Epic 10 — Dashboard & Telemetry

Dashboard shall display:

- Revenue
- Gross profit
- Net profit
- Receivables
- Payables
- Inventory value
- Low-stock count
- Sales trend
- Profit trend
- Expense summary

### Profit Model

```text
Revenue
  -
COGS
  =
Gross Profit

Gross Profit
  -
Operating Expenses
  =
Net Profit
```

Historical profit must use the cost recorded at the time of sale.

---

# 17. Dashboard Periods

Supported periods:

- Daily
- Weekly
- Monthly
- Yearly

The selected period must consistently affect dashboard metrics and charts.

---

# 18. Epic 11 — Invoices

Invoices must include:

- Business information
- Shop information
- Invoice number
- Date/time
- Customer
- Items
- Quantity
- Unit price
- Discount
- Tax
- Grand total
- Payment method
- Payment status

Invoice formats:

- Web invoice
- A4 PDF
- Thermal receipt

---

# 19. Epic 12 — Reports

Reports shall include:

- Sales report
- Profit report
- Expense report
- Inventory report
- Low-stock report
- Customer receivables
- Supplier payables
- Purchase report
- Stock movement report
- P&L summary

Exports:

- CSV
- Excel
- PDF

---

# 20. Epic 13 — Audit Trail

Critical actions must be auditable.

Examples:

- Sale created
- Sale cancelled
- Purchase created
- Inventory adjusted
- Customer payment recorded
- Supplier payment recorded
- Expense created
- Shop created
- Shop deactivated
- User role changed

Audit entries should include:

- Actor
- Action
- Entity
- Entity ID
- Shop
- Timestamp
- Relevant metadata

---

# 21. Data Integrity Requirements

The following invariants must always hold.

### Inventory

```text
quantity >= 0
```

unless explicitly configured otherwise.

### Sale

```text
grandTotal = subtotal + tax - discount
```

### Inventory

```text
current stock =
opening stock
+ purchases
+ returns
- sales
- damage
+/- adjustments
```

### Gross Profit

```text
gross profit = revenue - COGS
```

### Net Profit

```text
net profit = gross profit - operating expenses
```

Financial records must not be silently corrupted by partial operations.

---

# 22. Transactional Consistency

The following operations must be atomic:

### Sale

```text
Create sale
+
Decrease inventory
+
Create stock movement
+
Update customer ledger
```

### Purchase

```text
Create purchase
+
Increase inventory
+
Create stock movement
+
Update supplier ledger
```

### Payment

```text
Create payment
+
Update ledger balance
```

If any critical part fails, the entire operation must fail rather than leaving partially updated business state.

---

# 23. Security Requirements

The system must prevent:

- Cross-business reads
- Cross-business writes
- Unauthorized shop access
- Role escalation
- Client-side role manipulation
- Invalid stock updates
- Unauthorized financial edits
- Unauthorized deletion of financial records
- Forged business/shop IDs
- Duplicate critical transactions

Authentication alone is not authorization.

---

# 24. Deletion Policy

Financial records should generally not be hard-deleted.

Instead:

```text
active
cancelled
returned
archived
```

Cancellations and returns should create appropriate reversal records.

---

# 25. UI/UX Design System

## Spacing

Use a 4px spacing scale:

```text
4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64px
```

## Radius

```text
Small: 6px
Medium: 10px
Large: 14px
```

## Colors

```text
Primary: #10B981
Secondary: #3B82F6
Danger: #EF4444
```

Support light and dark themes.

## Interaction

Buttons and interactive elements should have tactile feedback.

---

# 26. AppShell

Desktop:

```text
Sidebar: 240px expanded
Sidebar: 64px collapsed
Header: 64px
```

Mobile:

```text
Bottom navigation: 64px
Content clearance: pb-24
```

Landing-page content should use a consistent max-width container.

---

# 27. Accessibility

Target: WCAG 2.1 AA.

Requirements:

- Keyboard skip link
- Keyboard navigation
- Focus-visible states
- Accessible dialogs
- Focus trapping
- ESC dismissal
- Explicit labels for icon-only buttons
- `aria-required`
- `aria-invalid`
- Accessible error messages
- Proper table semantics
- Keyboard-accessible POS workflow
- Sufficient color contrast

---

# 28. Performance KPIs

| Metric | Target |
|---|---:|
| Initial load | < 1.2s |
| Dashboard compilation | < 500ms |
| POS checkout | < 15s |
| Route navigation | Fast/perceived instant |
| TypeScript errors | 0 |
| ESLint errors | 0 |
| Production build errors | 0 |

---

# 29. Definition of Done

A feature is complete only when:

- UI is implemented
- Loading states exist
- Empty states exist
- Error states exist
- Validation exists
- Authorization exists
- Firestore rules cover the operation
- Data relationships are validated
- Transactional operations are atomic where required
- Mobile UI works
- Accessibility requirements are met
- TypeScript passes
- ESLint passes
- Production build passes

---

# 30. Product Success

DukaanSync is successful when a business owner can:

1. Create one account.
2. Create one business.
3. Create multiple shops.
4. Log in once.
5. Switch shops instantly.
6. Sell products.
7. Automatically update stock.
8. Manage customer credit.
9. Manage supplier payables.
10. Record expenses.
11. View real-time profit.
12. Generate invoices.
13. Export reports.
14. Trust that data from another business can never be accessed.
15. Trust that inventory and financial records remain consistent.
