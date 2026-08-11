"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, Filter, FileText, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { parseISO, format } from "date-fns";

import { useBusiness } from "@/contexts/BusinessContext";
import { useShop } from "@/contexts/ShopContext";
import { PurchaseService } from "@/lib/purchases/service";
import { formatCurrency } from "@/lib/utils/currency";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Purchase } from "@/types";

export default function PurchasesPage() {
  const { business, memberRole } = useBusiness();
  const { activeShop } = useShop();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadPurchases = useCallback(async () => {
    if (!business || !activeShop) return;
    try {
      setLoading(true);
      const data = await PurchaseService.getPurchases(business.id, activeShop.id);
      setPurchases(data);
    } catch (err) {
      toast.error("Failed to load purchases");
    } finally {
      setLoading(false);
    }
  }, [business, activeShop]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((purchase) => {
      const matchStatus = statusFilter === "all" || purchase.paymentStatus === statusFilter;
      const matchSearch =
        !searchQuery ||
        purchase.purchaseNumber.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [purchases, statusFilter, searchQuery]);

  const isReadOnly = memberRole === "cashier";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-100 dark:bg-gray-900 rounded animate-pulse mt-2" />
          </div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        </div>
        
        <div className="glass-card rounded-2xl overflow-hidden border border-white/40 dark:border-gray-800/60 shadow-xl shadow-gray-200/50 dark:shadow-black/40">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex gap-4">
              <div className="h-10 w-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              <div className="h-10 w-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            </div>
          </div>
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 w-full bg-gray-50 dark:bg-gray-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchases</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage purchase orders and supplier invoices.
          </p>
        </div>
        {!isReadOnly && (
          <Link href="/purchases/new">
            <Button className="shrink-0 flex items-center gap-2 rounded-xl shadow-lg shadow-[#10B981]/20">
              <Plus className="w-4 h-4" />
              <span>Create Purchase</span>
            </Button>
          </Link>
        )}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-white/40 dark:border-gray-800/60 shadow-xl shadow-gray-200/50 dark:shadow-black/40">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800/60 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by Purchase #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/50 dark:bg-gray-900/50 border-gray-200/80 dark:border-gray-700/80 rounded-xl"
            />
          </div>
          <div className="flex items-center gap-2 min-w-48">
            <Filter className="text-gray-400 w-4 h-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-white/50 dark:bg-gray-900/50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] dark:text-gray-200"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Purchase #</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium text-right">Grand Total</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                      <FileText className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" />
                      <p className="text-base font-medium text-gray-900 dark:text-gray-200">No purchases found</p>
                      <p className="text-sm mt-1">
                        {searchQuery || statusFilter !== "all" 
                          ? "Try adjusting your filters"
                          : "Create your first purchase order to get started"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => {
                  const itemsCount = purchase.items.reduce((sum, item) => sum + item.quantity, 0);
                  
                  return (
                    <tr 
                      key={purchase.id} 
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {purchase.purchaseNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {format(parseISO(purchase.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        <span className="font-medium">{purchase.supplierId}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                        {formatCurrency(purchase.grandTotalMinor, business?.currency || "PKR")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          purchase.paymentStatus === 'paid' 
                            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                            : purchase.paymentStatus === 'partial'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                        }`}>
                          {purchase.paymentStatus.charAt(0).toUpperCase() + purchase.paymentStatus.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button 
                          variant="ghost" 
                          className="text-[#10B981] hover:text-[#059669] hover:bg-[#10B981]/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
