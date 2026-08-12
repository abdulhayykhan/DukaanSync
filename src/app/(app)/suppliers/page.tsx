"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, ChevronRight, UserCog } from "lucide-react";
import { toast } from "sonner";

import { useBusiness } from "@/contexts/BusinessContext";
import { useShop } from "@/contexts/ShopContext";
import { SupplierService } from "@/lib/suppliers/service";
import { formatCurrency } from "@/lib/utils/currency";
import { SupplierModal } from "@/components/suppliers/SupplierModal";
import { BulkImportModal } from "@/components/ui/BulkImportModal";
import { ExportDropdown } from "@/components/ui/ExportDropdown";
import { exportToCSV, exportToExcel } from "@/lib/utils/exportData";
import { buildNormalizedRow, getField } from "@/lib/utils/importNormalize";
import { format } from "date-fns";
import { UploadCloud } from "lucide-react";
import { toMinorUnit } from "@/lib/utils/currency";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Supplier } from "@/types";

const IMPORT_COLUMNS = ["supplierName", "phone", "email", "initialPayableBalance"];
const IMPORT_SAMPLE = [
  { supplierName: "Tech Wholesalers", phone: "03001234567", email: "sales@techwholesale.com", initialPayableBalance: 15000 },
  { supplierName: "General Goods Inc", phone: "03211234567", email: "", initialPayableBalance: 0 }
];

export default function SuppliersPage() {
  const { business, memberRole } = useBusiness();
  const { activeShop } = useShop();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Cashiers should not see suppliers at all
  const isReadOnly = memberRole === "cashier";

  const fetchSuppliers = useCallback(async () => {
    if (!business || !activeShop) return;
    setLoading(true);
    try {
      const data = await SupplierService.getSuppliers(business.id, activeShop.id);
      setSuppliers(data);
    } catch {
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, [business, activeShop]);

  useEffect(() => {
    if (!isReadOnly) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchSuppliers();
    }
  }, [fetchSuppliers, isReadOnly]);

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.phone && s.phone.includes(searchQuery))
  );

  const handleValidateSupplierRow = (row: Record<string, string | number | boolean | null>) => {
    const norm = buildNormalizedRow(row);

    const name = String(
      getField(norm, ["suppliername", "supplier_name", "name", "vendor", "vendorname", "company"]) ?? ""
    ).trim();
    if (!name) return { isValid: false, errors: ["Supplier Name is required"] };

    const phone = String(
      getField(norm, ["phone", "phonenumber", "phone_number", "mobile", "contact"]) ?? ""
    ).trim();

    const email = String(
      getField(norm, ["email", "emailaddress", "email_address"]) ?? ""
    ).trim();

    const rawBalance = getField(norm, [
      "initialpayablebalance", "payablebalance", "balance",
      "payables", "openingbalance", "debitbalance"
    ]);
    const balance = parseFloat(String(rawBalance ?? "0"));
    if (isNaN(balance) || balance < 0) {
      return { isValid: false, errors: ["Invalid balance — must be a non-negative number"] };
    }

    return {
      isValid: true,
      data: { name, phone, email, currentBalanceMinor: toMinorUnit(balance) }
    };
  };

  const handleExport = (formatType: "csv" | "excel") => {
    const exportData = filteredSuppliers.map(s => ({
      "Name": s.name,
      "Phone": s.phone || "N/A",
      "Email": s.email || "N/A",
      "Payable Balance (PKR)": (s.currentBalanceMinor / 100).toFixed(2),
      "Registered On": format(new Date(s.createdAt), "yyyy-MM-dd")
    }));

    const dateStr = format(new Date(), "yyyy-MM-dd");
    const filename = `DukaanSync_Suppliers_${activeShop?.id || 'all'}_${dateStr}`;

    if (formatType === "csv") {
      exportToCSV({ filename, data: exportData });
    } else {
      exportToExcel({ filename, data: exportData });
    }
  };

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
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
          <p className="text-sm text-slate-500 mt-1">Manage wholesale vendors and payables.</p>
        </div>
        <div className="shrink-0 flex items-center gap-3">
          <ExportDropdown onExport={handleExport} />
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="h-10 inline-flex items-center gap-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors shadow-sm shrink-0 whitespace-nowrap"
          >
            <UploadCloud className="h-4 w-4 shrink-0" /> Import
          </button>
          <Button 
            onClick={() => setIsModalOpen(true)} 
            className="px-4 py-2 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shrink-0 whitespace-nowrap inline-flex items-center gap-2 w-auto"
          >
            <Plus className="h-4 w-4 shrink-0" /> Add Supplier
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Suppliers</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{suppliers.length}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <UserCog className="h-6 w-6" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Payables</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalPayables, business?.currency)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col min-h-[400px] hover:shadow-md transition-shadow">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200 shadow-sm">
              <tr className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-6 py-4">Supplier Name</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 text-right">Current Balance</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading suppliers...</td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-500">No suppliers found.</td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-gray-900">{supplier.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {supplier.location ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-medium">
                          📍 {supplier.location}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{supplier.phone || "—"}</div>
                      <div className="text-xs text-gray-500">{supplier.email || "—"}</div>
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

      <BulkImportModal<{ name: string; phone: string; email: string; currentBalanceMinor: number }>
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Suppliers"
        sampleData={IMPORT_SAMPLE}
        expectedColumns={IMPORT_COLUMNS}
        onValidateRow={handleValidateSupplierRow}
        onImport={(validRows, strategy, onProgress) =>
          SupplierService.bulkImportSuppliers(business!.id, activeShop!.id, validRows, strategy, onProgress)
        }
        onSuccess={fetchSuppliers}
      />
    </div>
  );
}
