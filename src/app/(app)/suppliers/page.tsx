"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, ChevronRight, UserCog } from "lucide-react";
import { toast } from "sonner";

import { useBusiness } from "@/contexts/BusinessContext";
import { SupplierService } from "@/lib/suppliers/service";
import { formatCurrency } from "@/lib/utils/currency";
import { SupplierModal } from "@/components/suppliers/SupplierModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Supplier } from "@/types";

export default function SuppliersPage() {
  const { business, memberRole } = useBusiness();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Cashiers should not see suppliers at all
  const isReadOnly = memberRole === "cashier";

  const fetchSuppliers = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    try {
      const data = await SupplierService.getSuppliers(business.id);
      setSuppliers(data);
    } catch (err) {
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    if (!isReadOnly) {
      fetchSuppliers();
    }
  }, [fetchSuppliers, isReadOnly]);

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.phone && s.phone.includes(searchQuery))
  );

  if (isReadOnly) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <UserCog className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 max-w-md">You do not have the required permissions to view the supplier directory.</p>
      </div>
    );
  }

  const totalPayables = suppliers.reduce((acc, s) => acc + s.currentBalanceMinor, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage wholesale vendors and payables.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto shrink-0">
          <Plus className="mr-2 h-4 w-4" /> Add Supplier
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Suppliers</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{suppliers.length}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <UserCog className="h-6 w-6" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Payables</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalPayables, business?.currency)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search suppliers by name or phone..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white flex-1 rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[400px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200 shadow-sm">
              <tr className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-6 py-4">Supplier Name</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 text-right">Current Balance</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">Loading suppliers...</td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-gray-500">No suppliers found.</td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-gray-900">{supplier.name}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{supplier.phone || "—"}</div>
                      <div className="text-xs text-gray-500">{supplier.email}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-sm font-bold ${supplier.currentBalanceMinor > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(supplier.currentBalanceMinor, business?.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link 
                        href={`/suppliers/${supplier.id}`}
                        className="inline-flex items-center text-sm font-medium text-[#3B82F6] hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
                      >
                        View Ledger <ChevronRight className="ml-1 w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SupplierModal 
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={fetchSuppliers}
      />
    </div>
  );
}
