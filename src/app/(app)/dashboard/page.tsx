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
  const { activeShop } = useShop();

  const [period, setPeriod] = useState<TimePeriod>("month");
  const [data, setData] = useState<DashboardTelemetry | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTelemetry = useCallback(async () => {
    if (!business || !activeShop) return;
    setLoading(true);
    try {
      const telemetry = await AnalyticsEngine.getDashboardTelemetry(business.id, activeShop.id, period);
      setData(telemetry);
    } catch (err) {
      toast.error("Failed to load telemetry data");
    } finally {
      setLoading(false);
    }
  }, [business, activeShop, period]);

  useEffect(() => {
    loadTelemetry();
  }, [loadTelemetry]);

  // Formatter for recharts tooltip and axes
  const formatYAxis = (minorUnits: number) => {
    if (!business) return "";
    const major = minorUnits / 100;
    if (major >= 1000000) return `${business.currency} ${(major / 1000000).toFixed(1)}M`;
    if (major >= 1000) return `${business.currency} ${(major / 1000).toFixed(1)}k`;
    return `${business.currency} ${major}`;
  };

  const formatTooltip = (value: any) => {
    if (typeof value !== "number") return value;
    return formatCurrency(value, business?.currency);
  };

  if (!activeShop || !business) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Activity className="w-12 h-12 mb-4 opacity-20 animate-pulse" />
        <p>No active shop selected.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      
      {/* Header & Period Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Telemetry Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time performance metrics for {activeShop.name}</p>
        </div>
        
        <div className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm flex text-sm font-medium">
          <button 
            onClick={() => setPeriod("today")}
            className={`px-4 py-1.5 rounded-md transition-colors ${period === "today" ? "bg-gray-100 text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
          >
            Today
          </button>
          <button 
            onClick={() => setPeriod("week")}
            className={`px-4 py-1.5 rounded-md transition-colors ${period === "week" ? "bg-gray-100 text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
          >
            This Week
          </button>
          <button 
            onClick={() => setPeriod("month")}
            className={`px-4 py-1.5 rounded-md transition-colors ${period === "month" ? "bg-gray-100 text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
          >
            This Month
          </button>
          <button 
            onClick={() => setPeriod("year")}
            className={`px-4 py-1.5 rounded-md transition-colors ${period === "year" ? "bg-gray-100 text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
          >
            This Year
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white h-32 rounded-xl border border-gray-100 animate-pulse"></div>)}
        </div>
      )}

      {/* KPI Cards */}
      {data && (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue */}
          <motion.div variants={itemVariants} className="h-full"><Card3D className="glass-card p-5 rounded-2xl border-none shadow-xl flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Revenue</span>
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(data.revenueMinor, business.currency)}</div>
          </Card3D></motion.div>

          {/* Gross Profit */}
          <motion.div variants={itemVariants} className="h-full"><Card3D className="glass-card p-5 rounded-2xl border-none shadow-xl flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Gross Profit</span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(data.grossProfitMinor, business.currency)}</div>
          </Card3D></motion.div>

          {/* Net Profit */}
          <motion.div variants={itemVariants} className="h-full"><Card3D className="glass-card p-5 rounded-2xl border-none shadow-xl flex flex-col h-full overflow-hidden relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Net Profit</span>
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                <Activity className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <div className={`text-2xl font-bold relative z-10 ${data.netProfitMinor >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {formatCurrency(data.netProfitMinor, business.currency)}
            </div>
            <p className="text-xs text-gray-400 mt-1">Gross Profit - Expenses</p>
          </Card3D></motion.div>

          {/* Low Stock */}
          <motion.div variants={itemVariants} className="h-full"><Card3D className="glass-card p-5 rounded-2xl border border-amber-200/50 shadow-xl flex flex-col hover:border-amber-300/50 transition-colors group relative overflow-hidden h-full cursor-pointer" onClick={() => window.location.href="/inventory"}>
            <div className="absolute right-0 top-0 h-full w-1 bg-amber-400"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Stock Alerts</span>
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.lowStockCount} <span className="text-base font-normal text-amber-600/70 dark:text-amber-400/70">items</span></div>
          </Card3D></motion.div>
        </motion.div>
      )}

      {/* Secondary Financials */}
      {data && (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div variants={itemVariants} className="h-full"><Card3D className="glass-card p-4 rounded-2xl border-none shadow-lg flex items-center justify-between group hover:border-[#10B981] transition-colors cursor-pointer h-full" onClick={() => window.location.href="/customers"}>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Receivables (Owed to you)</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(data.totalReceivablesMinor, business.currency)}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#10B981] group-hover:translate-x-1 transition-all" />
          </Card3D></motion.div>
          <motion.div variants={itemVariants} className="h-full"><Card3D className="glass-card p-4 rounded-2xl border-none shadow-lg flex items-center justify-between group hover:border-[#10B981] transition-colors cursor-pointer h-full" onClick={() => window.location.href="/suppliers"}>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Payables (You owe)</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(data.totalPayablesMinor, business.currency)}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#10B981] group-hover:translate-x-1 transition-all" />
          </Card3D></motion.div>
          <motion.div variants={itemVariants} className="h-full"><Card3D className="glass-card p-4 rounded-2xl border-none shadow-lg flex items-center justify-between h-full">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Inventory Value</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(data.inventoryValueMinor, business.currency)}</p>
            </div>
            <PackageOpen className="w-6 h-6 text-gray-400" />
          </Card3D></motion.div>
        </motion.div>
      )}

      {/* Charts Row */}
      {data && (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Trend Chart */}
          <motion.div variants={itemVariants} className="lg:col-span-2 h-full"><Card3D className="glass-card p-5 rounded-3xl border-none shadow-2xl min-h-[350px] flex flex-col h-full" maxTilt={2}>
            <h3 className="font-semibold text-gray-900 mb-6">Revenue vs Net Profit</h3>
            <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.chartData} margin={{ top: 5, right: 0, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={formatYAxis} tick={{ fontSize: 12, fill: '#6B7280' }} dx={-10} />
                  <Tooltip formatter={formatTooltip} cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card3D></motion.div>

          {/* Expense Distribution Pie Chart */}
          <motion.div variants={itemVariants} className="h-full"><Card3D className="glass-card p-5 rounded-3xl border-none shadow-2xl min-h-[350px] flex flex-col h-full" maxTilt={3}>
            <h3 className="font-semibold text-gray-900 mb-2">Operating Expenses</h3>
            
            {data.expenseDistribution.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <p>No expenses recorded in this period.</p>
                <Link href="/expenses" className="text-sm text-[#10B981] hover:underline mt-2">Log an expense</Link>
              </div>
            ) : (
              <div className="flex-1 w-full min-h-[250px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.expenseDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.expenseDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={formatTooltip} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Legend */}
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto px-2">
                  {data.expenseDistribution.map((entry, index) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="text-gray-600">{entry.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{formatCurrency(entry.value, business.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card3D></motion.div>
          
        </motion.div>
      )}

    </div>
  );
}
