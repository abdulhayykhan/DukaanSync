"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  FileText, 
  Search, 
  Eye, 
  ShoppingBag, 
  ShoppingCart, 
  User, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowUpDown,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { useBusiness } from "@/contexts/BusinessContext";
import { useShop } from "@/contexts/ShopContext";
import { SaleTransactionService } from "@/lib/sales/transaction";
import { PurchaseService } from "@/lib/purchases/service";
import { CustomerService } from "@/lib/customers/service";
import { SupplierService } from "@/lib/suppliers/service";
import { formatCurrency } from "@/lib/utils/currency";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { InvoiceDocModal } from "@/components/invoices/InvoiceDocModal";
import type { Sale, Purchase, Customer, Supplier } from "@/types";

type ActiveTab = "sales" | "purchases";

export default function InvoicesPage() {
  const { business } = useBusiness();
  const { activeShop } = useShop();

  const [activeTab, setActiveTab] = useState<ActiveTab>("sales");
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [customerMap, setCustomerMap] = useState<Record<string, Customer>>({});
  const [supplierMap, setSupplierMap] = useState<Record<string, Supplier>>({});

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "partial" | "unpaid">("all");

  // Selected document for preview modal
  const [selectedDoc, setSelectedDoc] = useState<Sale | Purchase | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<"sale" | "purchase">("sale");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (!business || !activeShop) return;
    setLoading(true);
    try {
      const [salesData, purchasesData, customersData, suppliersData] = await Promise.all([
        SaleTransactionService.getRecentSales(business.id, activeShop.id, 300),
        PurchaseService.getPurchases(business.id, activeShop.id, 300),
        CustomerService.getCustomers(business.id, activeShop.id),
        SupplierService.getSuppliers(business.id, activeShop.id),
      ]);

      setSales(salesData || []);
      setPurchases(purchasesData || []);

      const cMap: Record<string, Customer> = {};
      (customersData || []).forEach(c => { cMap[c.id] = c; });
      setCustomerMap(cMap);

      const sMap: Record<string, Supplier> = {};
      (suppliersData || []).forEach(s => { sMap[s.id] = s; });
      setSupplierMap(sMap);

    } catch (err) {
      console.error("Error loading invoice documents:", err);
      toast.error("Failed to load invoice documents");
    } finally {
      setLoading(false);
    }
  }, [business, activeShop]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Filtering
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (statusFilter !== "all" && s.paymentStatus !== statusFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.invoiceNumber?.toLowerCase().includes(q) ||
        s.customerName?.toLowerCase().includes(q) ||
        s.paymentMethod?.toLowerCase().includes(q)
      );
    });
  }, [sales, searchQuery, statusFilter]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      if (statusFilter !== "all" && p.paymentStatus !== statusFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const sName = supplierMap[p.supplierId]?.name || "";
      return (
        p.purchaseNumber?.toLowerCase().includes(q) ||
        sName.toLowerCase().includes(q) ||
        p.paymentMethod?.toLowerCase().includes(q)
      );
    });
  }, [purchases, supplierMap, searchQuery, statusFilter]);

  const openDocPreview = (doc: Sale | Purchase, type: "sale" | "purchase") => {
    setSelectedDoc(doc);
    setSelectedDocType(type);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        );
      case "partial":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
            <Clock className="w-3 h-3" /> Partial
          </span>
        );
      case "unpaid":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-semibold">
            <AlertCircle className="w-3 h-3" /> Unpaid
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">{status}</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-[#10B981]" /> Invoices & Receipts
          </h1>
          <p className="text-lg text-gray-500 mt-1">
            Access itemized sale receipts, purchase orders, and export financial documents.
          </p>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        
        {/* Tab Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab("sales")}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "sales"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-slate-500 hover:text-gray-900"
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-blue-500" /> Sales Invoices ({sales.length})
          </button>
          <button
            onClick={() => setActiveTab("purchases")}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "purchases"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-slate-500 hover:text-gray-900"
            }`}
          >
            <ShoppingCart className="w-4 h-4 text-purple-500" /> Purchase Orders ({purchases.length})
          </button>
        </div>

        {/* Filter Tools */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={`Search ${activeTab === "sales" ? "sale invoice # or customer" : "PO # or supplier"}...`}
              className="pl-9 h-10 text-sm bg-gray-50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#10B981]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid / Credit</option>
          </select>
        </div>

      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col min-h-[400px]">
        <div className="overflow-x-auto flex-1">
          {activeTab === "sales" ? (
            /* Sales Invoices Table */
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200 shadow-sm">
                <tr className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4 text-center">Payment Method</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Grand Total</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-6 h-6 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs">Loading sales invoices...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                      <FileText className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                      <p className="font-semibold text-gray-700">No sale invoices found</p>
                      <p className="text-xs text-gray-400 mt-1">Completed POS sales will automatically appear here.</p>
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => {
                    return (
                      <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-sm text-gray-900">
                          {sale.invoiceNumber || sale.id}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-600">
                          {sale.createdAt ? format(new Date(sale.createdAt), "MMM dd, yyyy - hh:mm a") : "—"}
                        </td>
                        <td className="px-6 py-4 font-medium text-sm text-gray-900">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-blue-500" />
                            {sale.customerName || "Guest Customer"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="capitalize text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700">
                            {sale.paymentMethod || "cash"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getStatusBadge(sale.paymentStatus || "paid")}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900 text-sm">
                          {formatCurrency(sale.grandTotalMinor, business?.currency)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDocPreview(sale, "sale")}
                            className="h-8 px-3 text-xs font-semibold gap-1 text-[#10B981] hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                          >
                            <Eye className="w-3.5 h-3.5" /> View / Export
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* Purchase Invoices Table */
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200 shadow-sm">
                <tr className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  <th className="px-6 py-4">PO #</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Supplier Name</th>
                  <th className="px-6 py-4 text-center">Payment Method</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Grand Total</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-6 h-6 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs">Loading purchase invoices...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                      <FileText className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                      <p className="font-semibold text-gray-700">No purchase invoices found</p>
                      <p className="text-xs text-gray-400 mt-1">Recorded stock purchases will automatically appear here.</p>
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((purchase) => {
                    const supName = supplierMap[purchase.supplierId]?.name || "Direct Supplier";
                    return (
                      <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-sm text-gray-900">
                          {purchase.purchaseNumber || purchase.id}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-600">
                          {purchase.createdAt ? format(new Date(purchase.createdAt), "MMM dd, yyyy - hh:mm a") : "—"}
                        </td>
                        <td className="px-6 py-4 font-medium text-sm text-gray-900">
                          <div className="flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-purple-500" />
                            {supName}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="capitalize text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700">
                            {purchase.paymentMethod || "cash"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getStatusBadge(purchase.paymentStatus || "paid")}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900 text-sm">
                          {formatCurrency(purchase.grandTotalMinor, business?.currency)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDocPreview(purchase, "purchase")}
                            className="h-8 px-3 text-xs font-semibold gap-1 text-[#10B981] hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                          >
                            <Eye className="w-3.5 h-3.5" /> View / Export
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Itemized Document Preview & Export Modal */}
      <InvoiceDocModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        document={selectedDoc}
        docType={selectedDocType}
        businessName={business?.name || "DukaanSync Business"}
        shopName={activeShop?.name || "Main Branch"}
        shopLocation={activeShop?.address}
        currency={business?.currency || "PKR"}
        supplierNameMap={supplierMap}
        customerNameMap={customerMap}
      />

    </div>
  );
}
