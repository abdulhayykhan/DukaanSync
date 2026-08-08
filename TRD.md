# DukaanSync — Technical Requirements Document (TRD)

**Version:** 1.0  
**Status:** Production Baseline  
**Architecture:** Multi-Tenant / Multi-Shop  
**Frontend:** Next.js 16 App Router  
**Database:** Cloud Firestore  
**Authentication:** Firebase Authentication

---

# 1. Technical Architecture

## 1.1 Architecture Overview

```text
┌───────────────────────────────────────────────────────────────┐
│                         Next.js 16                            │
│                       App Router                              │
│                                                               │
│  ┌──────────────┐  ┌───────────────────────────────────────┐ │
│  │ AppShell     │  │ Feature Pages                         │ │
│  │              │  │ Dashboard / POS / Inventory           │ │
│  │ Sidebar      │  │ Customers / Suppliers / Reports       │ │
│  │ Header       │  │ Purchases / Expenses / Settings        │ │
│  │ Bottom Nav   │  └───────────────────────────────────────┘ │
│  └──────────────┘                                            │
│                                                               │
│  Context / State Layer                                        │
│  AuthContext | BusinessContext | ShopContext | Theme | Toast │
└──────────────────────────────┬────────────────────────────────┘
                               │
                               │ Firebase SDK / Trusted APIs
                               ▼
┌───────────────────────────────────────────────────────────────┐
│                       Firebase                                │
│                                                               │
│  Firebase Authentication       Cloud Firestore                │
│  User identity                 Tenant/business data            │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

# 2. Technology Stack

| Layer | Technology | Requirement |
|---|---|---|
| Framework | Next.js | 16+ |
| Routing | App Router | Required |
| Language | TypeScript | Strict |
| Styling | Tailwind CSS | v4+ |
| Icons | Lucide React | Required |
| Charts | Recharts | Required |
| Database | Cloud Firestore | Required |
| Authentication | Firebase Auth | Required |
| Utilities | date-fns | Required |
| Class utilities | clsx / tailwind-merge | Required |
| Deployment | Vercel or equivalent | Supported |

---

# 3. Identity Architecture

Firebase Authentication provides the identity.

```text
Firebase Auth
     ↓
auth.uid
     ↓
users/{uid}
     ↓
businessId
     ↓
Business membership
     ↓
Authorized shops
```

`auth.uid` is authoritative.

Never trust:

- email as identity
- client-provided role
- client-provided business ownership
- client-provided shop authorization

---

# 4. Firestore Tenant Architecture

The recommended Firestore hierarchy is:

```text
users/{uid}

businesses/{businessId}
├── members/{uid}
├── shops/{shopId}
├── settings/{settingId}
│
└── shops/{shopId}
    ├── inventory/{itemId}
    ├── sales/{saleId}
    ├── purchases/{purchaseId}
    ├── customers/{customerId}
    ├── suppliers/{supplierId}
    ├── expenses/{expenseId}
    ├── stockMovements/{movementId}
    ├── customerLedger/{entryId}
    ├── supplierLedger/{entryId}
    └── auditLogs/{logId}
```

The exact Firestore path should be normalized during implementation, but **every shop-scoped record must have an unambiguous parent business and shop context**.

---

# 5. User Model

```ts
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;

  businessId: string;

  role:
    | 'owner'
    | 'manager'
    | 'cashier'
    | 'inventory_manager';

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

# 6. Business Model

```ts
interface Business {
  id: string;

  name: string;
  ownerId: string;

  plan:
    | 'trial'
    | 'pro'
    | 'enterprise';

  status:
    | 'active'
    | 'suspended';

  currency: 'PKR';

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

# 7. Business Membership Model

```ts
interface BusinessMember {
  uid: string;

  role:
    | 'owner'
    | 'manager'
    | 'cashier'
    | 'inventory_manager';

  status: 'active' | 'suspended';

  shopIds: string[];

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

A member's `shopIds` define which shops they may operate.

The owner may be authorized for all shops.

---

# 8. Shop Model

```ts
interface Shop {
  id: string;

  businessId: string;

  name: string;
  code: string;

  address?: string;
  phone?: string;

  isMain: boolean;

  status:
    | 'active'
    | 'inactive';

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Shop IDs must be unique within a business.

---

# 9. Active Shop Context

The frontend maintains an active shop.

```ts
interface ShopContextValue {
  activeShopId: string | null;

