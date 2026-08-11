"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Search, Filter, Trash2, Calendar, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";

import { useBusiness } from "@/contexts/BusinessContext";
import { useShop } from "@/contexts/ShopContext";
import { ExpenseService } from "@/lib/expenses/service";
import { formatCurrency, toMinorUnit } from "@/lib/utils/currency";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ExportDropdown } from "@/components/ui/ExportDropdown";
import { exportToCSV, exportToExcel } from "@/lib/utils/exportData";
import type { Expense, ExpenseCategory } from "@/types";
import { parseISO, format } from "date-fns";

const CATEGORIES: { value: ExpenseCategory, label: string }[] = [
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "salary", label: "Salary" },
  { value: "transport", label: "Transport" },
  { value: "marketing", label: "Marketing" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" }
];

export default function ExpensesPage() {
  const { business, member } = useBusiness();
  const { activeShop } = useShop();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    amount: "",
    category: "other" as ExpenseCategory,
    paymentMethod: "cash" as "cash" | "bank" | "card",
    description: "",
    date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
  });

  const loadExpenses = useCallback(async () => {
    if (!business || !activeShop) return;
    try {
      setLoading(true);
      const data = await ExpenseService.getExpenses(business.id, activeShop.id);
      setExpenses(data);
    } catch (err) {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [business, activeShop]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchCat = categoryFilter === "all" || exp.category === categoryFilter;
      const matchSearch = !searchQuery || (exp.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [expenses, categoryFilter, searchQuery]);

  const totalFilteredAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + exp.amountMinor, 0);
  }, [filteredExpenses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !activeShop || !member) return;

    const amountMinor = toMinorUnit(formData.amount);
    if (amountMinor <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // We parse the local date string into a full ISO timestamp
      // Assuming the user is inputting for today, or past days at roughly midnight local time
      const dateIso = new Date(formData.date).toISOString();

      await ExpenseService.createExpense(business.id, activeShop.id, {
        category: formData.category,
        amountMinor,
        description: formData.description,
        paymentMethod: formData.paymentMethod,
        date: dateIso,
        createdBy: member.uid
      });

      toast.success("Expense logged successfully");
      setIsModalOpen(false);
      setFormData({
        amount: "",
        category: "other",
        paymentMethod: "cash",
        description: "",
        date: new Date().toISOString().split('T')[0]
      });
      await loadExpenses();
    } catch (err: any) {
      toast.error(err.message || "Failed to log expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (expenseId: string) => {
    if (!business || !activeShop) return;
    if (member?.role !== 'owner' && member?.role !== 'manager') {
      toast.error("Unauthorized. Only owners and managers can delete expenses.");
      return;
    }
    if (!confirm("Are you sure you want to delete this expense? This action affects P&L.")) return;

    try {
      await ExpenseService.deleteExpense(business.id, activeShop.id, expenseId);
      toast.success("Expense deleted");
      setExpenses(prev => prev.filter(e => e.id !== expenseId));
    } catch (err) {
      toast.error("Failed to delete expense");
    }
  };

  const handleExport = (formatType: "csv" | "excel") => {
    const exportData = filteredExpenses.map(e => ({
      "Date": format(parseISO(e.date), 'yyyy-MM-dd'),
      "Category": CATEGORIES.find(c => c.value === e.category)?.label || e.category,
      "Description": e.description || "",
      "Payment Method": e.paymentMethod,
      "Amount (PKR)": (e.amountMinor / 100).toFixed(2)
    }));

    const dateStr = format(new Date(), "yyyy-MM-dd");
    const filename = `DukaanSync_Expenses_${activeShop?.id || 'all'}_${dateStr}`;

    if (formatType === "csv") {
      exportToCSV({ filename, data: exportData });
    } else {
      exportToExcel({ filename, data: exportData });
    }
  };

  if (!business || !activeShop) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operating Expenses</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track shop expenses for P&L deductions.</p>
        </div>
        <div className="flex gap-2">
          <ExportDropdown onExport={handleExport} />
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Log Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Listed</span>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalFilteredAmount, business.currency)}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:col-span-2">
           <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Category Breakdown (Filtered)</span>
           <div className="flex flex-wrap gap-2 mt-1">
             {CATEGORIES.map(cat => {
               const catTotal = filteredExpenses.filter(e => e.category === cat.value).reduce((s, e) => s + e.amountMinor, 0);
               if (catTotal === 0) return null;
               return (
                 <div key={cat.value} className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                   <span className="font-medium text-gray-600 mr-2">{cat.label}:</span>
                   <span className="font-bold text-gray-900">{formatCurrency(catTotal, business.currency)}</span>
                 </div>
               );
             })}
           </div>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search description..." 
              className="pl-9 h-9 text-sm bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select 
              className="pl-9 pr-8 h-9 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#10B981] appearance-none"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10 border-b border-gray-200">
              <tr className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-500">Loading expenses...</td></tr>
              ) : filteredExpenses.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-500">No expenses found matching filters.</td></tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm font-medium text-gray-900">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {format(parseISO(exp.date), 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium uppercase tracking-wider">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {exp.description || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-600 capitalize">
                        {exp.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                      {formatCurrency(exp.amountMinor, business.currency)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {(member?.role === 'owner' || member?.role === 'manager') && (
                        <button 
                          onClick={() => handleDelete(exp.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Expense"
                          aria-label={`Delete expense: ${exp.description || exp.category}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 animate-in fade-in" />
          <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-md glass-card border border-white/20 rounded-xl shadow-xl z-50 p-6 focus:outline-none animate-in zoom-in-95">
            <Dialog.Title className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" /> Log New Expense
            </Dialog.Title>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
                  <Input 
                    type="date" 
                    required 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                  <select 
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value as ExpenseCategory})}
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ({business.currency}) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {(["cash", "card", "bank"] as const).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setFormData({...formData, paymentMethod: method})}
                      className={`py-2 rounded-lg text-sm font-medium capitalize border transition-all ${
                        formData.paymentMethod === method 
                          ? 'bg-blue-50 border-blue-200 text-blue-700' 
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <Input
                  type="text"
                  placeholder="Optional memo or invoice reference..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" isLoading={isSubmitting}>Save Expense</Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
}
