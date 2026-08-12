"use client";

import { useState, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Printer, Download, Store, User, Truck, Calendar, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { exportToCSV, exportToExcel } from "@/lib/utils/exportData";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import type { Sale, Purchase, Customer, Supplier } from "@/types";

interface InvoiceDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Sale | Purchase | null;
  docType: "sale" | "purchase";
  businessName?: string;
  shopName?: string;
  shopLocation?: string;
  currency?: string;
  supplierNameMap?: Record<string, Supplier>;
  customerNameMap?: Record<string, Customer>;
}

export function InvoiceDocModal({
  isOpen,
  onClose,
  document,
  docType,
  businessName = "DukaanSync Store",
  shopName = "Main Branch",
  shopLocation,
  currency = "PKR",
  supplierNameMap = {},
  customerNameMap = {},
}: InvoiceDocModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!document) return null;

  const isSale = docType === "sale";
  const sale = isSale ? (document as Sale) : null;
  const purchase = !isSale ? (document as Purchase) : null;

  const invoiceNum = isSale
    ? sale?.invoiceNumber || document.id
    : purchase?.purchaseNumber || document.id;

  const createdDate = document.createdAt ? new Date(document.createdAt) : new Date();

  // Billed party info
  let partyName = "Guest Customer";
  let partyContact = "";
  let partyLocation = "";

  if (isSale) {
    partyName = sale?.customerName || "Guest Customer";
    if (sale?.customerId && customerNameMap[sale.customerId]) {
      const cust = customerNameMap[sale.customerId];
      partyContact = cust.phone || "";
      partyLocation = cust.location || "";
    }
  } else {
    if (purchase?.supplierId && supplierNameMap[purchase.supplierId]) {
      const sup = supplierNameMap[purchase.supplierId];
      partyName = sup.name;
      partyContact = sup.phone || "";
      partyLocation = sup.city || sup.location || "";
    } else {
      partyName = "Direct Supplier";
    }
  }

  // Financial calculations
  const subtotal = document.subtotalMinor || 0;
  const discount = document.discountMinor || 0;
  const tax = isSale ? (sale?.taxMinor || 0) : 0;
  const extraCost = !isSale ? (purchase?.extraCostsMinor || purchase?.extraCostMinor || 0) : 0;
  const grandTotal = document.grandTotalMinor || 0;
  const paid = document.amountPaidMinor || 0;
  const balanceRemaining = Math.max(0, grandTotal - paid);

  const paymentStatus = document.paymentStatus || "paid";

  const getStatusBadge = () => {
    switch (paymentStatus) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
          </span>
        );
      case "partial":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Partial Credit
          </span>
        );
      case "unpaid":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold border border-red-200">
            <AlertCircle className="w-3.5 h-3.5" /> Unpaid / Credit
          </span>
        );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportData = (formatType: "csv" | "excel") => {
    setIsExporting(true);
    try {
      const items = document.items || [];
      const exportRows = items.map((item, idx) => {
        const uCost = isSale
          ? (item as any).unitPriceMinor || 0
          : (item as any).unitCostMinor || 0;
        return {
          "Line #": idx + 1,
          "Invoice #": invoiceNum,
          "Date": format(createdDate, "yyyy-MM-dd HH:mm"),
          "Party Name": partyName,
          "Item SKU": item.sku || "N/A",
          "Item Name": item.name,
          "Quantity": item.quantity,
          [`Unit Price (${currency})`]: (uCost / 100).toFixed(2),
          [`Discount (${currency})`]: ((item.discountMinor || 0) / 100).toFixed(2),
          [`Line Total (${currency})`]: ((item.totalMinor || 0) / 100).toFixed(2),
        };
      });

      const dateStr = format(new Date(), "yyyy-MM-dd");
      const filename = `Invoice_${invoiceNum}_${dateStr}`;

      if (formatType === "csv") {
        exportToCSV({ filename, data: exportRows });
      } else {
        exportToExcel({ filename, data: exportRows });
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] animate-in fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl z-[70] p-6 sm:p-8 focus:outline-none animate-in zoom-in-95">
          
          {/* Header Action Bar */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 print:hidden">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider">
                {isSale ? "Sale Invoice" : "Purchase Order Invoice"}
              </span>
              <span className="text-sm font-mono text-gray-500 font-bold">{invoiceNum}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 text-xs font-semibold">
                <Printer className="w-3.5 h-3.5" /> Print / PDF
              </Button>

              <Button size="sm" variant="outline" onClick={() => handleExportData("csv")} isLoading={isExporting} className="gap-1.5 text-xs font-semibold">
                <Download className="w-3.5 h-3.5" /> CSV Export
              </Button>

              <Dialog.Close asChild>
                <button className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Printable Invoice Container */}
          <div ref={printRef} className="space-y-6 text-gray-900 font-sans">
            
            {/* Shop & Invoice Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-gray-200">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Store className="w-6 h-6 text-[#10B981]" />
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{shopName}</h1>
                </div>
                <p className="text-xs text-gray-500 font-medium">{businessName}</p>
                {shopLocation && <p className="text-xs text-gray-500 mt-0.5">📍 {shopLocation}</p>}
              </div>

              <div className="sm:text-right">
                <h2 className="text-xl font-bold text-gray-900 font-mono tracking-tight">{invoiceNum}</h2>
                <div className="flex items-center sm:justify-end gap-1.5 text-xs text-gray-500 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {format(createdDate, "EEEE, MMMM dd, yyyy - hh:mm a")}
                </div>
                <div className="mt-2.5">
                  {getStatusBadge()}
                </div>
              </div>
            </div>

            {/* Billed Party Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200/80">
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  {isSale ? "Billed To (Customer)" : "Supplier Details"}
                </span>
                <p className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  {isSale ? <User className="w-4 h-4 text-blue-500" /> : <Truck className="w-4 h-4 text-purple-500" />}
                  {partyName}
                </p>
                {partyContact && <p className="text-xs text-gray-600 mt-0.5">📞 {partyContact}</p>}
                {partyLocation && <p className="text-xs text-gray-600 mt-0.5">📍 {partyLocation}</p>}
              </div>

              <div className="sm:text-right">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Payment Terms
                </span>
                <p className="text-xs font-semibold text-gray-800 capitalize">
                  Method: <span className="font-bold text-gray-900">{document.paymentMethod}</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Status: <span className="capitalize font-medium">{paymentStatus}</span>
                </p>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500">
                    <th className="py-3 px-4">Item & SKU</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-4 text-right">Discount</th>
                    <th className="py-3 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(document.items || []).map((item, index) => {
                    const uCost = isSale
                      ? (item as any).unitPriceMinor || 0
                      : (item as any).unitCostMinor || 0;
                    return (
                      <tr key={index} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-gray-900">{item.name}</p>
                          <p className="text-xs font-mono text-gray-400">SKU: {item.sku || "N/A"}</p>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-gray-800">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-700">
                          {formatCurrency(uCost, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-red-500 text-xs">
                          {item.discountMinor && item.discountMinor > 0 ? `- ${formatCurrency(item.discountMinor, currency)}` : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-gray-900 font-mono">
                          {formatCurrency(item.totalMinor, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="flex flex-col sm:flex-row justify-end">
              <div className="w-full sm:w-72 space-y-2.5 bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatCurrency(subtotal, currency)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Discount</span>
                    <span className="font-semibold">- {formatCurrency(discount, currency)}</span>
                  </div>
                )}

                {extraCost > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Transport / Extra Fee</span>
                    <span className="font-semibold">+ {formatCurrency(extraCost, currency)}</span>
                  </div>
                )}

                {tax > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span className="font-semibold">+ {formatCurrency(tax, currency)}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Grand Total</span>
                  <span className="text-[#10B981]">{formatCurrency(grandTotal, currency)}</span>
                </div>

                <div className="flex justify-between text-xs text-gray-600 pt-1">
                  <span>Amount Paid</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(paid, currency)}</span>
                </div>

                {balanceRemaining > 0 && (
                  <div className="flex justify-between text-xs font-bold text-amber-700 pt-1 border-t border-amber-200/60">
                    <span>Remaining Balance</span>
                    <span>{formatCurrency(balanceRemaining, currency)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
              <p>Thank you for doing business with {shopName}! Built with DukaanSync.</p>
            </div>

          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