  availableShops: Shop[];

  setActiveShop: (shopId: string) => void;

  loading: boolean;
}
```

The active shop is a UI/application context.

It is **not an authorization mechanism**.

Firestore security rules must independently verify that the user can access the requested shop.

---

# 10. Inventory Model

```ts
interface InventoryItem {
  id: string;

  sku: string;
  name: string;

  categoryId: string;

  unit:
    | 'pcs'
    | 'kg'
    | 'g'
    | 'box'
    | 'pack'
    | 'liter'
    | 'other';

  quantity: number;

  costPriceMinor: number;
  retailPriceMinor: number;
  wholesalePriceMinor?: number;

  reorderLevel: number;

  isActive: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Money Representation

Monetary values should preferably be stored as integer minor units.

Example:

```text
Rs. 150.50
↓
15050 paisa
```

This avoids floating-point precision problems.

---

# 11. Stock Movement Model

```ts
interface StockMovement {
  id: string;

  itemId: string;

  type:
    | 'opening_stock'
    | 'purchase'
    | 'sale'
    | 'customer_return'
    | 'supplier_return'
    | 'damage'
    | 'adjustment';

  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;

  referenceType?: string;
  referenceId?: string;

  reason?: string;

  createdBy: string;
  createdAt: Timestamp;
}
```

Every stock mutation must create a corresponding stock movement.

---

# 12. Sale Model

```ts
interface SaleItem {
  itemId: string;
  sku: string;
  name: string;

  quantity: number;

  unitPriceMinor: number;
  costPriceMinor: number;

  discountMinor: number;
  totalMinor: number;
}

interface Sale {
  id: string;

  invoiceNumber: string;

  customerId?: string;
  customerName?: string;

  items: SaleItem[];

  subtotalMinor: number;
  taxMinor: number;
  discountMinor: number;
  grandTotalMinor: number;

  paymentMethod:
    | 'cash'
    | 'card'
    | 'easypaisa'
    | 'jazzcash'
    | 'credit'
    | 'mixed';

  paymentStatus:
    | 'paid'
    | 'partial'
    | 'unpaid';

  status:
    | 'completed'
    | 'cancelled'
    | 'returned';

  createdBy: string;
  createdAt: Timestamp;
}
```

Historical `costPriceMinor` must be stored on the sale item.

Never calculate historical COGS using the current inventory cost.

---

# 13. Purchase Model

```ts
interface PurchaseItem {
  itemId: string;
  sku: string;
  name: string;

  quantity: number;

  unitCostMinor: number;

  discountMinor: number;
  totalMinor: number;
}

interface Purchase {
  id: string;

  purchaseNumber: string;

  supplierId?: string;

  items: PurchaseItem[];

  subtotalMinor: number;
  discountMinor: number;
  grandTotalMinor: number;

  paymentMethod:
    | 'cash'
    | 'bank'
    | 'card'
    | 'easypaisa'
    | 'jazzcash'
    | 'credit';

  paymentStatus:
    | 'paid'
    | 'partial'
    | 'unpaid';

  createdBy: string;
  createdAt: Timestamp;
}
```

---

# 14. Customer Model

```ts
interface Customer {
  id: string;

  name: string;
  phone?: string;
  email?: string;

  currentBalanceMinor: number;

  isActive: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

# 15. Customer Ledger

```ts
interface CustomerLedgerEntry {
  id: string;

  type:
    | 'credit_sale'
    | 'payment'
    | 'refund'
    | 'adjustment';

  amountMinor: number;

  referenceType?: string;
  referenceId?: string;

  balanceBeforeMinor: number;
  balanceAfterMinor: number;

  createdBy: string;
  createdAt: Timestamp;
}
```

The balance should be derived from or reconciled against ledger entries.

---

# 16. Supplier Model

```ts
interface Supplier {
  id: string;

  name: string;
  phone?: string;
  email?: string;

  currentBalanceMinor: number;

