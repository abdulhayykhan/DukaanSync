"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart,
  PieChart, Pie, Cell, Sector
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, PackageOpen, Users, Building, AlertTriangle, ArrowRight, Activity
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Card3D } from "@/components/ui/Card3D";

import { useBusiness } from "@/contexts/BusinessContext";
import { useShop } from "@/contexts/ShopContext";
import { AnalyticsEngine, type TimePeriod } from "@/lib/analytics/engine";
import { formatCurrency } from "@/lib/utils/currency";
import type { DashboardTelemetry } from "@/types";

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } } as any;
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } } as any;

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'];

export default function DashboardPage() {
  const { business } = useBusiness();
  const { activeShop, activeShopId } = useShop();

  const [period, setPeriod] = useState<TimePeriod>("month");
  const [data, setData] = useState<DashboardTelemetry | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTelemetry = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    try {
      const targetShopId = activeShopId || activeShop?.id || "all";
      const telemetry = await AnalyticsEngine.getDashboardTelemetry(business.id, targetShopId, period);
      setData(telemetry);
    } catch (err: any) {
      console.error("Failed to load dashboard telemetry data:", err?.code || err, err?.message);
      setData({
        revenueMinor: 0,
        grossProfitMinor: 0,
        netProfitMinor: 0,
        totalReceivablesMinor: 0,
        totalPayablesMinor: 0,
        inventoryValueMinor: 0,
        lowStockCount: 0,
        chartData: [],
        expenseDistribution: []
      });
    } finally {
      setLoading(false);
    }
  }, [business, activeShop, activeShopId, period]);

  useEffect(() => {
    loadTelemetry();
  }, [loadTelemetry]);

  // Formatter for recharts tooltip and axes
  const formatYAxis = (minorUnits: number) => {
    if (!business) return "";
    const major = minorUnits / 100;
    const absMajor = Math.abs(major);
    const sign = major < 0 ? "-" : "";
    if (absMajor >= 1000000) return `${sign}${business.currency} ${(absMajor / 1000000).toFixed(1)}M`;
    if (absMajor >= 1000) return `${sign}${business.currency} ${(absMajor / 1000).toFixed(0)}k`;
    return `${sign}${business.currency} ${absMajor.toFixed(0)}`;
  };

  const formatTooltip = (value: any) => {
    if (typeof value !== "number") return value;
    return formatCurrency(value, business?.currency);
  };

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <Activity className="w-12 h-12 mb-4 opacity-20 animate-pulse" />
        <p>Loading business telemetry...</p>
      </div>
    );
  }

  const activeShopTitle = activeShopId === "all" || !activeShop ? "All Shops (Multi-Branch)" : activeShop.name;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      
      {/* Header & Period Selector */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Telemetry Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time performance metrics for {activeShopTitle}</p>
        </div>
        
        <div className="bg-slate-100 p-1 rounded-xl border border-slate-200/80 flex text-sm font-medium">
          <button 
            onClick={() => setPeriod("today")}
            className={`px-4 py-1.5 rounded-lg transition-colors ${period === "today" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-900"}`}
          >
            Today
          </button>
          <button 
            onClick={() => setPeriod("week")}
            className={`px-4 py-1.5 rounded-lg transition-colors ${period === "week" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-900"}`}
          >
            This Week
          </button>
          <button 
            onClick={() => setPeriod("month")}
            className={`px-4 py-1.5 rounded-lg transition-colors ${period === "month" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-900"}`}
          >
            This Month
          </button>
          <button 
            onClick={() => setPeriod("year")}
            className={`px-4 py-1.5 rounded-lg transition-colors ${period === "year" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-900"}`}
          >
            This Year
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white h-32 rounded-2xl border border-slate-200/80 animate-pulse"></div>)}
        </div>
      )}

      {/* KPI Cards */}
      {data && (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue */}
          <motion.div variants={itemVariants} className="h-full"><Card3D className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Revenue</span>
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(data.revenueMinor, business.currency)}</div>
          </Card3D></motion.div>

          {/* Gross Profit */}
          <motion.div variants={itemVariants} className="h-full"><Card3D className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Gross Profit</span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(data.grossProfitMinor, business.currency)}</div>
          </Card3D></motion.div>

          {/* Net Profit */}
          <motion.div variants={itemVariants} className="h-full"><Card3D className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Net Profit</span>
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                <Activity className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <div className={`text-2xl font-bold relative z-10 ${data.netProfitMinor >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(data.netProfitMinor, business.currency)}
            </div>
            <p className="text-xs text-slate-400 mt-1">Gross Profit - Expenses</p>
          </Card3D></motion.div>

          {/* Low Stock */}
          <motion.div variants={itemVariants} className="h-full"><Card3D className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col group relative overflow-hidden h-full cursor-pointer" onClick={() => window.location.href="/inventory?lowStock=true"}>
            <div className="absolute right-0 top-0 h-full w-1 bg-amber-400"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Stock Alerts</span>
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-600">{data.lowStockCount} <span className="text-base font-normal text-amber-600/70">items</span></div>
          </Card3D></motion.div>
        </motion.div>
      )}

      {/* Secondary Financials */}
      {data && (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div variants={itemVariants} className="h-full"><Card3D className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between group hover:border-[#10B981] cursor-pointer h-full" onClick={() => window.location.href="/customers"}>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Receivables (Owed to you)</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(data.totalReceivablesMinor, business.currency)}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#10B981] group-hover:translate-x-1 transition-all" />
          </Card3D></motion.div>
          <motion.div variants={itemVariants} className="h-full"><Card3D className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between group hover:border-[#10B981] cursor-pointer h-full" onClick={() => window.location.href="/suppliers"}>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Payables (You owe)</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(data.totalPayablesMinor, business.currency)}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#10B981] group-hover:translate-x-1 transition-all" />
          </Card3D></motion.div>
          <motion.div variants={itemVariants} className="h-full"><Card3D className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between h-full">
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Inventory Value</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(data.inventoryValueMinor, business.currency)}</p>
            </div>
            <PackageOpen className="w-6 h-6 text-slate-400" />
          </Card3D></motion.div>
        </motion.div>
      )}

      {/* Charts Row */}
      {data && (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Trend Chart */}
          <motion.div variants={itemVariants} className="lg:col-span-2 h-full">
            <Card3D className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full min-h-[380px]" maxTilt={2}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">Revenue vs Net Profit</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Financial trajectory over selected period</p>
                </div>
              </div>

              <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.chartData} margin={{ top: 10, right: 15, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} dy={10} />
                    <YAxis width={70} axisLine={false} tickLine={false} tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: '#64748B' }} dx={-4} />
                    <Tooltip formatter={formatTooltip} cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} />
                    <Legend iconType="circle" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', color: '#475569' }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card3D>
          </motion.div>

          {/* Expense Distribution Pie Chart */}
          <motion.div variants={itemVariants} className="h-full">
            <Card3D className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full justify-between" maxTilt={3}>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Operating Expenses</h3>
                <p className="text-xs text-slate-500 mb-4">Breakdown by category</p>
              </div>
              
              {data.expenseDistribution.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <p className="text-sm">No expenses recorded in this period.</p>
                  <Link href="/expenses" className="text-xs text-[#10B981] font-medium hover:underline mt-2">Log an expense</Link>
                </div>
              ) : (
                <div className="flex flex-col flex-1 justify-between gap-4">
                  {/* Donut Chart Container */}
                  <div className="w-full h-[190px] relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.expenseDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {data.expenseDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={formatTooltip} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Clean Legend Category Indicators */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    {data.expenseDistribution.map((entry, index) => (
                      <div key={index} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-slate-600 font-medium truncate capitalize">{entry.name}</span>
                        </div>
                        <span className="font-semibold text-slate-900 shrink-0 ml-2">{formatCurrency(entry.value, business.currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card3D>
          </motion.div>
          
        </motion.div>
      )}

      {/* Low Stock Alerts Table */}
      {data && data.lowStockItems && data.lowStockItems.length > 0 && (
        <motion.div variants={itemVariants} className="mt-6">
          <Card3D className="bg-white p-6 rounded-2xl border border-amber-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-200 shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    Stock Alert Items 
                    <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                      {data.lowStockItems.length} Low Stock
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Items that reached or fell below reorder threshold. Use storage location for fast physical retrieval.
                  </p>
                </div>
              </div>
              <Link 
                href="/inventory?lowStock=true" 
                className="text-xs font-semibold text-[#10B981] hover:underline flex items-center gap-1 shrink-0"
              >
                View All Low Stock Items <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-100">
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Storage Location</th>
                    <th className="py-3 px-4 text-right">Current Stock</th>
                    <th className="py-3 px-4 text-right">Reorder Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {data.lowStockItems.slice(0, 8).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {item.name}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-500">
                        {item.sku}
                      </td>
                      <td className="py-3 px-4">
                        {item.storageLocation ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200/60">
                            📍 {item.storageLocation}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-amber-600">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-500">
                        {item.reorderLevel} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card3D>
        </motion.div>
      )}

    </div>
  );
}
