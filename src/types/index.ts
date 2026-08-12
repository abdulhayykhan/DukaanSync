// =============================================================================
// DukaanSync — Global TypeScript Models
// =============================================================================
// Core domain interfaces for the multi-tenant, multi-shop POS platform.
// =============================================================================

import type { Timestamp } from "firebase/firestore";

// -----------------------------------------------------------------------------
// User & Authentication
// -----------------------------------------------------------------------------

/** Roles available within a business context */
export type UserRole = "owner" | "manager" | "cashier" | "inventory_manager";

/** A user's profile, linked to a single business */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  businessId?: string | null;
  role?: UserRole;
  createdAt: string | Timestamp;
  updatedAt: string | Timestamp;
}

// -----------------------------------------------------------------------------
// Business (Tenant)
// -----------------------------------------------------------------------------

/** Subscription plan tiers */
export type BusinessPlan = "trial" | "pro" | "enterprise";

/** Account-level status */
export type BusinessStatus = "active" | "suspended";

/** Top-level tenant that owns one or more shops */
export interface Business {
  id: string;
  name: string;
  ownerId: string;
  plan: BusinessPlan;
  status: BusinessStatus;
  /** Default currency — PKR for Pakistan-based businesses */
  currency: "PKR";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// -----------------------------------------------------------------------------
// Shop
// -----------------------------------------------------------------------------

/** Operational status of a shop */
export type ShopStatus = "active" | "inactive";

/** An individual shop belonging to a business */
export interface Shop {
  id: string;
  businessId: string;
  name: string;
  /** Short unique code for the shop (e.g. "SHP-001") */
  code: string;
  address: string;
  phone: string;
  /** Whether this is the primary/headquarters shop */
  isMain: boolean;
  status: ShopStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// -----------------------------------------------------------------------------
// Business Membership
// -----------------------------------------------------------------------------

/** A user's membership record within a business (subcollection: businesses/{id}/members/{uid}) */
export interface BusinessMember {
  uid: string;
  businessId: string;
  role: UserRole;
  /** Shop IDs this member is authorized to access (owners bypass this) */
  shopIds: string[];
  displayName: string;
  email: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// -----------------------------------------------------------------------------
// Inventory
// -----------------------------------------------------------------------------

export type UnitType = "pcs" | "kg" | "g" | "box" | "pack" | "liter" | "other";

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  unit: UnitType;
  quantity: number;
  costPriceMinor: number;
  retailPriceMinor: number;
  wholesalePriceMinor?: number;
  reorderLevel: number;
  storageLocation?: string;
  isActive: boolean;
  createdAt: string; // Stored as ISO string to simplify service layer for now
  updatedAt: string;
}

export type StockMovementType = "opening_stock" | "purchase" | "sale" | "customer_return" | "supplier_return" | "damage" | "adjustment" | "transfer";

export interface StockMovement {
  id: string;
  itemId: string;
  type: StockMovementType;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  referenceType?: "purchase" | "sale" | "adjustment";
  referenceId?: string;
  reason?: string;
  createdBy: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Supplier & Ledger
// -----------------------------------------------------------------------------

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  location?: string;
  currentBalanceMinor: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type LedgerEntryType = "credit_purchase" | "payment" | "return" | "adjustment";

export interface SupplierLedgerEntry {
  id: string;
  supplierId: string;
  type: LedgerEntryType;
  amountMinor: number;
  referenceType?: "purchase" | "payment" | "adjustment";
  referenceId?: string;
  balanceBeforeMinor: number;
  balanceAfterMinor: number;
  createdBy: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Purchases
// -----------------------------------------------------------------------------

export type PaymentMethod = "cash" | "bank" | "card" | "easypaisa" | "jazzcash" | "credit" | "mixed";
export type PaymentStatus = "paid" | "partial" | "unpaid";

export interface PurchaseItem {
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  unitCostMinor: number;
  discountMinor: number;
  totalMinor: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  items: PurchaseItem[];
  subtotalMinor: number;
  discountMinor: number;
  extraCostMinor?: number;
  extraCostsMinor?: number;
  grandTotalMinor: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amountPaidMinor: number;
  status: "completed" | "cancelled";
  createdBy: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Audit Log (Moved to bottom)
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Customers & Ledgers
// -----------------------------------------------------------------------------

export type CustomerType = "wholesaler" | "retailer";

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  type?: CustomerType;
  location?: string;
  currentBalanceMinor: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerLedgerEntry {
  id: string;
  supplierId?: string; // Legacy field if needed, otherwise omit. Wait, this should be customerId
  customerId: string;
  type: "credit_sale" | "payment" | "refund" | "adjustment";
  amountMinor: number;
  referenceType?: "sale" | "payment" | "refund" | "adjustment";
  referenceId?: string;
  balanceBeforeMinor: number;
  balanceAfterMinor: number;
  createdBy: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Sales & POS
// -----------------------------------------------------------------------------

export interface SaleItem {
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPriceMinor: number;
  costPriceMinor: number;
  discountMinor: number;
  totalMinor: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotalMinor: number;
  taxMinor: number;
  discountMinor: number;
  grandTotalMinor: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amountPaidMinor: number;
  status: "completed" | "cancelled" | "returned";
  createdBy: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Expenses
// -----------------------------------------------------------------------------

export type ExpenseCategory = "rent" | "utilities" | "salary" | "transport" | "maintenance" | "marketing" | "other";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amountMinor: number;
  description?: string;
  paymentMethod: "cash" | "bank" | "card";
  date: string; // ISO Timestamp string representing the date of the expense
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Telemetry & Dashboard
// -----------------------------------------------------------------------------

export interface DashboardTelemetry {
  revenueMinor: number;
  grossProfitMinor: number;
  netProfitMinor: number;
  totalReceivablesMinor: number;
  totalPayablesMinor: number;
  inventoryValueMinor: number;
  lowStockCount: number;
  lowStockItems?: {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    unit: string;
    storageLocation?: string;
    reorderLevel: number;
  }[];
  chartData: {
    date: string;
    revenue: number;
    netProfit: number;
  }[];
  expenseDistribution: {
    name: string;
    value: number;
  }[];
}

// -----------------------------------------------------------------------------
// Audit & Security
// -----------------------------------------------------------------------------

export type AuditAction = 
  | 'sale_created' | 'sale_cancelled' | 'sale_returned'
  | 'purchase_created' | 'purchase_cancelled' | 'purchase_returned'
  | 'inventory_adjusted'
  | 'user_role_changed'
  | 'customer_payment' | 'supplier_payment'
  | 'shop_deactivated' | 'shop_created';

export type AuditEntityType = 'sale' | 'purchase' | 'inventory' | 'customer' | 'supplier' | 'expense' | 'shop' | 'user';

export interface AuditLog {
  id: string;
  action: AuditAction;
  actorId: string;
  entityType: AuditEntityType;
  entityId: string;
  shopId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
