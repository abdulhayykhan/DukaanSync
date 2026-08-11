"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Clock, History, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useBusiness } from "@/contexts/BusinessContext";
import { useShop } from "@/contexts/ShopContext";
import { StockMovementService } from "@/lib/inventory/movements";
import { InventoryService } from "@/lib/inventory/service";
import { Input } from "@/components/ui/Input";
import { ExportDropdown } from "@/components/ui/ExportDropdown";
import { exportToCSV, exportToExcel } from "@/lib/utils/exportData";
import { format } from "date-fns";
import type { StockMovement, InventoryItem } from "@/types";

export default function StockMovementsPage() {
  const router = useRouter();
  const { business } = useBusiness();
  const { activeShop } = useShop();

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [inventoryDict, setInventoryDict] = useState<Record<string, InventoryItem>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    if (!business || !activeShop) return;
    setLoading(true);
    try {
      const [movData, invData] = await Promise.all([
        StockMovementService.getRecentMovements(business.id, activeShop.id, 200),
        InventoryService.getInventoryItems(business.id, activeShop.id)
      ]);
      
      const dict: Record<string, InventoryItem> = {};
      invData.forEach(item => { dict[item.id] = item; });
      
      setMovements(movData);
      setInventoryDict(dict);
    } catch (err) {
      toast.error("Failed to load stock movements");
    } finally {
      setLoading(false);
    }
  }, [business, activeShop]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getTypeBadge = (type: string) => {
    switch(type) {
      case 'opening_stock': return <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">Opening Stock</span>;
      case 'purchase': return <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-medium">Purchase Received</span>;
      case 'sale': return <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium">Sale Entry</span>;
      case 'adjustment': return <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-medium">Manual Adjustment</span>;
      case 'supplier_return': return <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-medium">Return to Supplier</span>;
      default: return <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">{type.replace("_", " ")}</span>;
    }
  };

  const filteredMovements = movements.filter(m => {
    const item = inventoryDict[m.itemId];
    if (!item) return false;
    if (!searchQuery) return true;
    
    return item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
           item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (m.referenceId && m.referenceId.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const handleExport = (formatType: "csv" | "excel") => {
    const exportData = filteredMovements.map(m => {
      const item = inventoryDict[m.itemId];
      return {
        "Date": format(new Date(m.createdAt), "yyyy-MM-dd HH:mm"),
        "Product Name": item?.name || "Unknown",
        "SKU": item?.sku || "Unknown",
        "Type": m.type.replace("_", " ").toUpperCase(),
        "Qty Before": m.quantityBefore,
        "Change": m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange,
        "Qty After": m.quantityAfter,
        "Reference ID": m.referenceId || "N/A",
        "Reason": m.reason || ""
      };
    });

    const dateStr = format(new Date(), "yyyy-MM-dd");
    const filename = `DukaanSync_Movements_${activeShop?.id || 'all'}_${dateStr}`;

    if (formatType === "csv") {
      exportToCSV({ filename, data: exportData });
    } else {
      exportToExcel({ filename, data: exportData });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto h-full flex flex-col">
      <div className="mb-6">
        <button 
          onClick={() => router.push("/inventory")}
          className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Inventory
        </button>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Movements Audit</h1>
            <p className="text-sm text-gray-500 mt-1">Ledger of all inventory quantity changes for {activeShop?.name}.</p>
          </div>
          <ExportDropdown onExport={handleExport} />
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search by SKU, Product Name, or Ref ID..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white flex-1 rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[400px]">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
          <History className="w-4 h-4 mr-2 text-gray-400" /> 
          <h2 className="font-semibold text-gray-900">Recent Movements</h2>
        </div>
        
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10 border-b border-gray-200">
              <tr className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Product / SKU</th>
                <th className="px-6 py-4">Movement Type</th>
                <th className="px-6 py-4 text-right">Before</th>
                <th className="px-6 py-4 text-right">Change</th>
                <th className="px-6 py-4 text-right">After</th>
                <th className="px-6 py-4">Reference / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading stock movements...</td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-500">No stock movements found.</td>
                </tr>
              ) : (
                filteredMovements.map((movement) => {
                  const item = inventoryDict[movement.itemId];
                  const isPositive = movement.quantityChange > 0;
                  
                  return (
                    <tr key={movement.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm font-medium text-gray-900">
                          <Clock className="w-3 h-3 mr-1.5 text-gray-400" />
                          {new Date(movement.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500 ml-4.5">{new Date(movement.createdAt).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-sm text-gray-900">{item?.name || "Unknown Product"}</p>
                        <p className="text-xs text-gray-500">{item?.sku || movement.itemId}</p>
                      </td>
                      <td className="px-6 py-4">
                        {getTypeBadge(movement.type)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500 font-medium">
                        {movement.quantityBefore}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : ''}{movement.quantityChange}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                        {movement.quantityAfter}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{movement.referenceId || "—"}</div>
                        <div className="text-xs text-gray-500">{movement.reason}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
