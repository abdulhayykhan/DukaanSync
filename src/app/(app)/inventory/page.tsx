"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FileText, Plus, Search, Edit2, AlertTriangle, Archive, ArchiveRestore, Upload, Filter, FileSpreadsheet, UploadCloud } from "lucide-react";
import { formatCurrency, toMinorUnit } from "@/lib/utils/currency";
import { format } from "date-fns";
import { z } from "zod";
import { toast } from "sonner";

import { useBusiness } from "@/contexts/BusinessContext";
import { useShop } from "@/contexts/ShopContext";
import { InventoryService } from "@/lib/inventory/service";
import { ProductModal } from "@/components/inventory/ProductModal";
import { BulkImportModal } from "@/components/ui/BulkImportModal";
import type { DuplicateStrategy } from "@/components/ui/BulkImportModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ExportDropdown } from "@/components/ui/ExportDropdown";
import { exportToCSV, exportToExcel } from "@/lib/utils/exportData";
import { buildNormalizedRow, getField } from "@/lib/utils/importNormalize";

import type { InventoryItem } from "@/types";
import type { InventoryServicePayload } from "@/lib/validation/inventory";

const CATEGORIES = [
  { id: "cat_electronics", name: "Electronics" },
  { id: "cat_clothing", name: "Clothing & Apparel" },
  { id: "cat_groceries", name: "Groceries" },
  { id: "cat_cosmetics", name: "Health & Beauty" },
  { id: "cat_general", name: "General Merchandise" },
];

const IMPORT_COLUMNS = ["SKU", "Product Name", "Category", "Unit", "Cost Price", "Retail Price", "Initial Quantity", "Reorder Level"];
const IMPORT_SAMPLE = [
  { "SKU": "PRD-001", "Product Name": "Wireless Mouse", "Category": "Electronics", "Unit": "pcs", "Cost Price": 500, "Retail Price": 1200, "Initial Quantity": 50, "Reorder Level": 10 },
  { "SKU": "PRD-002", "Product Name": "Mechanical Keyboard", "Category": "Electronics", "Unit": "pcs", "Cost Price": 1500, "Retail Price": 3500, "Initial Quantity": 20, "Reorder Level": 5 }
];

