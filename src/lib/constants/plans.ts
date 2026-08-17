import type { BusinessPlan } from "@/types";

export interface PlanTier {
  id: BusinessPlan;
  name: string;
  pricePKR: string;
  period: string;
  badge?: string;
  maxShopsText: string;
  maxShopsLimit: number;
  description: string;
  features: string[];
  popular?: boolean;
}

export const PLAN_TIERS: PlanTier[] = [
  {
    id: "free",
    name: "Free Plan",
    pricePKR: "PKR 0",
    period: "Forever",
    maxShopsText: "1 Shop Branch",
    maxShopsLimit: 1,
    description: "Ideal for single-location retail setups.",
    features: [
      "1 Store Branch Limit",
      "Full POS Terminal & Guest Checkout",
      "Basic Product & Category Inventory",
      "Manual Receipt Exports",
      "Single Staff Login Account",
    ],
  },
  {
    id: "basic",
    name: "Basic Plan",
    pricePKR: "PKR 1,500",
    period: "per month",
    badge: "Most Popular",
    maxShopsText: "Up to 2 Shop Branches",
    maxShopsLimit: 2,
    popular: true,
    description: "Designed for small businesses managing main and secondary outlets.",
    features: [
      "Up to 2 Store Branch Locations",
      "Multi-Branch Stock Transfers",
      "Customer & Supplier Ledger History",
      "Itemized Invoices & CSV/Excel Exports",
      "Custom Transport & Shipping Fee Tracking",
      "Standard Email Support",
    ],
  },
  {
    id: "pro",
    name: "Pro Plan",
    pricePKR: "PKR 4,000",
    period: "per month",
    badge: "Unlimited",
    maxShopsText: "Unlimited Shop Branches",
    maxShopsLimit: 999,
    description: "Full suite for multi-branch chains, franchises, and enterprise distributors.",
    features: [
      "Unlimited Store Branches",
      "Stock Movements Audit Log",
      "Wholesaler Custom Pricing Badges",
      "Advanced Revenue Telemetry Charts",
      "Priority 24/7 Phone & WhatsApp Support",
      "Custom Role-Based Staff Accounts",
    ],
  },
];
