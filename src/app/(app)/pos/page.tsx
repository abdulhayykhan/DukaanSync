"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ShoppingCart, Trash2, Plus, Minus, User, CreditCard, Banknote, HelpCircle, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { motion } from "framer-motion";
import { Card3D } from "@/components/ui/Card3D";
import * as Dialog from "@radix-ui/react-dialog";

import { useBusiness } from "@/contexts/BusinessContext";
import { useShop } from "@/contexts/ShopContext";
import { InventoryService } from "@/lib/inventory/service";
import { CustomerService } from "@/lib/customers/service";
import { SaleTransactionService, type SaleTransactionData, type SaleImportPayload } from "@/lib/sales/transaction";
import { formatCurrency, toMinorUnit } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { buildNormalizedRow, getField } from "@/lib/utils/importNormalize";
import { BulkImportModal, type DuplicateStrategy } from "@/components/ui/BulkImportModal";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InvoiceModal } from "@/components/pos/InvoiceModal";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { ExportDropdown } from "@/components/ui/ExportDropdown";
import { exportToCSV, exportToExcel } from "@/lib/utils/exportData";
import { format } from "date-fns";
import type { InventoryItem, Customer, PaymentMethod, Sale } from "@/types";

interface CartItem {
  inventoryItem: InventoryItem;
  quantity: number;
  discountMinor: number;
}

