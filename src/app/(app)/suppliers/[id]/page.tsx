"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, Clock, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";

import { useBusiness } from "@/contexts/BusinessContext";
import { useShop } from "@/contexts/ShopContext";
import { SupplierService } from "@/lib/suppliers/service";
import { formatCurrency, toMinorUnit } from "@/lib/utils/currency";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Supplier, SupplierLedgerEntry } from "@/types";

export default function SupplierLedgerPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { business, member } = useBusiness();
  const { activeShop } = useShop();
  
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [entries, setEntries] = useState<SupplierLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLedger = useCallback(async () => {
    if (!business || !activeShop || !id) return;
    try {
      setLoading(true);
      const [supData, ledgerData] = await Promise.all([
        SupplierService.getSupplier(business.id, activeShop.id, id),
        SupplierService.getSupplierLedger(business.id, activeShop.id, id)
      ]);
      
      if (!supData) {
        toast.error("Supplier not found");
        router.push("/suppliers");
        return;
      }
      
      setSupplier(supData);
      setEntries(ledgerData);
    } catch (err) {
      toast.error("Failed to load ledger");
    } finally {
      setLoading(false);
    }
  }, [business, activeShop, id, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLedger();
  }, [fetchLedger]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !activeShop || !member || !supplier) return;
    
    const amountMinor = toMinorUnit(paymentAmount);
    if (amountMinor <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }
    if (amountMinor > supplier.currentBalanceMinor) {
      if (!confirm("Payment amount exceeds current balance. Continue?")) return;
    }

    try {
      setIsSubmitting(true);
      await SupplierService.recordSupplierPayment(
        business.id,
        activeShop.id,
        supplier.id, 
        amountMinor, 
        member.uid, 
        paymentNotes
      );
      toast.success("Payment recorded successfully");
      setIsPaymentModalOpen(false);
      setPaymentAmount("");
      setPaymentNotes("");
      await fetchLedger();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch(type) {
      case 'credit_purchase': return <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-medium">Purchase (Credit)</span>;
      case 'payment': return <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-medium">Payment Made</span>;
      case 'return': return <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium">Goods Returned</span>;
      default: return <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">{type}</span>;
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading ledger...</div>;
  }
  
  if (!supplier) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto h-full flex flex-col">
      <div className="mb-6">
        <button 
          onClick={() => router.push("/suppliers")}
          className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Suppliers
        </button>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{supplier.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              {supplier.phone && <span>📞 {supplier.phone}</span>}
              {supplier.email && <span>✉️ {supplier.email}</span>}
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-right shrink-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Current Payables</p>
            <p className={`text-3xl font-bold ${supplier.currentBalanceMinor > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(supplier.currentBalanceMinor, business?.currency)}
            </p>
            {supplier.currentBalanceMinor > 0 && (
              <Button 
                onClick={() => setIsPaymentModalOpen(true)} 
                className="w-full mt-3 h-9"
              >
                <CreditCard className="w-4 h-4 mr-2" /> Record Payment
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white flex-1 rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[400px]">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="font-semibold text-gray-900 flex items-center">
            <FileText className="w-4 h-4 mr-2 text-gray-400" /> Ledger Transaction History
          </h2>
          {/* Mock export button for UI purposes */}
          <button className="text-sm text-[#3B82F6] font-medium flex items-center hover:underline">
            <Download className="w-4 h-4 mr-1" /> Export PDF
          </button>
        </div>
        
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10 border-b border-gray-200">
              <tr className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Ref/Notes</th>
                <th className="px-6 py-4 text-right">Debit (You Paid)</th>
                <th className="px-6 py-4 text-right">Credit (You Owe)</th>
                <th className="px-6 py-4 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-500">No ledger history found for this supplier.</td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const isPayment = entry.type === 'payment' || entry.type === 'return';
                  const debit = isPayment ? entry.amountMinor : null;
                  const credit = !isPayment ? entry.amountMinor : null;
                  
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm font-medium text-gray-900">
                          <Clock className="w-3 h-3 mr-1.5 text-gray-400" />
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500 ml-4.5">{new Date(entry.createdAt).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        {getTypeBadge(entry.type)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {entry.referenceId || "—"}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-green-600">
                        {debit ? formatCurrency(debit, business?.currency) : "—"}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-red-600">
                        {credit ? formatCurrency(credit, business?.currency) : "—"}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 bg-gray-50/50">
                        {formatCurrency(entry.balanceAfterMinor, business?.currency)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog.Root open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 animate-in fade-in" />
          <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-md glass-card border border-white/20 rounded-xl shadow-xl z-50 p-6 focus:outline-none animate-in zoom-in-95">
            <Dialog.Title className="text-xl font-bold text-gray-900 mb-4">Record Payment</Dialog.Title>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Amount ({business?.currency}) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference / Notes
                </label>
                <Input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Bank Transfer TXN-123"
                />
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
                <Button type="submit" isLoading={isSubmitting}>Confirm Payment</Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
}
