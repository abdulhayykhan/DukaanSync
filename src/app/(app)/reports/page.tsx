"use client";

import { useState, useCallback, useRef } from "react";
import { 
  FileText, Download, Printer, ChevronRight, Activity, TrendingDown, Clock, PackageOpen, LayoutTemplate
} from "lucide-react";
import { toast } from "sonner";
import { parseISO, format, subDays, startOfMonth, endOfMonth, startOfYear } from "date-fns";

import { useBusiness } from "@/contexts/BusinessContext";
import { useShop } from "@/contexts/ShopContext";
import { AnalyticsEngine } from "@/lib/analytics/engine";
import { ExpenseService } from "@/lib/expenses/service";
import { SaleTransactionService } from "@/lib/sales/transaction";
import { InventoryService } from "@/lib/inventory/service";
import { formatCurrency } from "@/lib/utils/currency";
import { Button } from "@/components/ui/Button";
import { ExportDropdown } from "@/components/ui/ExportDropdown";
import { exportToCSV, exportToExcel } from "@/lib/utils/exportData";

type ReportType = "pnl" | "sales" | "expenses" | "inventory";
type DateRange = "today" | "this_week" | "this_month" | "this_year";

export default function ReportsPage() {
  const { business } = useBusiness();
  const { activeShop } = useShop();

  const [selectedReport, setSelectedReport] = useState<ReportType>("pnl");
  const [dateRange, setDateRange] = useState<DateRange>("this_month");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const handleGenerateReport = async () => {
    if (!business || !activeShop) return;
    setIsGenerating(true);
    setReportData(null);

    try {
      let periodForEngine: "today" | "week" | "month" | "year" = "month";
      if (dateRange === "today") periodForEngine = "today";
      if (dateRange === "this_week") periodForEngine = "week";
      if (dateRange === "this_year") periodForEngine = "year";

      if (selectedReport === "pnl") {
        const telemetry = await AnalyticsEngine.getDashboardTelemetry(business.id, activeShop.id, periodForEngine);
        setReportData({ type: "pnl", telemetry, range: dateRange });
      } 
      else if (selectedReport === "sales") {
        const [telemetry, sales] = await Promise.all([
          AnalyticsEngine.getDashboardTelemetry(business.id, activeShop.id, periodForEngine),
          SaleTransactionService.getRecentSales(business.id, activeShop.id, 500)
        ]);
        setReportData({ type: "sales", telemetry, sales, range: dateRange });
      } 
      else if (selectedReport === "expenses") {
        const [expenses, telemetry] = await Promise.all([
          ExpenseService.getExpenses(business.id, activeShop.id),
          AnalyticsEngine.getDashboardTelemetry(business.id, activeShop.id, periodForEngine)
        ]);
        setReportData({ type: "expenses", expenses, telemetry, range: dateRange });
      }
      else if (selectedReport === "inventory") {
        const [telemetry, items] = await Promise.all([
          AnalyticsEngine.getDashboardTelemetry(business.id, activeShop.id, "today"),
          InventoryService.getInventoryItems(business.id, activeShop.id)
        ]);

        let totalCostValueMinor = 0;
        let totalRetailValueMinor = 0;
        items.forEach(i => {
          totalCostValueMinor += (i.costPriceMinor || 0) * (i.quantity || 0);
          totalRetailValueMinor += (i.retailPriceMinor || 0) * (i.quantity || 0);
        });

        setReportData({ 
          type: "inventory", 
          telemetry, 
          items, 
          totalCostValueMinor, 
          totalRetailValueMinor, 
          range: "Current Stock" 
        });
      }

      toast.success("Report generated successfully");
    } catch (err: any) {
      console.error("Failed to generate report:", err);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async (formatType: "csv" | "excel") => {
    let exportData: any[] = [];
    const filename = `DukaanSync_${selectedReport}_report_${format(new Date(), "yyyyMMdd")}`;

    if (reportData?.type === "pnl") {
      const { telemetry } = reportData;
      exportData = [
        { Metric: "Revenue", Amount: (telemetry.revenueMinor / 100).toFixed(2) },
        { Metric: "COGS", Amount: ((telemetry.revenueMinor - telemetry.grossProfitMinor) / 100).toFixed(2) },
        { Metric: "Gross Profit", Amount: (telemetry.grossProfitMinor / 100).toFixed(2) },
        { Metric: "Operating Expenses", Amount: ((telemetry.grossProfitMinor - telemetry.netProfitMinor) / 100).toFixed(2) },
        { Metric: "Net Profit", Amount: (telemetry.netProfitMinor / 100).toFixed(2) },
      ];
    } else if (reportData?.type === "sales") {
      exportData = (reportData.sales || []).map((s: any) => ({
        "Invoice #": s.invoiceNumber,
        "Customer": s.customerName || "Guest Customer",
        "Date": format(new Date(s.createdAt), "yyyy-MM-dd HH:mm"),
        "Payment Method": s.paymentMethod?.toUpperCase(),
        "Status": s.paymentStatus?.toUpperCase(),
        "Subtotal": (s.subtotalMinor / 100).toFixed(2),
        "Discount": (s.discountMinor / 100).toFixed(2),
        "Grand Total": (s.grandTotalMinor / 100).toFixed(2)
      }));
    } else if (reportData?.type === "expenses") {
      exportData = (reportData.expenses || []).map((e: any) => ({
        "Date": format(parseISO(e.date), "yyyy-MM-dd"),
        "Category": e.category?.toUpperCase(),
        "Description": e.description || "",
        "Payment Method": e.paymentMethod?.toUpperCase(),
        "Amount": (e.amountMinor / 100).toFixed(2)
      }));
    } else if (reportData?.type === "inventory") {
      exportData = (reportData.items || []).map((i: any) => ({
        "SKU": i.sku,
        "Product Name": i.name,
        "Category": i.categoryId || "General",
        "Stock Quantity": i.quantity,
        "Unit Cost": (i.costPriceMinor / 100).toFixed(2),
        "Retail Price": (i.retailPriceMinor / 100).toFixed(2),
        "Total Cost Value": ((i.costPriceMinor * i.quantity) / 100).toFixed(2),
        "Total Retail Value": ((i.retailPriceMinor * i.quantity) / 100).toFixed(2)
      }));
    }

    if (exportData.length === 0) {
      toast.error("No data available to export");
      return;
    }

    if (formatType === "csv") {
      exportToCSV({ filename, data: exportData });
    } else {
      exportToExcel({ filename, data: exportData });
    }
  };

  const handleExportSalesHistory = async (formatType: "csv" | "excel") => {
    if (!business || !activeShop) return;
    try {
      const sales = await SaleTransactionService.getRecentSales(business.id, activeShop.id, 1000);
      const exportData = sales.map(s => ({
        "Invoice #": s.invoiceNumber,
        "Customer Name": s.customerName || "Guest",
        "Date": format(new Date(s.createdAt), "yyyy-MM-dd HH:mm"),
        "Payment Method": s.paymentMethod,
        "Subtotal": (s.subtotalMinor / 100).toFixed(2),
        "Tax": (s.taxMinor / 100).toFixed(2),
        "Discount": (s.discountMinor / 100).toFixed(2),
        "Grand Total": (s.grandTotalMinor / 100).toFixed(2),
        "Payment Status": s.paymentStatus
      }));

      const dateStr = format(new Date(), "yyyy-MM-dd");
      const filename = `DukaanSync_SalesHistory_${activeShop.id}_${dateStr}`;

      if (formatType === "csv") {
        exportToCSV({ filename, data: exportData });
      } else {
        exportToExcel({ filename, data: exportData });
      }
    } catch (err) {
      toast.error("Failed to export sales history");
    }
  };

  if (!business || !activeShop) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto min-h-screen">
      
      {/* Configuration Header (Hidden on Print) */}
      <div className="print:hidden mb-8">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports & Exports</h1>
          <ExportDropdown onExport={handleExportSalesHistory} label="Export Sales History" />
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Report Type</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button 
                onClick={() => setSelectedReport("pnl")}
                className={`p-3 rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 ${selectedReport === "pnl" ? 'bg-purple-50 border-purple-200 text-purple-700 font-bold' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                <Activity className="w-5 h-5" /> P&L Statement
              </button>
              <button 
                onClick={() => setSelectedReport("sales")}
                className={`p-3 rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 ${selectedReport === "sales" ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                <TrendingDown className="w-5 h-5 rotate-180" /> Sales Report
              </button>
              <button 
                onClick={() => setSelectedReport("expenses")}
                className={`p-3 rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 ${selectedReport === "expenses" ? 'bg-red-50 border-red-200 text-red-700 font-bold' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                <TrendingDown className="w-5 h-5" /> Expenses
              </button>
              <button 
                onClick={() => setSelectedReport("inventory")}
                className={`p-3 rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 ${selectedReport === "inventory" ? 'bg-amber-50 border-amber-200 text-amber-700 font-bold' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                <PackageOpen className="w-5 h-5" /> Inventory Value
              </button>
            </div>
          </div>

          <div className="w-full md:w-64">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Time Period</label>
            <select 
              className="w-full px-4 h-12 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] disabled:opacity-50"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              disabled={selectedReport === "inventory"}
            >
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="this_year">This Year</option>
            </select>
          </div>

          <Button 
            className="h-12 px-8 w-full md:w-auto shrink-0 shadow-md"
            onClick={handleGenerateReport}
            isLoading={isGenerating}
          >
            <LayoutTemplate className="w-4 h-4 mr-2" /> Generate Report
          </Button>
        </div>
      </div>

      {/* Generated Report Viewer */}
      {reportData && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm print:border-none print:shadow-none print:w-[210mm] print:mx-auto">
          
          {/* Action Toolbar (Hidden on Print) */}
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center print:hidden rounded-t-xl">
            <h2 className="font-semibold text-gray-700 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-gray-400" /> Report Preview
            </h2>
            <div className="flex gap-2">
              <ExportDropdown onExport={handleExport} />
              <Button className="h-8 px-3 text-sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" /> Print PDF
              </Button>
            </div>
          </div>

          {/* Printable Document Area */}
          <div className="p-8 sm:p-12 print:p-0">
            {/* Standard Header for all reports */}
            <div className="text-center mb-10 pb-6 border-b-2 border-gray-900">
              <h1 className="text-3xl font-bold uppercase tracking-wider text-gray-900">{business.name}</h1>
              <p className="text-gray-600 mt-1">{activeShop.name} | {activeShop.address}</p>
              <p className="text-gray-600">Tel: {activeShop.phone}</p>
              
              <div className="mt-8 text-lg font-bold text-gray-900 bg-gray-100 py-2 rounded-lg max-w-sm mx-auto uppercase tracking-widest">
                {selectedReport === "pnl" && "Profit & Loss Statement"}
                {selectedReport === "sales" && "Sales Summary Report"}
                {selectedReport === "expenses" && "Expense Summary Report"}
                {selectedReport === "inventory" && "Inventory Valuation Report"}
              </div>
              <p className="text-sm font-semibold text-gray-500 mt-2">
                Period: {String(reportData.range).replace("_", " ").toUpperCase()}
              </p>
              <p className="text-xs text-gray-400 mt-1">Generated: {format(new Date(), "PPpp")}</p>
            </div>

            {/* P&L Specific View */}
            {reportData.type === "pnl" && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-1 mb-3">Revenue (Income)</h3>
                  <div className="flex justify-between items-center text-lg">
                    <span className="text-gray-700">Gross Revenue (Sales)</span>
                    <span className="font-semibold">{formatCurrency(reportData.telemetry.revenueMinor, business.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg text-red-600">
                    <span>Less: Cost of Goods Sold (COGS)</span>
                    <span>-{formatCurrency(reportData.telemetry.revenueMinor - reportData.telemetry.grossProfitMinor, business.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xl font-bold pt-3 border-t border-gray-300">
                    <span>Gross Profit</span>
                    <span className="text-emerald-600">{formatCurrency(reportData.telemetry.grossProfitMinor, business.currency)}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-6">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-1 mb-3">Operating Expenses</h3>
                  
                  {reportData.telemetry.expenseDistribution.map((exp: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-gray-600">
                      <span className="capitalize">{exp.name}</span>
                      <span>{formatCurrency(exp.value, business.currency)}</span>
                    </div>
                  ))}

                  <div className="flex justify-between items-center text-lg text-red-600 font-semibold pt-2 border-t border-gray-100">
                    <span>Total Operating Expenses</span>
                    <span>-{formatCurrency(reportData.telemetry.grossProfitMinor - reportData.telemetry.netProfitMinor, business.currency)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-2xl font-black pt-6 border-t-2 border-gray-900 mt-8">
                  <span>NET PROFIT (LOSS)</span>
                  <span className={reportData.telemetry.netProfitMinor >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {formatCurrency(reportData.telemetry.netProfitMinor, business.currency)}
                  </span>
                </div>
              </div>
            )}

            {/* Sales Summary Report View */}
            {reportData.type === "sales" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-xs font-semibold text-blue-700 uppercase">Total Revenue</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{formatCurrency(reportData.telemetry.revenueMinor, business.currency)}</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <p className="text-xs font-semibold text-emerald-700 uppercase">Gross Profit</p>
                    <p className="text-2xl font-bold text-emerald-900 mt-1">{formatCurrency(reportData.telemetry.grossProfitMinor, business.currency)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Sales Orders</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{reportData.sales?.length || 0} Transactions</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-900 text-xs uppercase font-bold text-gray-900">
                        <th className="py-3 px-2">Invoice #</th>
                        <th className="py-3 px-2">Date</th>
                        <th className="py-3 px-2">Customer</th>
                        <th className="py-3 px-2">Payment Method</th>
                        <th className="py-3 px-2 text-right">Grand Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm">
                      {reportData.sales?.length === 0 ? (
                        <tr><td colSpan={5} className="py-8 text-center text-gray-500">No sales transactions found for this period.</td></tr>
                      ) : (
                        reportData.sales?.map((sale: any) => (
                          <tr key={sale.id} className="hover:bg-gray-50">
                            <td className="py-3 px-2 font-semibold text-gray-900">{sale.invoiceNumber}</td>
                            <td className="py-3 px-2 text-gray-600">{format(new Date(sale.createdAt), "yyyy-MM-dd HH:mm")}</td>
                            <td className="py-3 px-2 text-gray-700">{sale.customerName || "Guest Customer"}</td>
                            <td className="py-3 px-2 uppercase text-xs font-medium text-gray-600">{sale.paymentMethod}</td>
                            <td className="py-3 px-2 text-right font-bold text-gray-900">{formatCurrency(sale.grandTotalMinor, business.currency)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-900 font-bold text-gray-900">
                        <td colSpan={4} className="py-3 px-2 uppercase text-right">Total Revenue:</td>
                        <td className="py-3 px-2 text-right text-lg text-blue-600">{formatCurrency(reportData.telemetry.revenueMinor, business.currency)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Expenses Report View */}
            {reportData.type === "expenses" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <p className="text-xs font-semibold text-red-700 uppercase">Total Operating Expenses</p>
                    <p className="text-2xl font-bold text-red-900 mt-1">
                      {formatCurrency(
                        (reportData.expenses || []).reduce((acc: number, e: any) => acc + (e.amountMinor || 0), 0),
                        business.currency
                      )}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Expense Records</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{reportData.expenses?.length || 0} Transactions</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-900 text-xs uppercase font-bold text-gray-900">
                        <th className="py-3 px-2">Date</th>
                        <th className="py-3 px-2">Category</th>
                        <th className="py-3 px-2">Description</th>
                        <th className="py-3 px-2">Method</th>
                        <th className="py-3 px-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm">
                      {reportData.expenses?.length === 0 ? (
                        <tr><td colSpan={5} className="py-8 text-center text-gray-500">No expenses recorded for this period.</td></tr>
                      ) : (
                        reportData.expenses?.map((exp: any) => (
                          <tr key={exp.id} className="hover:bg-gray-50">
                            <td className="py-3 px-2 text-gray-600">{format(parseISO(exp.date), "yyyy-MM-dd")}</td>
                            <td className="py-3 px-2 font-semibold text-gray-900 capitalize">{exp.category}</td>
                            <td className="py-3 px-2 text-gray-600">{exp.description || "—"}</td>
                            <td className="py-3 px-2 uppercase text-xs font-medium text-gray-600">{exp.paymentMethod}</td>
                            <td className="py-3 px-2 text-right font-bold text-red-600">{formatCurrency(exp.amountMinor, business.currency)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-900 font-bold text-gray-900">
                        <td colSpan={4} className="py-3 px-2 uppercase text-right">Total Expenses:</td>
                        <td className="py-3 px-2 text-right text-lg text-red-600">
                          {formatCurrency(
                            (reportData.expenses || []).reduce((acc: number, e: any) => acc + (e.amountMinor || 0), 0),
                            business.currency
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Inventory Valuation Report View */}
            {reportData.type === "inventory" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <p className="text-xs font-semibold text-amber-800 uppercase">Total Stock Cost Value</p>
                    <p className="text-2xl font-bold text-amber-950 mt-1">{formatCurrency(reportData.totalCostValueMinor || 0, business.currency)}</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <p className="text-xs font-semibold text-emerald-800 uppercase">Potential Retail Value</p>
                    <p className="text-2xl font-bold text-emerald-950 mt-1">{formatCurrency(reportData.totalRetailValueMinor || 0, business.currency)}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <p className="text-xs font-semibold text-purple-800 uppercase">Expected Profit Margin</p>
                    <p className="text-2xl font-bold text-purple-950 mt-1">
                      {formatCurrency(Math.max(0, (reportData.totalRetailValueMinor || 0) - (reportData.totalCostValueMinor || 0)), business.currency)}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-900 text-xs uppercase font-bold text-gray-900">
                        <th className="py-3 px-2">SKU</th>
                        <th className="py-3 px-2">Product Name</th>
                        <th className="py-3 px-2 text-right">Qty</th>
                        <th className="py-3 px-2 text-right">Unit Cost</th>
                        <th className="py-3 px-2 text-right">Retail Price</th>
                        <th className="py-3 px-2 text-right">Total Cost Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm">
                      {reportData.items?.length === 0 ? (
                        <tr><td colSpan={6} className="py-8 text-center text-gray-500">No inventory products found in stock.</td></tr>
                      ) : (
                        reportData.items?.map((item: any) => {
                          const itemCostTotal = (item.costPriceMinor || 0) * (item.quantity || 0);
                          return (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="py-3 px-2 font-semibold text-gray-900">{item.sku}</td>
                              <td className="py-3 px-2 text-gray-800 font-medium">{item.name}</td>
                              <td className="py-3 px-2 text-right font-bold text-gray-900">{item.quantity} {item.unit}</td>
                              <td className="py-3 px-2 text-right text-gray-600">{formatCurrency(item.costPriceMinor || 0, business.currency)}</td>
                              <td className="py-3 px-2 text-right text-gray-600">{formatCurrency(item.retailPriceMinor || 0, business.currency)}</td>
                              <td className="py-3 px-2 text-right font-bold text-gray-900">{formatCurrency(itemCostTotal, business.currency)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-900 font-bold text-gray-900">
                        <td colSpan={5} className="py-3 px-2 uppercase text-right">Total Inventory Cost Value:</td>
                        <td className="py-3 px-2 text-right text-lg text-amber-700">{formatCurrency(reportData.totalCostValueMinor || 0, business.currency)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-24 pt-8 border-t border-gray-200 flex justify-between text-xs text-gray-500 print:mt-auto">
              <span>System: DukaanSync</span>
              <span>Authorized Signature: ______________________</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