  isActive: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

# 17. Supplier Ledger

```ts
interface SupplierLedgerEntry {
  id: string;

  type:
    | 'credit_purchase'
    | 'payment'
    | 'return'
    | 'adjustment';

  amountMinor: number;

  referenceType?: string;
  referenceId?: string;

  balanceBeforeMinor: number;
  balanceAfterMinor: number;

  createdBy: string;
  createdAt: Timestamp;
}
```

---

# 18. Expense Model

```ts
interface Expense {
  id: string;

  category:
    | 'rent'
    | 'utilities'
    | 'salary'
    | 'transport'
    | 'maintenance'
    | 'marketing'
    | 'other';

  amountMinor: number;

  description?: string;

  paymentMethod:
    | 'cash'
    | 'bank'
    | 'card';

  date: Timestamp;

  createdBy: string;
  createdAt: Timestamp;
}
```

---

# 19. Audit Log Model

```ts
interface AuditLog {
  id: string;

  action: string;

  actorId: string;

  entityType: string;
  entityId: string;

  shopId?: string;

  metadata?: Record<string, unknown>;

  createdAt: Timestamp;
}
```

Audit logs should be append-only for normal application users.

---

# 20. Data Integrity Invariants

The application and trusted backend logic must preserve these invariants.

## Inventory

```text
quantity >= 0
```

unless negative inventory is explicitly enabled.

## Sale

```text
grandTotal =
subtotal + tax - discount
```

## Stock

```text
current stock =
opening stock
+ purchases
+ customer returns
- sales
- supplier returns
- damage
+/- adjustments
```

## Gross Profit

```text
gross profit =
revenue - COGS
```

## Net Profit

```text
net profit =
gross profit - operating expenses
```

---

# 21. Atomic Sale Transaction

A sale must not be implemented as unrelated client-side writes.

Required conceptual transaction:

```text
BEGIN TRANSACTION

1. Validate authenticated user
2. Validate business membership
3. Validate shop authorization
4. Read all required inventory documents
5. Validate sufficient stock
6. Validate product prices
7. Create sale
8. Decrease inventory
9. Create stock movement records
10. Create/update customer ledger when applicable
11. Create audit record

COMMIT
```

If any required operation fails:

```text
ROLLBACK
```

No partial sale should remain.

---

# 22. Atomic Purchase Transaction

```text
BEGIN TRANSACTION

1. Validate authorization
2. Validate shop
3. Validate supplier
4. Validate purchase items
5. Create purchase
6. Increase inventory
7. Create stock movements
8. Update supplier ledger
9. Create audit record

COMMIT
```

---

# 23. Payment Transaction

Customer/supplier payment operations must atomically:

```text
Create ledger entry
+
Update/reconcile balance
+
Create audit record
```

---

# 24. Concurrency Requirements

Firestore transactions must be used where multiple documents must remain consistent.

Example:

Two cashiers attempt to sell the final unit.

```text
Stock = 1

Cashier A → sells 1
Cashier B → sells 1
```

The system must allow only a valid transaction according to the configured inventory policy.

The transaction must re-check the current inventory value before committing.

---

# 25. Firestore Security Model

## Principle

```text
Authentication
      ↓
Business membership
      ↓
Role authorization
      ↓
Shop authorization
      ↓
Document access
```

Never use:

```js
allow read, write: if request.auth != null;
```

for tenant business data.

Authentication only proves identity.

Authorization determines access.

---

# 26. Security Rule Requirements

Rules must verify:

### User

```text
request.auth != null
```

### Business

```text
authenticated user belongs to business
```

### Ownership

```text
business.ownerId == request.auth.uid
```

for owner-only operations.

### Shop

```text
requested shop belongs to requested business
```

and:

```text
user is authorized for that shop
```

### Data writes

The incoming document must not be allowed to arbitrarily change:

```text
businessId
shopId
createdBy
```

where those fields are security-sensitive.

---

# 27. Security Rule Design

Security rules should conceptually contain helpers such as:

```text
isAuthenticated()
isBusinessMember(businessId)
isBusinessOwner(businessId)
hasRole(businessId, role)
canAccessShop(businessId, shopId)
isValidTenantWrite(businessId, shopId)
```

Rules should validate both:

```text
existing resource
```

and:

```text
incoming request resource
```

when updating sensitive fields.

---

# 28. Client Security Boundary

The following are UI conveniences only:

- activeShopId
- localStorage
- React Context
- route guards
- hidden navigation items
- client-side roles

They must never be treated as authoritative authorization.

The database/trusted server is authoritative.

---

# 29. Role Permissions

| Capability | Owner | Manager | Cashier | Inventory Manager |
|---|---|---|---|---|
| POS | Yes | Yes | Yes | Optional |
| Inventory | Yes | Yes | Limited | Yes |
| Purchases | Yes | Yes | No | Yes |
| Customers | Yes | Yes | Yes | Yes |
| Suppliers | Yes | Yes | No/Limited | Yes |
| Expenses | Yes | Yes | No | Limited |
| Profit Reports | Yes | Yes | No | Limited |
| User Management | Yes | Limited | No | No |
| Shop Management | Yes | Limited | No | No |
| Business Settings | Yes | Limited | No | No |

Actual permissions must be enforced by security rules/trusted operations.

---

# 30. Deletion & Reversal Strategy

Financial documents should not normally be hard-deleted.

Use:

```text
completed
cancelled
returned
archived
```

A cancelled sale should generate the necessary inventory and ledger reversal operations.

A returned purchase/sale should have a linked reversal record.

---

# 31. Invoice Numbering

Invoice numbers should be unique within the required business/shop scope.

Example:

```text
INV-2026-000001
INV-2026-000002
```

Invoice generation must avoid duplicate identifiers under concurrent checkouts.

---

# 32. Dashboard Analytics

Analytics must support:

```text
daily
weekly
monthly
yearly
```

Required metrics:

```text
Revenue
COGS
Gross Profit
Expenses
Net Profit
Receivables
Payables
Inventory Value
```

Charts should use dynamically calculated Y-axis domains.

---

# 33. Firestore Query Requirements

Use:

- Proper composite indexes
- Pagination
- Query limits
- Shop-scoped queries
- Business-scoped queries
- Server-side filtering where appropriate
- Avoid unbounded collection reads

Never load an entire business database into the browser merely to calculate dashboard statistics.

---

# 34. POS Search

Product search should support:

- SKU
- Product name
- Category

Search should be optimized for rapid cashier interaction.

Use debouncing where necessary.

The POS must not wait for unnecessary dashboard or analytics queries.

---

# 35. React Architecture

Recommended context layer:

```text
AuthContext
BusinessContext
ShopContext
ThemeContext
ToastContext
```

Feature/domain services should be separated from presentation components.

Recommended structure:

```text
app/
components/
contexts/
features/
lib/
  auth/
  firebase/
  inventory/
  sales/
  purchases/
  customers/
  suppliers/
  expenses/
  analytics/
  validation/
types/
```

---

# 36. Data Validation

All writes must validate:

- Required fields
- Types
- Numeric ranges
- Business relationship
- Shop relationship
- Role permissions
- Inventory availability
- Financial totals

Prefer a shared validation layer using a schema-validation library where appropriate.

Never rely exclusively on TypeScript interfaces for runtime validation.

---

# 37. Loading / Error / Empty States

Every data-driven page must support:

### Loading

Skeleton or appropriate loading UI.

### Empty

Meaningful message and next action.

Example:

```text
All stock items in supply.
```

### Error

Human-readable error with retry where appropriate.

### Timeout

A safety fallback must prevent infinite loading states.

Target timeout:

```text
10 seconds
```

---

# 38. Accessibility Requirements

All components must target WCAG 2.1 AA.

Requirements:

```text
Skip link
Keyboard navigation
Focus management
Focus-visible states
ARIA labels
ARIA invalid states
ARIA required states
Accessible dialogs
ESC dismissal
Accessible tables
Screen-reader-friendly errors
```

Icon-only buttons require explicit `aria-label`.

---

# 39. Responsive Requirements

Desktop:

```text
Sidebar: 240px
Collapsed: 64px
Header: 64px
```

Mobile:

```text
Bottom navigation: 64px
Content bottom clearance: pb-24
```

POS should remain usable on tablets and smaller screens.

---

# 40. Design Tokens

Spacing:

```text
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
--space-12: 48px
--space-14: 56px
--space-16: 64px
```

Radii:

```text
--radius-sm: 6px
--radius-md: 10px
--radius-lg: 14px
```

Colors:

```text
Primary: #10B981
Secondary: #3B82F6
Danger: #EF4444
```

Light and dark themes must maintain accessible contrast.

---

# 41. Performance Requirements

| Metric | Target |
|---|---:|
| Initial load | < 1.2s |
| Dashboard telemetry | < 500ms target |
| POS checkout | < 15s |
| TypeScript errors | 0 |
| ESLint errors | 0 |
| Production build errors | 0 |

Use:

- Next.js code splitting
- Dynamic imports
- Lazy loading
- Firestore query optimization
- Pagination
- Memoization where useful
- Minimal client-side JavaScript
- Server Components where appropriate

---

# 42. Production Build Requirements

The project must pass:

```bash
npm run build
```

with:

```text
0 TypeScript errors
0 ESLint errors
0 route compilation errors
```

All App Router routes must compile successfully.

---

# 43. Environment Configuration

Firebase configuration must use environment variables.

Example:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Secrets must never be hardcoded into source files.

---

# 44. Firestore Indexing

Indexes must be created for common compound queries such as:

```text
shopId + createdAt
shopId + status + createdAt
shopId + customerId + createdAt
shopId + supplierId + createdAt
shopId + categoryId
shopId + reorderLevel
```

Exact indexes should be generated from real query requirements rather than blindly creating unnecessary indexes.

---

# 45. Data Migration & Schema Versioning

Documents should support a schema version where useful.

Example:

```ts
schemaVersion: 1
```

Future schema changes must have an explicit migration strategy.

Production data must never be changed by ad-hoc destructive scripts.

---

# 46. Testing Requirements

## Unit Tests

Test:

- Totals
- Discounts
- Tax
- Profit calculations
- Ledger calculations
- Stock calculations
- Date ranges

## Integration Tests

Test:

- Sale transaction
- Purchase transaction
- Payment transaction
- Inventory updates
- Ledger updates
- Authorization

## Security Tests

Explicitly test:

```text
User A → Business A = allowed
User A → Business B = denied

User A → Shop A = allowed
User A → unauthorized Shop B = denied
```

Also test attempts to modify:

```text
businessId
shopId
ownerId
role
createdBy
```

from the client.

## End-to-End Tests

Test:

```text
Login
↓
Business
↓
Shop selection
↓
POS
↓
Checkout
↓
Inventory update
↓
Invoice
↓
Ledger
↓
Report
```

---

# 47. Disaster / Failure Handling

The application must handle:

- Network failure
- Firestore unavailable
- Authentication expiration
- Permission denied
- Transaction conflict
- Invalid inventory state
- Duplicate submission
- Timeout
- Partial UI failure

Never show a successful confirmation unless the authoritative operation has succeeded.

---

# 48. Offline Behavior

If offline support is enabled, the product must clearly distinguish:

```text
Synced
Pending
Offline
Failed
```

Financial operations should not falsely appear completed when the system cannot confirm the authoritative write.

Offline behavior must be tested carefully because POS and inventory consistency are high-risk operations.

---

# 49. Observability

Production should provide:

- Client error logging
- Authentication error visibility
- Firestore permission error visibility
- Transaction failure visibility
- Performance monitoring
- Audit logs

Sensitive customer/business data must not be unnecessarily included in logs.

---

# 50. Definition of Technical Done

A feature is technically complete only when:

```text
UI complete
+
TypeScript complete
+
Runtime validation
+
Authorization
+
Firestore rules
+
Atomic operations where required
+
Error handling
+
Loading state
+
Empty state
+
Mobile support
+
Accessibility
+
Tests
+
Production build
```

---

# 51. Final Technical Architecture Principle

The architecture must enforce:

```text
                    Firebase Auth
                         │
                         ▼
                       UID
                         │
                         ▼
                  Business Membership
                         │
                         ▼
                      Business
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
            Shop A     Shop B     Shop C
              │          │          │
              ▼          ▼          ▼
           Data       Data       Data
```

The user experience is:

```text
One email
   ↓
One login
   ↓
One business
   ↓
Multiple authorized shops
   ↓
Instant shop switching
```

The security model is:

```text
Authentication
      ↓
Authorization
      ↓
Business isolation
      ↓
Shop isolation
      ↓
Role enforcement
      ↓
Transactional consistency
      ↓
Auditability
```

This architecture is the production baseline for DukaanSync.
