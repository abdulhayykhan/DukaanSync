"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Clock, History, Search, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";

import { useBusiness } from "@/contexts/BusinessContext";
import { useShop } from "@/contexts/ShopContext";
import { StockMovementService } from "@/lib/inventory/movements";
import type { StockMovementImportPayload } from "@/lib/inventory/movements";
import { InventoryService } from "@/lib/inventory/service";
import { Input } from "@/components/ui/Input";
import { ExportDropdown } from "@/components/ui/ExportDropdown";
import { exportToCSV, exportToExcel } from "@/lib/utils/exportData";
import { buildNormalizedRow, getField } from "@/lib/utils/importNormalize";
import { BulkImportModal } from "@/components/ui/BulkImportModal";
import { format } from "date-fns";
import type { StockMovement, InventoryItem, StockMovementType } from "@/types";

export default function StockMovementsPage() {
  const router = useRouter();
  const { business } = useBusiness();
  const { activeShop } = useShop();

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [inventoryDict, setInventoryDict] = useState<Record<string, InventoryItem>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!business || !activeShop) return;
    setLoading(true);
    try {
      const [movData, invData] = await Promise.all([
        StockMovementService.getRecentMovements(business.id, activeShop.id, 200),
        InventoryService.getAllInventoryItems(business.id, activeShop.id)
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
      case 'opening_stock':
      case 'initial': return <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">Initial / Opening</span>;
      case 'purchase': return <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-medium">Purchase Received</span>;
      case 'sale': return <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">POS Sale</span>;
      case 'adjustment': return <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 text-xs font-medium">Manual Adjustment</span>;
      case 'customer_return': return <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-800 text-xs font-medium">Customer Return</span>;
      case 'supplier_return': return <span className="px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-medium">Supplier Return</span>;
      default: return <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">{type.replace("_", " ")}</span>;
    }
  };

  const filteredMovements = movements.filter(m => {
    const item = inventoryDict[m.itemId];
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    return (item?.name?.toLowerCase().includes(query)) || 
           (item?.sku?.toLowerCase().includes(query)) ||
           (m.itemId?.toLowerCase().includes(query)) ||
           (m.reason?.toLowerCase().includes(query)) ||
           (m.referenceId && m.referenceId.toLowerCase().includes(query));
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

  const movementRowSchema = z.object({
    timestamp: z.string().optional().default(""),
    sku: z.string().min(1, "SKU is required"),
    productName: z.string().optional().default(""),
    type: z.enum(["initial", "sale", "purchase", "adjustment", "import_update", "import_addition", "customer_return", "supplier_return"]).catch("adjustment"),
    quantityBefore: z.coerce.number().catch(0).default(0),
    quantityChange: z.coerce.number().catch(0),
    quantityAfter: z.coerce.number().catch(0).default(0),
    reason: z.string().optional().default(""),
  });

  const MOVEMENT_COLUMNS = ["timestamp", "sku", "productName", "type", "quantityBefore", "quantityChange", "quantityAfter", "reason"];
  const MOVEMENT_SAMPLE = [
    { timestamp: "2026-01-15T10:30:00Z", sku: "GRO-RICE-5KG", productName: "Rice (5kg)", type: "purchase", quantityBefore: 10, quantityChange: 50, quantityAfter: 60, reason: "Stock Replenishment" },
    { timestamp: "2026-01-16T14:00:00Z", sku: "BEV-COLA-1.5L", productName: "Cola Soft Drink", type: "sale", quantityBefore: 30, quantityChange: -5, quantityAfter: 25, reason: "Customer Sale" },
  ];

  const handleValidateMovementRow = (row: Record<string, string | number | boolean | null>) => {
    const norm = buildNormalizedRow(row);
    const get = (aliases: string[]) => getField(norm, aliases);

    const mapped = {
      timestamp: String(get(["timestamp", "date", "createdat", "datetime", "time"]) ?? ""),
      sku: String(get(["sku", "productsku", "itemsku", "code", "itemcode", "barcode"]) ?? ""),
      productName: String(get(["productname", "name", "product", "item", "itemname"]) ?? ""),
      type: String(get(["type", "movementtype", "movement_type", "movetype"]) ?? ""),
      quantityBefore: get(["quantitybefore", "before", "qtybefore", "stockbefore", "qbefore"]),
      quantityChange: get(["quantitychange", "change", "qtychange", "delta", "qty", "quantity"]),
      quantityAfter: get(["quantityafter", "after", "qtyafter", "stockafter", "qafter"]),
      reason: String(get(["reason", "notes", "description", "memo", "remarks"]) ?? ""),
    };

    const parsed = movementRowSchema.safeParse(mapped);
    if (!parsed.success) {
      return { isValid: false, errors: parsed.error.issues.map(i => `'${i.path.join(".")}: ${i.message}`) };
    }

    const d = parsed.data;
    const tsIso = d.timestamp ? new Date(d.timestamp).toISOString() : new Date().toISOString();
    // Try to resolve itemId from inventoryDict by SKU
    const matchedItem = Object.values(inventoryDict).find(item => item.sku === d.sku);
    return {
      isValid: true,
      data: {
        itemId: matchedItem?.id || d.sku,
        sku: d.sku,
        type: d.type as StockMovementType,
        quantityBefore: d.quantityBefore,
        quantityChange: d.quantityChange,
        quantityAfter: d.quantityAfter,
        reason: d.reason,
        timestamp: tsIso,
      } as StockMovementImportPayload,
    };
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
          <div className="flex items-center gap-2">
            <ExportDropdown onExport={handleExport} />
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="h-10 inline-flex items-center gap-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
            >
              <UploadCloud className="h-4 w-4 shrink-0" />
              Import
            </button>
          </div>
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

      <BulkImportModal<StockMovementImportPayload>
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Stock Movements"
        sampleData={MOVEMENT_SAMPLE}
        expectedColumns={MOVEMENT_COLUMNS}
        onValidateRow={handleValidateMovementRow}
        onImport={(validRows, _strategy, onProgress) =>
          StockMovementService.bulkImportMovements(business!.id, activeShop!.id, validRows, onProgress)
        }
        onSuccess={fetchData}
      />
    </div>
  );
}
