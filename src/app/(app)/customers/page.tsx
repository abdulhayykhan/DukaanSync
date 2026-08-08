"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Users, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useBusiness } from "@/contexts/BusinessContext";
import { CustomerService } from "@/lib/customers/service";
import { formatCurrency } from "@/lib/utils/currency";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CustomerModal } from "@/components/customers/CustomerModal";
import type { Customer } from "@/types";

export default function CustomersPage() {
  const { business, memberRole } = useBusiness();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();

  const isReadOnly = memberRole === "cashier";

  const loadCustomers = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    try {
      const data = await CustomerService.getCustomers(business.id);
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [business]);

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your customers and track receivables.</p>
        </div>
        {!isReadOnly && (
          <Button onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" /> Add Customer
          </Button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search customers..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-sm text-gray-600 flex items-center">
          <Users className="w-4 h-4 mr-2 text-gray-400" />
          <span>{filtered.length} Customers</span>
        </div>
      </div>

      <div className="bg-white flex-1 rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[400px]">
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
                      <p className="text-xs text-gray-400">Added {new Date(customer.createdAt).toLocaleDateString()}</p>
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
    </div>
  );
}
