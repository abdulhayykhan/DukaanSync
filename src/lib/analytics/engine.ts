import { 
  collection, 
  getDocs, 
  query, 
  where,
  orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { DashboardTelemetry, Sale, Expense } from "@/types";
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval, isSameDay, isSameMonth } from "date-fns";

export type TimePeriod = "today" | "week" | "month" | "year";

export class AnalyticsEngine {
  
  /**
   * Generates the entire Dashboard Telemetry object for a specific period.
   * Compiles under 500ms by running parallel batch queries for the bounded time window.
   */
  static async getDashboardTelemetry(
    businessId: string, 
    shopId: string, 
    period: TimePeriod
  ): Promise<DashboardTelemetry> {
    if (!db) throw new Error("Firestore not initialized");

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    // Determine Time Boundaries
    switch (period) {
      case "today":
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case "week":
        startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "month":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "year":
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
    }

    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    // 1. Fire parallel queries for exact time bounds
    // For global metrics (inventory, receivables, payables) we fetch all active docs
    const [
      salesSnap,
      expensesSnap,
      inventorySnap,
      customersSnap,
      suppliersSnap
    ] = await Promise.all([
      // Sales for period
      getDocs(query(
        collection(db, "businesses", businessId, "shops", shopId, "sales"),
        where("createdAt", ">=", startIso),
        where("createdAt", "<=", endIso),
        orderBy("createdAt", "asc")
      )),
      // Expenses for period
      getDocs(query(
        collection(db, "businesses", businessId, "shops", shopId, "expenses"),
        where("date", ">=", startIso),
        where("date", "<=", endIso),
        orderBy("date", "asc")
      )),
      // All inventory for current valuation & low stock count
      getDocs(collection(db, "businesses", businessId, "shops", shopId, "inventory")),
      // All customers for total receivables
      getDocs(query(collection(db, "businesses", businessId, "customers"), where("currentBalanceMinor", ">", 0))),
      // All suppliers for total payables
      getDocs(query(collection(db, "businesses", businessId, "suppliers"), where("currentBalanceMinor", ">", 0)))
    ]);

    // 2. Parse Results
    const sales = salesSnap.docs.map(d => d.data() as Sale);
    const expenses = expensesSnap.docs.map(d => d.data() as Expense);

    // 3. Compute High-Level Metrics
    let revenueMinor = 0;
    let totalCogsMinor = 0;
    
    // Only completed sales count towards revenue and COGS
    sales.filter(s => s.status === "completed").forEach(sale => {
      revenueMinor += sale.subtotalMinor - sale.discountMinor;
      
      // Calculate historical COGS directly from the sale items
      sale.items.forEach(item => {
        totalCogsMinor += item.costPriceMinor * item.quantity;
      });
    });

    const grossProfitMinor = revenueMinor - totalCogsMinor;
    
    let operatingExpensesMinor = 0;
    const expenseCategoryTotals: Record<string, number> = {};
    
    expenses.forEach(exp => {
      operatingExpensesMinor += exp.amountMinor;
      expenseCategoryTotals[exp.category] = (expenseCategoryTotals[exp.category] || 0) + exp.amountMinor;
    });

    // Enforce strict invariant: Net Profit = Gross Profit - Operating Expenses
    const netProfitMinor = grossProfitMinor - operatingExpensesMinor;

    // Active balances
    let totalReceivablesMinor = 0;
    customersSnap.forEach(d => totalReceivablesMinor += d.data().currentBalanceMinor);
    
    let totalPayablesMinor = 0;
    suppliersSnap.forEach(d => totalPayablesMinor += d.data().currentBalanceMinor);

    let inventoryValueMinor = 0;
    let lowStockCount = 0;
    
    inventorySnap.forEach(d => {
      const inv = d.data();
      inventoryValueMinor += inv.quantity * inv.costPriceMinor;
      if (inv.quantity <= (inv.lowStockThreshold || 5)) {
        lowStockCount++;
      }
    });

    // 4. Compute Chart Data
    interface InternalChartBucket {
      date: string;
      _rawDate: Date;
      revenue: number;
      netProfit: number;
      cogs: number;
      exp: number;
    }

    let chartData: InternalChartBucket[] = [];
    
    // Generate empty buckets
    if (period === "today" || period === "week" || period === "month") {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      chartData = days.map(d => ({
        date: format(d, period === "today" ? 'h a' : 'MMM d'),
        _rawDate: d,
        revenue: 0,
        netProfit: 0,
        cogs: 0,
        exp: 0
      }));
    } else if (period === "year") {
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      chartData = months.map(m => ({
        date: format(m, 'MMM'),
        _rawDate: m,
        revenue: 0,
        netProfit: 0,
        cogs: 0,
        exp: 0
      }));
    }

    // Fill buckets
    sales.filter(s => s.status === "completed").forEach(sale => {
      const saleDate = parseISO(sale.createdAt);
      const bucket = chartData.find(b => {
        if (period === "year") return isSameMonth(b._rawDate, saleDate);
        return isSameDay(b._rawDate, saleDate);
      });
      
      if (bucket) {
        const rev = sale.subtotalMinor - sale.discountMinor;
        const cogs = sale.items.reduce((sum, item) => sum + (item.costPriceMinor * item.quantity), 0);
        
        bucket.revenue += rev;
        bucket.cogs += cogs;
      }
    });

    expenses.forEach(exp => {
      const expDate = parseISO(exp.date);
      const bucket = chartData.find(b => {
        if (period === "year") return isSameMonth(b._rawDate, expDate);
        return isSameDay(b._rawDate, expDate);
      });
      if (bucket) {
        bucket.exp += exp.amountMinor;
      }
    });

    // Finalize bucket profits
    chartData.forEach(bucket => {
      const gp = bucket.revenue - bucket.cogs;
      bucket.netProfit = gp - bucket.exp;
    });

    // Map expense distribution
    const expenseDistribution = Object.keys(expenseCategoryTotals).map(cat => ({
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      value: expenseCategoryTotals[cat]
    })).sort((a, b) => b.value - a.value);

    return {
      revenueMinor,
      grossProfitMinor,
      netProfitMinor,
      totalReceivablesMinor,
      totalPayablesMinor,
      inventoryValueMinor,
      lowStockCount,
      chartData: chartData.map(({ date, revenue, netProfit }) => ({ date, revenue, netProfit })),
      expenseDistribution
    };
  }
}
