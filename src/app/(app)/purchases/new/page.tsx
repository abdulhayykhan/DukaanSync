"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Plus, Trash2, Search, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

import { useBusiness } from "@/contexts/BusinessContext";
import { useShop } from "@/contexts/ShopContext";
import { SupplierService } from "@/lib/suppliers/service";
import { InventoryService } from "@/lib/inventory/service";
import { PurchaseTransactionService } from "@/lib/purchases/transaction";
import { formatCurrency, toMinorUnit } from "@/lib/utils/currency";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Supplier, InventoryItem, PaymentMethod } from "@/types";

interface CartItem {
  item: InventoryItem;
  quantity: number;
  unitCostDecimal: string;
  discountDecimal: string;
}

export default function NewPurchasePage() {
  const router = useRouter();
  const { business, member, memberRole } = useBusiness();
  const { activeShop } = useShop();

  // Guard
  const isReadOnly = memberRole === "cashier";

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountPaidDecimal, setAmountPaidDecimal] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch initial data
  useEffect(() => {
    if (!business || !activeShop || isReadOnly) return;
    
    Promise.all([
      SupplierService.getSuppliers(business.id, activeShop.id),
      InventoryService.getInventoryItems(business.id, activeShop.id)
    ]).then(([supData, invData]) => {
      setSuppliers(supData);
      setInventory(invData);
    }).catch(() => {
      toast.error("Failed to load necessary data");
    });
  }, [business, activeShop, isReadOnly]);

  // Clear purchase cart and state when active shop changes to prevent cross-shop leaks
  useEffect(() => {
    setCart([]);
    setSelectedSupplierId("");
    setSearchQuery("");
  }, [activeShop?.id]);

  // Inventory Search
  const filteredInventory = useMemo(() => {
    if (!searchQuery) return [];
    return inventory.filter(i => 
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      i.sku.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 10);
  }, [inventory, searchQuery]);

  const addToCart = (item: InventoryItem) => {
    const existing = cart.find(c => c.item.id === item.id);
    if (existing) {
      setCart(cart.map(c => 
        c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart([...cart, { 
        item, 
        quantity: 1, 
        unitCostDecimal: (item.costPriceMinor / 100).toString(), 
        discountDecimal: "0" 
      }]);
    }
    setSearchQuery("");
  };

  const updateCartItem = (itemId: string, field: keyof CartItem, value: any) => {
    setCart(cart.map(c => c.item.id === itemId ? { ...c, [field]: value } : c));
  };

  const removeCartItem = (itemId: string) => {
    setCart(cart.filter(c => c.item.id !== itemId));
  };

  // Calculations
  const totals = useMemo(() => {
    let subtotalMinor = 0;
    let discountMinor = 0;

    cart.forEach(c => {
      const uCostMinor = toMinorUnit(c.unitCostDecimal);
      const rowDiscMinor = toMinorUnit(c.discountDecimal);
      
      const lineTotal = (uCostMinor * c.quantity) - rowDiscMinor;
      
      subtotalMinor += uCostMinor * c.quantity;
      discountMinor += rowDiscMinor;
    });

    return {
      subtotalMinor,
      discountMinor,
      grandTotalMinor: subtotalMinor - discountMinor
    };
  }, [cart]);

  // Auto-fill amount paid if fully paid method selected
  useEffect(() => {
    if (paymentMethod !== "credit") {
      setAmountPaidDecimal((totals.grandTotalMinor / 100).toString());
    } else {
      setAmountPaidDecimal("0");
    }
  }, [paymentMethod, totals.grandTotalMinor]);

  const handleSubmit = async () => {
    if (!business || !activeShop || !member) return;
    if (!selectedSupplierId) return toast.error("Please select a supplier");
    if (cart.length === 0) return toast.error("Please add items to purchase");

    const amountPaidMinor = toMinorUnit(amountPaidDecimal);
    
    let paymentStatus: "paid" | "partial" | "unpaid" = "unpaid";
    if (amountPaidMinor >= totals.grandTotalMinor) paymentStatus = "paid";
    else if (amountPaidMinor > 0) paymentStatus = "partial";

    if (paymentMethod === "credit" && amountPaidMinor >= totals.grandTotalMinor) {
      return toast.error("Credit purchases cannot be fully paid upfront.");
    }

    try {
      setIsSubmitting(true);
      
      await PurchaseTransactionService.executePurchaseTransaction(
        business.id,
        activeShop.id,
        member.uid,
        {
          supplierId: selectedSupplierId,
          items: cart.map(c => ({
            itemId: c.item.id,
            sku: c.item.sku,
            name: c.item.name,
            quantity: Number(c.quantity),
            unitCostMinor: toMinorUnit(c.unitCostDecimal),
            discountMinor: toMinorUnit(c.discountDecimal),
            totalMinor: (toMinorUnit(c.unitCostDecimal) * c.quantity) - toMinorUnit(c.discountDecimal)
          })),
          subtotalMinor: totals.subtotalMinor,
          discountMinor: totals.discountMinor,
          grandTotalMinor: totals.grandTotalMinor,
          paymentMethod,
          paymentStatus,
          amountPaidMinor
        }
      );

      toast.success("Purchase recorded successfully");
      router.push("/inventory/movements"); // Redirect to audit logs
    } catch (err: any) {
      toast.error(err.message || "Transaction failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isReadOnly) {
    return <div className="p-8 text-center text-red-500">Access Denied</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <button 
            onClick={() => router.back()}
            className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Record Stock Purchase</h1>
          <p className="text-sm text-gray-500 mt-1">Receive inventory and update supplier payables.</p>
        </div>
        <Button onClick={handleSubmit} isLoading={isSubmitting} disabled={cart.length === 0 || !selectedSupplierId}>
          <Save className="w-4 h-4 mr-2" /> Complete Transaction
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        {/* Left Column: Entry Form */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h2 className="font-semibold text-gray-900 mb-4">Transaction Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier <span className="text-red-500">*</span></label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#10B981]"
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                >
                  <option value="">Select Supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Products to Add</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Search by SKU or Name..." 
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredInventory.length > 0 ? filteredInventory.map(item => (
                        <div 
                          key={item.id} 
                          className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                          onClick={() => addToCart(item)}
                        >
                          <div>
                            <p className="font-medium text-sm text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.sku}</p>
                          </div>
                          <Plus className="w-4 h-4 text-[#10B981]" />
                        </div>
                      )) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">No products found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col min-h-[400px]">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-900 flex items-center">
                <ShoppingCart className="w-4 h-4 mr-2 text-gray-400" /> Purchase Items
              </h2>
            </div>
            <div className="overflow-x-auto p-4 flex-1">
              <table className="w-full text-left">
                <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="pb-3 pr-4 font-semibold">Product</th>
                    <th className="pb-3 px-4 font-semibold w-24">Qty</th>
                    <th className="pb-3 px-4 font-semibold w-32">Unit Cost</th>
                    <th className="pb-3 px-4 font-semibold w-32">Discount</th>
                    <th className="pb-3 px-4 font-semibold text-right w-32">Total</th>
                    <th className="pb-3 pl-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">
                        Search and add products to start building the purchase.
                      </td>
                    </tr>
                  ) : (
                    cart.map((c) => {
                      const lineTotal = (toMinorUnit(c.unitCostDecimal) * c.quantity) - toMinorUnit(c.discountDecimal);
                      return (
                        <tr key={c.item.id}>
                          <td className="py-4 pr-4">
                            <p className="font-medium text-sm text-gray-900">{c.item.name}</p>
                            <p className="text-xs text-gray-500">{c.item.sku}</p>
                          </td>
                          <td className="py-4 px-4">
                            <Input 
                              type="number" min="1" 
                              value={c.quantity}
                              onChange={(e) => updateCartItem(c.item.id, "quantity", Number(e.target.value) || 1)}
                            />
                          </td>
                          <td className="py-4 px-4">
                            <Input 
                              type="number" step="0.01"
                              value={c.unitCostDecimal}
                              onChange={(e) => updateCartItem(c.item.id, "unitCostDecimal", e.target.value)}
                            />
                          </td>
                          <td className="py-4 px-4">
                            <Input 
                              type="number" step="0.01"
                              value={c.discountDecimal}
                              onChange={(e) => updateCartItem(c.item.id, "discountDecimal", e.target.value)}
                            />
                          </td>
                          <td className="py-4 px-4 text-right font-medium text-gray-900">
                            {formatCurrency(lineTotal, business?.currency)}
                          </td>
                          <td className="py-4 pl-4 text-right">
                            <button onClick={() => removeCartItem(c.item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
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

        {/* Right Column: Totals & Payment */}
        <div className="flex flex-col gap-6">
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h2 className="font-bold text-gray-900 text-lg mb-6">Payment Summary</h2>
            
            <div className="space-y-3 mb-6 border-b border-gray-200 pb-6">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(totals.subtotalMinor, business?.currency)}</span>
              </div>
              <div className="flex justify-between text-sm text-red-500">
                <span>Total Discount</span>
                <span>- {formatCurrency(totals.discountMinor, business?.currency)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200 mt-2">
                <span>Grand Total</span>
                <span>{formatCurrency(totals.grandTotalMinor, business?.currency)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant={paymentMethod === "cash" ? "primary" : "outline"} onClick={() => setPaymentMethod("cash")} className="w-full">Cash</Button>
                  <Button type="button" variant={paymentMethod === "bank" ? "primary" : "outline"} onClick={() => setPaymentMethod("bank")} className="w-full">Bank</Button>
                  <Button type="button" variant={paymentMethod === "credit" ? "primary" : "outline"} onClick={() => setPaymentMethod("credit")} className="w-full bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200">Credit / Unpaid</Button>
                  <Button type="button" variant={paymentMethod === "card" ? "primary" : "outline"} onClick={() => setPaymentMethod("card")} className="w-full">Card</Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid ({business?.currency})</label>
                <Input 
                  type="number" step="0.01"
                  value={amountPaidDecimal}
                  onChange={(e) => setAmountPaidDecimal(e.target.value)}
                  className="text-lg font-bold"
                />
              </div>

              {toMinorUnit(amountPaidDecimal) < totals.grandTotalMinor && (
                <div className="bg-amber-50 p-3 rounded-md border border-amber-200 text-amber-800 text-sm">
                  <strong>Note:</strong> A payable balance of {formatCurrency(totals.grandTotalMinor - toMinorUnit(amountPaidDecimal), business?.currency)} will be added to the supplier's ledger.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
