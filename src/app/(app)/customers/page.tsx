"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Users, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useBusiness } from "@/contexts/BusinessContext";
import { useShop } from "@/contexts/ShopContext";
import { CustomerService } from "@/lib/customers/service";
import { formatCurrency } from "@/lib/utils/currency";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { BulkImportModal } from "@/components/ui/BulkImportModal";
import { ExportDropdown } from "@/components/ui/ExportDropdown";
import { exportToCSV, exportToExcel } from "@/lib/utils/exportData";
import { buildNormalizedRow, getField } from "@/lib/utils/importNormalize";
import { format } from "date-fns";
import { UploadCloud } from "lucide-react";
import { toMinorUnit } from "@/lib/utils/currency";
import type { Customer } from "@/types";
import { toast } from "sonner";

const IMPORT_COLUMNS = ["customerName", "phone", "email", "initialOutstandingBalance"];
const IMPORT_SAMPLE = [
  { customerName: "Ahmed Raza", phone: "03001234567", email: "ahmed@example.com", initialOutstandingBalance: 0 },
  { customerName: "Fatima Ali", phone: "03211234567", email: "", initialOutstandingBalance: 5000 }
];

export default function CustomersPage() {
  const { business, memberRole } = useBusiness();
  const { activeShop } = useShop();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();

  const isReadOnly = memberRole === "cashier";

  const loadCustomers = useCallback(async () => {
    if (!business || !activeShop) return;
    setLoading(true);
    try {
      const data = await CustomerService.getCustomers(business.id, activeShop.id);
      setCustomers(data);
    } catch (err) {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [business, activeShop]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleEdit = (customer: Customer) => {
    if (isReadOnly) return;
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedCustomer(undefined);
    setIsModalOpen(true);
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  const handleValidateCustomerRow = (row: Record<string, string | number | boolean | null>) => {
    const norm = buildNormalizedRow(row);

    // Flexible alias resolution
    const name = String(
      getField(norm, ["customername", "customer_name", "name", "fullname", "client"]) ?? ""
    ).trim();
    if (!name) return { isValid: false, errors: ["Customer Name is required"] };

    const phone = String(
      getField(norm, ["phone", "phonenumber", "phone_number", "mobile", "contact"]) ?? ""
    ).trim();

    const email = String(
      getField(norm, ["email", "emailaddress", "email_address"]) ?? ""
    ).trim();

    const rawBalance = getField(norm, [
      "initialoutstandingbalance", "outstandingbalance", "balance",
      "receivables", "openingbalance", "creditbalance"
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
    const exportData = filtered.map(c => ({
      "Name": c.name,
      "Phone": c.phone || "N/A",
      "Email": c.email || "N/A",
      "Outstanding Balance (PKR)": (c.currentBalanceMinor / 100).toFixed(2),
      "Registered On": format(new Date(c.createdAt), "yyyy-MM-dd")
    }));

    const dateStr = format(new Date(), "yyyy-MM-dd");
    const filename = `DukaanSync_Customers_${activeShop?.id || 'all'}_${dateStr}`;

    if (formatType === "csv") {
      exportToCSV({ filename, data: exportData });
    } else {
      exportToExcel({ filename, data: exportData });
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your customers and track receivables.</p>
        </div>
        {!isReadOnly && (
          <div className="shrink-0 flex items-center gap-3">
            <ExportDropdown onExport={handleExport} />
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="h-10 inline-flex items-center gap-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors shadow-sm shrink-0 whitespace-nowrap"
            >
              <UploadCloud className="h-4 w-4 shrink-0" /> Import
            </button>
            <Button 
              onClick={handleAddNew} 
              className="px-4 py-2 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shrink-0 whitespace-nowrap inline-flex items-center gap-2 w-auto"
            >
              <Plus className="h-4 w-4 shrink-0" /> Add Customer
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search customers..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-sm text-slate-600 flex items-center">
          <Users className="w-4 h-4 mr-2 text-slate-400" />
          <span>{filtered.length} Customers</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col min-h-[400px] hover:shadow-md transition-shadow">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10 border-b border-gray-200">
              <tr className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-6 py-4">Customer Details</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 text-right">Outstanding Receivables</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">Loading customers...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-gray-500">No customers found.</td>
                </tr>
              ) : (
                filtered.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-sm text-gray-900">{customer.name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">Added {new Date(customer.createdAt).toLocaleDateString()}</span>
                        {customer.location && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                            📍 {customer.location}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{customer.phone || "—"}</div>
                      <div className="text-sm text-gray-500">{customer.email}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-sm font-bold ${customer.currentBalanceMinor > 0 ? 'text-blue-600' : 'text-gray-900'}`}>
                        {formatCurrency(customer.currentBalanceMinor, business?.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-3">
                        <Link href={`/customers/${customer.id}`}>
                          <Button variant="outline" className="h-8 text-sm">
                            <ExternalLink className="w-4 h-4 mr-1.5" /> Ledger
                          </Button>
                        </Link>
                        {!isReadOnly && (
                          <button 
                            onClick={() => handleEdit(customer)}
                            className="text-sm text-[#3B82F6] hover:underline font-medium"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CustomerModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadCustomers}
        customer={selectedCustomer}
      />

      <BulkImportModal<{ name: string; phone: string; email: string; currentBalanceMinor: number }>
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Customers"
        sampleData={IMPORT_SAMPLE}
        expectedColumns={IMPORT_COLUMNS}
        onValidateRow={handleValidateCustomerRow}
        onImport={(validRows, strategy, onProgress) =>
          CustomerService.bulkImportCustomers(business!.id, activeShop!.id, validRows, strategy, onProgress)
        }
        onSuccess={loadCustomers}
      />
    </div>
  );
}