export default function InventoryPage() {
  const { business, memberRole } = useBusiness();
  const { activeShop } = useShop();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Read-only for cashiers
  const isReadOnly = memberRole === "cashier";

  const fetchInventory = useCallback(async () => {
    if (!business || !activeShop) return;
    setLoading(true);
    try {
      const data = await InventoryService.getInventoryItems(business.id, activeShop.id);
      setItems(data);
    } catch (err) {
      console.error("Failed to load inventory:", err);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [business, activeShop]);

  // Re-fetch when active shop changes
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Client-side filtering
  const filteredItems = useMemo(() => {
    return (items || []).filter((item) => {
      const name = item?.name || "";
      const sku = item?.sku || "";
      const categoryId = item?.categoryId || "";
      
      const matchesSearch = 
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sku.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || categoryId === selectedCategory;
      const quantity = item?.quantity || 0;
      const reorderLevel = item?.reorderLevel || 0;
      const matchesLowStock = !showLowStockOnly || quantity <= reorderLevel;

      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [items, searchQuery, selectedCategory, showLowStockOnly]);

  const handleOpenCreateModal = () => {
    setItemToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setItemToEdit(item);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (item: InventoryItem) => {
    if (!business || !activeShop) return;
    const actionText = item.isActive ? "archive" : "restore";
    if (!confirm(`Are you sure you want to ${actionText} ${item.name}?`)) return;

    try {
      setIsProcessing(item.id);
      await InventoryService.toggleItemStatus(business.id, activeShop.id, item.id, !item.isActive);
      await fetchInventory();
      toast.success(`Product ${item.isActive ? 'archived' : 'restored'} successfully`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update product status");
    } finally {
      setIsProcessing(null);
    }
  };

  const getCategoryName = (id: string) => CATEGORIES.find(c => c.id === id)?.name || "Unknown";

  const inventoryRowSchema = z.object({
    sku: z.string().min(1, "SKU is required"),
    name: z.string().min(1, "Product Name is required"),
    category: z.string().optional().default("General"),
    unit: z.enum(["pcs", "kg", "g", "box", "pack", "liter", "other"]).catch("pcs"),
    costPrice: z.coerce.number().catch(0).default(0),
    retailPrice: z.coerce.number().catch(0).default(0),
    quantity: z.coerce.number().catch(0).default(0),
    reorderLevel: z.coerce.number().catch(10).default(10),
  });

  const handleValidateInventoryRow = (row: Record<string, string | number | boolean | null>) => {
    // 1. Normalize keys using shared utility (strips ALL non-alphanumeric chars)
    const normalizedRow = buildNormalizedRow(row);
    const getVal = (aliases: string[]) => getField(normalizedRow, aliases);

    // 2. Map to expected Zod schema structure
    const mappedData = {
      sku: String(getVal(['sku', 'productsku', 'code']) ?? ""),
      name: String(getVal(['name', 'productname', 'title', 'item']) ?? ""),
      category: String(getVal(['category', 'type']) ?? ""),
      unit: String(getVal(['unit', 'uom']) ?? ""),
      costPrice: getVal(['costpricepkr', 'costprice', 'cost', 'costpricepaisa']),
      retailPrice: getVal(['retailpricepkr', 'retailprice', 'price', 'rate', 'retailpricepaisa']),
      quantity: getVal(['quantity', 'initialquantity', 'qty', 'stock']),
      reorderLevel: getVal(['reorderlevel', 'minstock', 'alertlevel'])
    };

    // 3. Validate with Zod
    const parsed = inventoryRowSchema.safeParse(mappedData);

    // 4. Safely inject mapped values back into raw row so the preview table displays them correctly
    row["SKU"] = mappedData.sku || "";
    row["Product Name"] = mappedData.name || "";
    row["Category"] = mappedData.category || "General";
    row["Unit"] = mappedData.unit || "pcs";
    row["Cost Price"] = mappedData.costPrice || "0";
    row["Retail Price"] = mappedData.retailPrice || "0";
    row["Initial Quantity"] = mappedData.quantity || "0";
    row["Reorder Level"] = mappedData.reorderLevel || "10";

    if (!parsed.success) {
      return { 
        isValid: false, 
        errors: parsed.error.issues.map(i => `'${i.path.join('.')}': ${i.message}`) 
      };
    }

    const data = parsed.data;

    // Map string category back to internal category ID
    const catName = data.category.trim().toLowerCase();
    let categoryId = "cat_general";
    if (catName) {
      const match = CATEGORIES.find(c => c.name.toLowerCase() === catName || c.id === catName);
      if (match) categoryId = match.id;
    }

    return {
      isValid: true,
      data: {
        sku: data.sku,
        name: data.name,
        categoryId,
        unit: data.unit,
        quantity: data.quantity,
        reorderLevel: data.reorderLevel,
        costPriceMinor: toMinorUnit(data.costPrice),
        retailPriceMinor: toMinorUnit(data.retailPrice)
      }
    };
  };

  const handleExport = (formatType: "csv" | "excel") => {
    const exportData = (filteredItems || []).map(item => ({
      "SKU": item?.sku || "",
      "Product Name": item?.name || "",
      "Category": getCategoryName(item?.categoryId || ""),
      "Unit": item?.unit || "",
      "Cost Price (PKR)": ((item?.costPriceMinor || 0) / 100).toFixed(2),
      "Retail Price (PKR)": ((item?.retailPriceMinor || 0) / 100).toFixed(2),
      "Current Stock": item?.quantity || 0,
      "Reorder Level": item?.reorderLevel || 0,
      "Status": item?.isActive ? "Active" : "Archived"
    }));

    const dateStr = format(new Date(), "yyyy-MM-dd");
    const filename = `DukaanSync_Inventory_${activeShop?.id || 'all'}_${dateStr}`;

    if (formatType === "csv") {
      exportToCSV({ filename, data: exportData });
    } else {
      exportToExcel({ filename, data: exportData });
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage product catalog and stock levels for {activeShop?.name || 'All Shops'}.</p>
        </div>
        {!isReadOnly && (
          <div className="flex items-center gap-3 shrink-0">
            <ExportDropdown onExport={handleExport} />
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="h-10 inline-flex items-center gap-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors shadow-sm shrink-0 whitespace-nowrap"
            >
              <UploadCloud className="h-4 w-4 shrink-0" />
              Import
            </button>
            <Button onClick={handleOpenCreateModal} className="h-10 inline-flex items-center gap-2 px-4 rounded-xl shrink-0 whitespace-nowrap">
              <Plus className="h-4 w-4 shrink-0" /> Add Product
            </Button>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search by SKU or Name..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400 hidden sm:block" />
            <select
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto w-full lg:w-auto bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
          <input
            type="checkbox"
            id="low-stock-toggle"
            checked={showLowStockOnly}
            onChange={(e) => setShowLowStockOnly(e.target.checked)}
            className="rounded border-gray-300 text-[#10B981] focus:ring-[#10B981]"
          />
          <label htmlFor="low-stock-toggle" className="text-sm font-medium text-gray-700 select-none cursor-pointer flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Low Stock Alerts
          </label>
        </div>
      </div>

      {/* Inventory Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col min-h-[400px] hover:shadow-md transition-shadow">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200 shadow-sm">
              <tr className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-6 py-4">SKU / Product</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Stock Level</th>
                {!isReadOnly && <th className="px-6 py-4 text-right">Cost Price</th>}
                <th className="px-6 py-4 text-right">Retail Price</th>
                {!isReadOnly && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-6 h-6 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin"></div>
                      <p>Loading inventory...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <PackageIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-500 text-lg font-medium">No products found</p>
                    <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or search query.</p>
                  </td>
                </tr>
              ) : (
                (filteredItems || []).map((item) => {
                  const quantity = item?.quantity || 0;
                  const reorderLevel = item?.reorderLevel || 0;
                  const isLowStock = quantity <= reorderLevel;
                  
                  return (
                    <tr 
                      key={item?.id || Math.random().toString()} 
                      className={`hover:bg-gray-50 transition-colors ${!item?.isActive ? 'opacity-60 bg-gray-50' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{item?.name || "Unknown"}</span>
                          <span className="text-xs font-mono text-gray-500 mt-0.5">{item?.sku || "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                          {getCategoryName(item?.categoryId || "")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${isLowStock ? 'text-amber-600' : 'text-gray-900'}`}>
                            {quantity} {item?.unit || "pcs"}
                          </span>
                          {isLowStock && (
                            <span title="Low Stock" className="flex items-center justify-center bg-amber-100 text-amber-700 rounded-full w-5 h-5">
                              <AlertTriangle className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </td>
                      {!isReadOnly && (
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-medium text-gray-600">
                            {formatCurrency(item?.costPriceMinor || 0, business?.currency)}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(item?.retailPriceMinor || 0, business?.currency)}
                        </span>
                      </td>
                      {!isReadOnly && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => item && handleOpenEditModal(item)}
                              disabled={isProcessing === item?.id}
                              className="p-1.5 text-gray-400 hover:text-[#3B82F6] hover:bg-blue-50 rounded-md transition-colors"
                              title="Edit Product"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => item && handleToggleStatus(item)}
                              disabled={isProcessing === item?.id}
                              className={`p-1.5 rounded-md transition-colors ${
                                item?.isActive 
                                  ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' 
                                  : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                              }`}
                              title={item?.isActive ? "Archive Product" : "Restore Product"}
                            >
                              {item?.isActive ? <Archive className="w-4 h-4" /> : <ArchiveRestore className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductModal 
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        itemToEdit={itemToEdit}
        onSuccess={fetchInventory}
      />

      <BulkImportModal<InventoryServicePayload>
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Inventory"
        sampleData={IMPORT_SAMPLE}
        expectedColumns={IMPORT_COLUMNS}
        onValidateRow={handleValidateInventoryRow}
        onImport={(validRows, duplicateStrategy, onProgress) =>
          InventoryService.bulkImportProducts(business!.id, activeShop!.id, validRows, duplicateStrategy, onProgress)
        }
        onSuccess={fetchInventory}
      />
    </div>
  );
}

function PackageIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16.5 9.4 7.5 4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" x2="12" y1="22" y2="12" />
    </svg>
  )
}
