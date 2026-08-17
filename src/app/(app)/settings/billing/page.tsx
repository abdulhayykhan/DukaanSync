"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Zap, 
  Check, 
  Store, 
  ShieldCheck, 
  ChevronLeft, 
  Crown, 
  Sparkles, 
  Building,
  CreditCard
} from "lucide-react";
import { doc, updateDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { toast } from "sonner";

import { useBusiness } from "@/contexts/BusinessContext";
import { useShop } from "@/contexts/ShopContext";
import { Button } from "@/components/ui/Button";
import { PaymentInstructionsModal } from "@/components/billing/PaymentInstructionsModal";
import type { BusinessPlan } from "@/types";

interface PlanTier {
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

const PLAN_TIERS: PlanTier[] = [
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

export default function BillingSettingsPage() {
  const router = useRouter();
  const { business, refreshBusiness, memberRole } = useBusiness();
  const { shops } = useShop();

  const [isUpdating, setIsUpdating] = useState(false);
  const [shopCount, setShopCount] = useState(1);

  useEffect(() => {
    async function fetchShopsCount() {
      if (!db || !business) return;
      try {
        const snap = await getDocs(collection(db, "businesses", business.id, "shops"));
        setShopCount(snap.size || shops.length || 1);
      } catch (e) {
        setShopCount(shops.length || 1);
      }
    }
    fetchShopsCount();
  }, [business, shops]);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<BusinessPlan | null>(null);

  const currentPlanId = business?.plan || "free";
  const currentPlanTier = PLAN_TIERS.find(p => p.id === currentPlanId) || PLAN_TIERS[0];
  const maxShopsAllowed = currentPlanTier.maxShopsLimit;

  const handleSelectPlan = async (targetPlan: BusinessPlan) => {
    if (!db || !business) return;
    if (targetPlan === currentPlanId) {
      toast.info("Your business is already on this plan.");
      return;
    }

    // Downgrade to free is always allowed directly
    if (targetPlan === "free") {
      try {
        setIsUpdating(true);
        const bizRef = doc(db, "businesses", business.id);
        await updateDoc(bizRef, {
          plan: "free",
          updatedAt: new Date().toISOString(),
        });
        await refreshBusiness();
        toast.success("Successfully downgraded to Free Plan.");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to update subscription plan";
        toast.error(msg);
      } finally {
        setIsUpdating(false);
      }
      return;
    }

    // Upgrades require manual payment verification
    setSelectedUpgradePlan(targetPlan);
    setIsPaymentModalOpen(true);
  };

  // Only Owner and Manager allowed
  if (memberRole === "cashier") {
    return (
      <div className="p-8 text-center max-w-lg mx-auto mt-12 bg-white rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 mb-6">You do not have permissions to view billing settings.</p>
        <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
      
      {/* Navigation Breadcrumb & Header */}
      <div>
        <Link 
          href="/settings" 
          className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900 mb-3 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Settings
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-[#10B981]" /> Subscription & Billing
            </h1>
            <p className="text-lg text-gray-500 mt-1">
              Manage your store branch limits, subscription tier, and feature capabilities.
            </p>
          </div>
        </div>
      </div>

      {/* Current Active Subscription Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-8 rounded-2xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-white/10 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#10B981] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" /> Active Plan
            </span>
            <span className="text-xs font-medium text-emerald-300 capitalize">
              {business?.name}
            </span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            {currentPlanTier.name}
          </h2>

          <p className="text-sm text-slate-300 max-w-xl">
            {currentPlanTier.description}
          </p>
        </div>

        {/* Usage Progress Indicator */}
        <div className="bg-white/10 backdrop-blur-md p-5 rounded-xl border border-white/15 min-w-[260px] space-y-3 z-10">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-200">
            <span className="flex items-center gap-1.5">
              <Store className="w-4 h-4 text-emerald-400" /> Active Branches
            </span>
            <span className="font-mono text-sm text-white">
              {shopCount} / {maxShopsAllowed >= 999 ? "∞" : maxShopsAllowed} Used
            </span>
          </div>

          <div className="w-full bg-slate-700/80 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-[#10B981] h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (shopCount / (maxShopsAllowed >= 999 ? shopCount : maxShopsAllowed)) * 100)}%`
              }}
            />
          </div>

          <p className="text-[11px] text-slate-300">
            {maxShopsAllowed >= 999 ? "Unlimited branch locations supported." : `${maxShopsAllowed - shopCount} shop branch slot(s) remaining.`}
          </p>
        </div>
      </div>

      {/* Subscription Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {PLAN_TIERS.map((tier) => {
          const isCurrent = tier.id === currentPlanId;

          return (
            <div
              key={tier.id}
              className={`bg-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative border ${
                tier.popular 
                  ? "border-[#10B981] shadow-lg ring-2 ring-[#10B981]/20" 
                  : "border-slate-200/80 shadow-sm hover:shadow-md"
              }`}
            >
              {tier.badge && (
                <span className="absolute -top-3 right-6 px-3 py-1 bg-[#10B981] text-white text-xs font-bold rounded-full shadow-md uppercase tracking-wider">
                  {tier.badge}
                </span>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                  {isCurrent && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      Current
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-extrabold text-gray-900">{tier.pricePKR}</span>
                  <span className="text-xs text-gray-500 ml-1 font-medium">{tier.period}</span>
                </div>

                <div className="mb-6 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Building className="w-4 h-4 text-[#10B981]" />
                  {tier.maxShopsText}
                </div>

                <p className="text-xs text-gray-600 mb-6 leading-relaxed">
                  {tier.description}
                </p>

                <div className="space-y-3 mb-8">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Included Features:</p>
                  {tier.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-700 font-medium">
                      <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Button
                  className={`w-full font-bold text-xs py-2.5 ${
                    isCurrent 
                      ? "bg-slate-100 text-slate-500 hover:bg-slate-100 cursor-default" 
                      : tier.id === "free"
                        ? "bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50"
                        : "bg-[#10B981] hover:bg-emerald-600 text-white"
                  }`}
                  disabled={isCurrent || isUpdating}
                  onClick={() => handleSelectPlan(tier.id)}
                >
                  {isCurrent 
                    ? "Current Plan Active" 
                    : tier.id === "free" 
                      ? "Downgrade to Free" 
                      : `Upgrade to ${tier.name}`}
                </Button>
              </div>

            </div>
          );
        })}
      </div>

      <PaymentInstructionsModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        targetPlan={selectedUpgradePlan}
        targetPlanName={PLAN_TIERS.find(p => p.id === selectedUpgradePlan)?.name || ""}
        amountPKR={PLAN_TIERS.find(p => p.id === selectedUpgradePlan)?.pricePKR || ""}
      />

    </div>
  );
}