export default function POSTerminalPage() {
  const router = useRouter();
  const { business, member } = useBusiness();
  const { activeShop } = useShop();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const customerSelectRef = useRef<HTMLSelectElement>(null);

  // Data
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountPaidDecimal, setAmountPaidDecimal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invoice Modal State
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  
  // Customer Modal State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    if (!business || !activeShop) return;
    try {
      const [inv, cus] = await Promise.all([
        InventoryService.getInventoryItems(business.id, activeShop.id),
        CustomerService.getCustomers(business.id, activeShop.id)
      ]);
      setInventory(inv);
      setCustomers(cus);
    } catch (err) {
      toast.error("Failed to load POS data");
    }
  }, [business, activeShop]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Clear POS cart and state when active shop changes to prevent cross-shop leaks
  useEffect(() => {
    setCart([]);
    setSelectedCustomerId("");
    setSearchQuery("");
  }, [activeShop?.id]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger POS hotkeys if a modal dialog is open
      if (isCheckoutOpen || isInvoiceOpen || isCustomerModalOpen) return;

      // F2: Focus Search
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // F8: Clear Cart
      if (e.key === "F8") {
        e.preventDefault();
        if (cart.length > 0 && confirm("Clear cart?")) setCart([]);
      }
      // F9: Checkout
      if (e.key === "F9") {
        e.preventDefault();
        if (cart.length > 0) setIsCheckoutOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, isCheckoutOpen, isInvoiceOpen, isCustomerModalOpen]);

  // Filters
  const filteredInventory = useMemo(() => {
    if (!searchQuery) return inventory; // Could limit to top 50 if performance drops
    const q = searchQuery.toLowerCase();
    return inventory.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
  }, [inventory, searchQuery]);

  // Cart Operations
  const addToCart = (item: InventoryItem) => {
    if (item.quantity <= 0) {
      toast.error("Item out of stock");
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(c => c.inventoryItem.id === item.id);
      if (existing) {
        if (existing.quantity >= item.quantity) {
          toast.error("Cannot exceed available stock");
          return prev;
        }
        return prev.map(c => c.inventoryItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { inventoryItem: item, quantity: 1, discountMinor: 0 }];
    });
    setSearchQuery(""); // Clear search for barcode scanner flow
  };

  const updateCartQty = (itemId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.inventoryItem.id === itemId) {
        const newQ = c.quantity + delta;
        if (newQ > c.inventoryItem.quantity) {
          toast.error("Cannot exceed available stock");
          return c;
        }
        if (newQ <= 0) return c; // Will be handled by trash
        return { ...c, quantity: newQ };
      }
      return c;
    }));
  };

  const removeCartItem = (itemId: string) => {
    setCart(prev => prev.filter(c => c.inventoryItem.id !== itemId));
  };

  // Totals
  const totals = useMemo(() => {
    let sub = 0;
    let disc = 0;
    cart.forEach(c => {
      sub += c.inventoryItem.retailPriceMinor * c.quantity;
      disc += c.discountMinor; // Extensibility: Could multiply by qty if discount is per-unit
    });
    return {
      subtotalMinor: sub,
      discountMinor: disc,
      taxMinor: 0, // Placeholder
      grandTotalMinor: sub - disc
    };
  }, [cart]);

  // Sync amountPaidDecimal when checkout opens
  useEffect(() => {
    if (isCheckoutOpen && paymentMethod !== "credit") {
      setAmountPaidDecimal((totals.grandTotalMinor / 100).toString());
    } else if (isCheckoutOpen && paymentMethod === "credit") {
      setAmountPaidDecimal("0");
    }
  }, [isCheckoutOpen, paymentMethod, totals.grandTotalMinor]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !activeShop || !member) return;
    if (cart.length === 0) return;

    const amountPaidMinor = toMinorUnit(amountPaidDecimal);
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

    let paymentStatus: "paid" | "partial" | "unpaid" = "unpaid";
    if (amountPaidMinor >= totals.grandTotalMinor) paymentStatus = "paid";
    else if (amountPaidMinor > 0) paymentStatus = "partial";

    const isCredit = paymentMethod === "credit" || amountPaidMinor < totals.grandTotalMinor;
    if (isCredit && !selectedCustomer) {
      toast.error("Credit or partial sales require a Customer to be selected.");
      setTimeout(() => {
        customerSelectRef.current?.focus();
      }, 50);
      return;
    }

    const txData: SaleTransactionData = {
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      items: cart.map(c => ({
        itemId: c.inventoryItem.id,
        sku: c.inventoryItem.sku,
        name: c.inventoryItem.name,
        quantity: c.quantity,
        unitPriceMinor: c.inventoryItem.retailPriceMinor,
        discountMinor: c.discountMinor
      })),
      subtotalMinor: totals.subtotalMinor,
      discountMinor: totals.discountMinor,
      taxMinor: totals.taxMinor,
      grandTotalMinor: totals.grandTotalMinor,
      paymentMethod,
      paymentStatus,
      amountPaidMinor
    };

    try {
      setIsSubmitting(true);
      const saleId = await SaleTransactionService.executeSaleTransaction(
        business.id,
        activeShop.id,
        member.uid,
        txData
      );

      toast.success("Sale completed successfully");
      
      // Load the new sale to pass to invoice modal
      // In a real app we might fetch it back from DB or construct it in memory. Let's construct it in memory for speed.
      const generatedSale: Sale = {
        id: saleId,
        invoiceNumber: "Generated", // We'll rely on the modal to know it's missing if we can't fetch it, or just use what we know
        customerId: txData.customerId,
        customerName: txData.customerName,
        items: txData.items.map(i => ({...i, costPriceMinor: 0, totalMinor: (i.unitPriceMinor * i.quantity) - i.discountMinor})),
        subtotalMinor: txData.subtotalMinor,
        taxMinor: txData.taxMinor,
        discountMinor: txData.discountMinor,
        grandTotalMinor: txData.grandTotalMinor,
        paymentMethod: txData.paymentMethod,
        paymentStatus: txData.paymentStatus,
        amountPaidMinor: txData.amountPaidMinor,
        status: "completed",
        createdBy: member.uid,
        createdAt: new Date().toISOString()
      };
      
      setCompletedSale(generatedSale);
      setIsCheckoutOpen(false);
      setCart([]);
      setSearchQuery("");
      setSelectedCustomerId("");
      
      // Re-sync inventory in background
      InventoryService.getInventoryItems(business.id, activeShop.id).then(setInventory);
      
      // Open invoice modal
      setIsInvoiceOpen(true);

    } catch (err: any) {
      toast.error(err.message || "Transaction failed");
    } finally {
      setIsSubmitting(false);
      setIsSubmitting(false);
    }
  };

  const handleExportSales = async (formatType: "csv" | "excel") => {
    if (!business || !activeShop) return;
    try {
      const sales = await SaleTransactionService.getRecentSales(business.id, activeShop.id, 500);
      const exportData = sales.map(s => ({
        "Invoice #": s.invoiceNumber,
        "Customer Name": s.customerName || "Guest",
        "Date": format(new Date(s.createdAt), "yyyy-MM-dd HH:mm"),
        "Payment Method": s.paymentMethod,
        "Subtotal (PKR)": (s.subtotalMinor / 100).toFixed(2),
        "Tax (PKR)": (s.taxMinor / 100).toFixed(2),
        "Discount (PKR)": (s.discountMinor / 100).toFixed(2),
        "Grand Total (PKR)": (s.grandTotalMinor / 100).toFixed(2),
        "Payment Status": s.paymentStatus
      }));

      const dateStr = format(new Date(), "yyyy-MM-dd");
      const filename = `DukaanSync_POS_Sales_${activeShop.id}_${dateStr}`;

      if (formatType === "csv") {
        exportToCSV({ filename, data: exportData });
      } else {
        exportToExcel({ filename, data: exportData });
      }
    } catch (err) {
      toast.error("Failed to export sales history");
    }
  };

  const saleRowSchema = z.object({
    invoiceNumber: z.string().optional().default(""),
    customerName: z.string().optional().default("Walk-in Customer"),
    customerId: z.string().optional().default("walk_in"),
    subtotalPKR: z.coerce.number().catch(0).default(0),
    discountPKR: z.coerce.number().catch(0).default(0),
    taxPKR: z.coerce.number().catch(0).default(0),
    grandTotalPKR: z.coerce.number().catch(0).default(0),
    paymentStatus: z.enum(["paid", "unpaid", "pending", "partial"]).catch("paid"),
    paymentMethod: z.enum(["cash", "card", "bank"]).catch("cash"),
    cashierName: z.string().optional().default("System"),
    date: z.string().optional().default(""),
    items: z.string().optional().default("")
  });

  const SALES_COLUMNS = ["invoiceNumber", "customerName", "grandTotalPKR", "paymentStatus", "paymentMethod", "date"];
  const SALES_SAMPLE = [
    { invoiceNumber: "INV-2608-001", customerName: "Walk-in Customer", grandTotalPKR: 4500, paymentStatus: "paid", paymentMethod: "cash", date: "2026-08-10T12:00:00Z" },
    { invoiceNumber: "INV-2608-002", customerName: "Tariq Mahmood", grandTotalPKR: 12500, paymentStatus: "unpaid", paymentMethod: "cash", date: "2026-08-11T14:30:00Z" }
  ];

  const handleValidateSaleRow = (row: Record<string, string | number | boolean | null>) => {
    const norm = buildNormalizedRow(row);
    const get = (aliases: string[]) => getField(norm, aliases);

    const mapped = {
      invoiceNumber: String(get(["invoicenumber", "invoice", "invoiceno", "id", "salenumber"]) ?? ""),
      customerName: String(get(["customername", "customer", "client", "name"]) ?? "Walk-in Customer"),
      customerId: String(get(["customerid", "clientid"]) ?? "walk_in"),
      subtotalPKR: get(["subtotalpkr", "subtotal", "subtotalamount"]),
      discountPKR: get(["discountpkr", "discount", "discountamount"]),
      taxPKR: get(["taxpkr", "tax", "taxamount"]),
      grandTotalPKR: get(["grandtotalpkr", "grandtotal", "total", "amount", "totalpkr"]),
      paymentStatus: String(get(["paymentstatus", "status", "paymentstate"]) ?? "paid").toLowerCase(),
      paymentMethod: String(get(["paymentmethod", "method", "mode", "paymenttype"]) ?? "cash").toLowerCase(),
      cashierName: String(get(["cashiername", "cashier"]) ?? "System"),
      date: String(get(["date", "timestamp", "createdat", "saledate"]) ?? ""),
      items: String(get(["items", "lineitems", "products"]) ?? "")
    };

    const parsed = saleRowSchema.safeParse(mapped);
    if (!parsed.success) {
      return { isValid: false, errors: parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`) };
    }

    const d = parsed.data;
    let parsedItems = [];
    if (d.items) {
      try {
        parsedItems = JSON.parse(d.items);
      } catch {}
    }

    const grandTotalMinor = Math.round((Number(d.grandTotalPKR) || 0) * 100);
    const subtotalMinor = Math.round((Number(d.subtotalPKR) || Number(d.grandTotalPKR) || 0) * 100);
    const discountMinor = Math.round((Number(d.discountPKR) || 0) * 100);
    const taxMinor = Math.round((Number(d.taxPKR) || 0) * 100);
    const dateIso = d.date ? new Date(d.date).toISOString() : new Date().toISOString();

    return {
      isValid: true,
      data: {
        invoiceNumber: d.invoiceNumber,
        customerName: d.customerName,
        customerId: d.customerId,
        items: parsedItems,
        subtotalMinor,
        taxMinor,
        discountMinor,
        grandTotalMinor,
        paymentMethod: d.paymentMethod as any,
        paymentStatus: d.paymentStatus as any,
        amountPaidMinor: d.paymentStatus === "paid" ? grandTotalMinor : 0,
        cashierName: d.cashierName,
        createdAt: dateIso
      } as SaleImportPayload
    };
  };

  const handleImportSales = async (
    validRows: SaleImportPayload[],
    strategy: DuplicateStrategy,
    onProgress: (processed: number, total: number) => void
  ) => {
    if (!business || !activeShop) {
      throw new Error("Active business/shop not selected");
    }
    const result = await SaleTransactionService.bulkImportSales(
      business.id,
      activeShop.id,
      member?.uid || "system",
      validRows,
      strategy,
      onProgress
    );

    await loadData();
    return result;
  };

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden bg-transparent relative">
      
      {/* Left Panel: Catalog */}
      <div className="flex-1 flex flex-col p-4 border-r border-gray-200/20 h-full overflow-hidden z-10">
        
        {/* Search Bar & Actions */}
        <div className="relative mb-4 shrink-0 shadow-sm flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input 
              ref={searchInputRef}
              placeholder="Search products by SKU or Name [F2]" 
              className="pl-11 h-14 text-lg rounded-xl border-gray-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredInventory.length === 1) {
                  // Auto add to cart if only 1 match (Scanner optimized)
                  addToCart(filteredInventory[0]);
                }
              }}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
              <span className="hidden sm:inline-flex px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded border border-gray-200 font-mono">F2</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsImportModalOpen(true)}
              className="gap-2 rounded-xl h-11 border-slate-200 hover:border-emerald-500 hover:text-emerald-600 font-medium text-sm text-slate-700 bg-white shadow-sm"
            >
              <UploadCloud className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Import Sales</span>
            </Button>
            <ExportDropdown onExport={handleExportSales} label="Export Sales" />
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pb-4 pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredInventory.map(item => (
              <Card3D 
                key={item.id}
                className={cn(
                  "bg-white p-3.5 sm:p-4 rounded-2xl border transition-all h-full flex flex-col justify-between select-none min-w-0 w-full overflow-hidden shadow-sm",
                  item.quantity <= 0 
                    ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-50" 
                    : "border-slate-200/80 hover:border-emerald-500 hover:shadow-md cursor-pointer"
                )}
                onClick={item.quantity > 0 ? () => addToCart(item) : undefined}
                maxTilt={6}
              >
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 mb-2">
                    <span className={cn(
                      "text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 border whitespace-nowrap",
                      item.quantity <= 0 
                        ? "bg-rose-50 text-rose-700 border-rose-200" 
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    )}>
                      {item.quantity > 0 ? `${item.quantity} in stock` : 'Out of Stock'}
                    </span>
                  </div>

                  <h3 className="font-semibold text-xs sm:text-sm text-slate-900 leading-snug mb-1 line-clamp-2 break-words">
                    {item.name}
                  </h3>

                  <p className="text-[11px] font-mono text-slate-400 mb-3 truncate">
                    {item.sku}
                  </p>
                </div>

                <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-emerald-600 truncate whitespace-nowrap">
                    {formatCurrency(item.retailPriceMinor, business?.currency)}
                  </span>
                </div>
              </Card3D>
            ))}
          </div>
          {filteredInventory.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Search className="w-12 h-12 mb-2 opacity-20" />
              <p>No products found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Cart */}
      <div className="w-[400px] xl:w-[450px] shrink-0 glass-card shadow-2xl flex flex-col h-full z-10 relative border-l border-white/20">
        
        {/* Customer Selector */}
        <div className="p-4 border-b border-white/10 shrink-0 bg-white/5 flex gap-2">
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select 
              className="w-full pl-9 pr-3 py-2 glass-card border border-white/20 rounded-xl text-sm focus:ring-2 focus:ring-[#10B981] appearance-none"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              <option value="">Walk-in Customer (Guest)</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
            </select>
          </div>
          <Button variant="outline" className="px-3 py-1" onClick={() => setIsCustomerModalOpen(true)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
              <p>Cart is empty</p>
              <p className="text-xs mt-2">Scan barcodes or click products</p>
            </div>
          ) : (
            cart.map(c => {
              const lineTotal = (c.inventoryItem.retailPriceMinor * c.quantity) - c.discountMinor;
              return (
                <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} key={c.inventoryItem.id} className="flex flex-col p-3 border border-white/20 rounded-xl hover:border-white/40 transition-colors glass-card shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 pr-2">
                      <p className="font-semibold text-sm text-gray-900 leading-tight">{c.inventoryItem.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(c.inventoryItem.retailPriceMinor, business?.currency)} / {c.inventoryItem.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(lineTotal, business?.currency)}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                      <button onClick={() => updateCartQty(c.inventoryItem.id, -1)} className="p-1.5 hover:bg-white rounded-md text-gray-600 transition-colors">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{c.quantity}</span>
                      <button onClick={() => updateCartQty(c.inventoryItem.id, 1)} className="p-1.5 hover:bg-white rounded-md text-gray-600 transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <button onClick={() => removeCartItem(c.inventoryItem.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Totals & Actions */}
        <div className="p-4 border-t border-white/10 bg-white/5 shrink-0 backdrop-blur-md">
          <div className="space-y-1.5 mb-4 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotalMinor, business?.currency)}</span>
            </div>
            {totals.discountMinor > 0 && (
              <div className="flex justify-between text-[#10B981]">
                <span>Discount</span>
                <span>-{formatCurrency(totals.discountMinor, business?.currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-xl pt-2 border-t border-white/20">
              <span>Total</span>
              <span>{formatCurrency(totals.grandTotalMinor, business?.currency)}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" className="px-4" onClick={() => { if(confirm("Clear cart?")) setCart([]); }} disabled={cart.length === 0}>
              Clear <span className="hidden sm:inline-block text-[10px] ml-1 text-gray-400">[F8]</span>
            </Button>
            <motion.div className="flex-1" whileHover={cart.length > 0 ? { scale: 1.02 } : {}} whileTap={cart.length > 0 ? { scale: 0.98 } : {}}><Button className="w-full h-14 text-lg shadow-lg hover:shadow-xl transition-shadow bg-[#10B981] hover:bg-[#059669] text-white rounded-xl" onClick={() => setIsCheckoutOpen(true)} disabled={cart.length === 0}>
              Checkout <span className="hidden sm:inline-block text-xs font-normal opacity-70 ml-2">[F9]</span>
            </Button></motion.div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <Dialog.Root open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 animate-in fade-in backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-lg glass-card rounded-3xl shadow-2xl z-50 p-0 focus:outline-none animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
            
            <div className="p-6 bg-[#10B981] text-white">
              <h2 className="text-2xl font-bold flex justify-between items-center">
                Payment
                <span>{formatCurrency(totals.grandTotalMinor, business?.currency)}</span>
              </h2>
              {selectedCustomerId ? (
                <p className="text-green-100 text-sm mt-1">Customer: {customers.find(c => c.id === selectedCustomerId)?.name}</p>
              ) : (
                <p className="text-green-100 text-sm mt-1">Guest Checkout</p>
              )}
            </div>

            <form onSubmit={handleCheckout} className="p-6 overflow-y-auto space-y-6">
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-gray-900">Customer</label>
                  <button 
                    type="button" 
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Customer
                  </button>
                </div>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select 
                    ref={customerSelectRef}
                    id="checkout-customer-select"
                    className={cn(
                      "w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all appearance-none",
                      (toMinorUnit(amountPaidDecimal) < totals.grandTotalMinor || paymentMethod === "credit") && !selectedCustomerId
                        ? "border-amber-300 bg-amber-50/50"
                        : "border-gray-200"
                    )}
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                  >
                    <option value="">Walk-in Customer (Guest)</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">Select Payment Method</label>
                <div className="grid grid-cols-3 gap-3">
                  <button type="button" onClick={() => setPaymentMethod("cash")} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === "cash" ? "border-[#10B981] bg-green-50 text-[#10B981]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    <Banknote className="w-6 h-6 mb-1" />
                    <span className="text-xs font-bold uppercase">Cash</span>
                  </button>
                  <button type="button" onClick={() => setPaymentMethod("card")} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === "card" ? "border-[#10B981] bg-green-50 text-[#10B981]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    <CreditCard className="w-6 h-6 mb-1" />
                    <span className="text-xs font-bold uppercase">Card</span>
                  </button>
                  <button type="button" onClick={() => setPaymentMethod("credit")} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === "credit" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    <HelpCircle className="w-6 h-6 mb-1" />
                    <span className="text-xs font-bold uppercase">Credit</span>
                  </button>
                  <button type="button" onClick={() => setPaymentMethod("easypaisa")} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === "easypaisa" ? "border-[#10B981] bg-green-50 text-[#10B981]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    <span className="text-xs font-bold uppercase mt-2">EasyPaisa</span>
                  </button>
                  <button type="button" onClick={() => setPaymentMethod("jazzcash")} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === "jazzcash" ? "border-[#10B981] bg-green-50 text-[#10B981]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    <span className="text-xs font-bold uppercase mt-2">JazzCash</span>
                  </button>
                  <button type="button" onClick={() => setPaymentMethod("mixed")} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === "mixed" ? "border-gray-900 bg-gray-100 text-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    <span className="text-xs font-bold uppercase mt-2">Mixed</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Amount Tendered / Paid</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">{business?.currency}</span>
                  <Input 
                    type="number" step="0.01"
                    className="pl-12 h-14 text-2xl font-bold rounded-xl bg-gray-50"
                    value={amountPaidDecimal}
                    onChange={(e) => setAmountPaidDecimal(e.target.value)}
                    disabled={paymentMethod === "credit"}
                  />
                </div>
                
                {paymentMethod === "cash" && toMinorUnit(amountPaidDecimal) > totals.grandTotalMinor && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 flex justify-between items-center">
                    <span className="text-blue-800 font-semibold">Change Due:</span>
                    <span className="text-2xl font-bold text-blue-600">{formatCurrency(toMinorUnit(amountPaidDecimal) - totals.grandTotalMinor, business?.currency)}</span>
                  </div>
                )}
                
                {(toMinorUnit(amountPaidDecimal) < totals.grandTotalMinor || paymentMethod === "credit") && (
                  <div className="mt-3 p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="text-amber-800 text-xs font-medium leading-relaxed flex-1">
                      <span className="font-bold block text-amber-900 mb-0.5">
                        {paymentMethod === "credit" ? "Full Credit Sale" : "Partial Payment"}
                      </span>
                      Remaining {formatCurrency(Math.max(0, totals.grandTotalMinor - toMinorUnit(amountPaidDecimal)), business?.currency)} will be added to customer credit.
                    </div>
                    {!selectedCustomerId && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          customerSelectRef.current?.focus();
                        }}
                        className="shrink-0 text-xs bg-white text-amber-900 border-amber-300 hover:bg-amber-100 font-semibold shadow-sm"
                      >
                        Select Customer
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => setIsCheckoutOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 h-12" isLoading={isSubmitting}>Confirm Payment</Button>
              </div>

            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <CustomerModal 
        isOpen={isCustomerModalOpen} 
        onClose={() => setIsCustomerModalOpen(false)} 
        onSuccess={async (newCustomerId) => {
          if (!business || !activeShop) return;
          const cus = await CustomerService.getCustomers(business.id, activeShop.id);
          setCustomers(cus);
          if (newCustomerId) {
            setSelectedCustomerId(newCustomerId);
          }
        }} 
      />

      <InvoiceModal 
        isOpen={isInvoiceOpen}
        onClose={() => { setIsInvoiceOpen(false); setCompletedSale(null); }}
        sale={completedSale}
        business={business}
      />

      <BulkImportModal<SaleImportPayload>
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Sales Transactions"
        sampleData={SALES_SAMPLE}
        expectedColumns={SALES_COLUMNS}
        onValidateRow={handleValidateSaleRow}
        onImport={handleImportSales}
        onSuccess={() => {
          toast.success("Sales transactions imported successfully!");
          loadData();
        }}
      />

    </div>
  );
}
