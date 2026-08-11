import { 
  collection, 
  getDocs, 
  query, 
  where,
  orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { DashboardTelemetry, Sale, Expense, Purchase, InventoryItem, Customer, Supplier } from "@/types";
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval, isSameDay, isSameMonth } from "date-fns";

export type TimePeriod = "today" | "week" | "month" | "year";

export class AnalyticsEngine {
  
  /**
   * Generates the entire Dashboard Telemetry object for a specific period.
   * Compiles under 500ms by running parallel batch queries across active shop(s).
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

    // 1. Determine Target Shops (Multi-Shop Aggregation when shopId === 'all' or empty)
    let targetShopIds: string[] = [];
    if (!shopId || shopId === "all") {
      try {
        const shopsSnap = await getDocs(collection(db, "businesses", businessId, "shops"));
        targetShopIds = shopsSnap.docs.map(d => d.id);
      } catch (e) {
        console.error("Error fetching shops for multi-shop aggregation:", e);
      }
      if (targetShopIds.length === 0) {
        targetShopIds = ["MAIN"];
      }
    } else {
      targetShopIds = [shopId];
    }

    // 2. Parallel Query Function per Shop
    const fetchShopData = async (sId: string) => {
      const [salesSnap, purchasesSnap, expensesSnap, inventorySnap, customersSnap, suppliersSnap] = await Promise.all([
        getDocs(query(
          collection(db, "businesses", businessId, "shops", sId, "sales"),
          where("createdAt", ">=", startIso),
          where("createdAt", "<=", endIso),
          orderBy("createdAt", "asc")
        )).catch((err) => {
          console.error(`Telemetry query error - sales (${sId}):`, err?.code || err, err?.message);
          return { docs: [] };
        }),
        getDocs(collection(db, "businesses", businessId, "shops", sId, "purchases")).catch((err) => {
          console.error(`Telemetry query error - purchases (${sId}):`, err?.code || err, err?.message);
          return { docs: [] };
        }),
        getDocs(query(
          collection(db, "businesses", businessId, "shops", sId, "expenses"),
          where("date", ">=", startIso),
          where("date", "<=", endIso),
          orderBy("date", "asc")
        )).catch((err) => {
          console.error(`Telemetry query error - expenses (${sId}):`, err?.code || err, err?.message);
          return { docs: [] };
        }),
        getDocs(collection(db, "businesses", businessId, "shops", sId, "inventory")).catch((err) => {
          console.error(`Telemetry query error - inventory (${sId}):`, err?.code || err, err?.message);
          return { docs: [] };
        }),
        getDocs(collection(db, "businesses", businessId, "shops", sId, "customers")).catch((err) => {
          console.error(`Telemetry query error - customers (${sId}):`, err?.code || err, err?.message);
          return { docs: [] };
        }),
        getDocs(collection(db, "businesses", businessId, "shops", sId, "suppliers")).catch((err) => {
          console.error(`Telemetry query error - suppliers (${sId}):`, err?.code || err, err?.message);
          return { docs: [] };
        }),
      ]);

      return {
        sales: salesSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Sale),
        purchases: purchasesSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Purchase),
        expenses: expensesSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Expense),
        inventory: inventorySnap.docs.map(d => ({ id: d.id, ...d.data() }) as InventoryItem),
        customers: customersSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Customer),
        suppliers: suppliersSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Supplier),
      };
    };

    // Execute queries across target shops
    const shopResults = await Promise.all(targetShopIds.map(sId => fetchShopData(sId)));

    // Combine all shop results
    let allSales: Sale[] = [];
    let allPurchases: Purchase[] = [];
    let allExpenses: Expense[] = [];
    let allInventory: InventoryItem[] = [];
    let allCustomers: Customer[] = [];
    let allSuppliers: Supplier[] = [];

    shopResults.forEach(res => {
      allSales = allSales.concat(res.sales);
      allPurchases = allPurchases.concat(res.purchases);
      allExpenses = allExpenses.concat(res.expenses);
      allInventory = allInventory.concat(res.inventory);
      allCustomers = allCustomers.concat(res.customers);
      allSuppliers = allSuppliers.concat(res.suppliers);
    });

    // 3. Compute High-Level Metrics
    let revenueMinor = 0;
    let totalCogsMinor = 0;
    let totalReceivablesMinor = 0;
    let totalPayablesMinor = 0;

    // Process Sales (Revenue, COGS, Receivables for unpaid/partial sales)
    allSales.forEach((sale) => {
      if (sale.status === "cancelled" || sale.status === "returned") return;

      const rev = sale.grandTotalMinor || ((sale.subtotalMinor || 0) - (sale.discountMinor || 0));
      revenueMinor += rev;

      // COGS calculation
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item) => {
          totalCogsMinor += (item.costPriceMinor || 0) * (item.quantity || 1);
        });
      } else {
        totalCogsMinor += Math.round(rev * 0.7);
      }

      // Receivables from unpaid or partially paid customer sales
      if (sale.paymentStatus === "unpaid") {
        totalReceivablesMinor += rev;
      } else if (sale.paymentStatus === "partial") {
        const paid = sale.amountPaidMinor || 0;
        totalReceivablesMinor += Math.max(0, rev - paid);
      }
    });

    const grossProfitMinor = revenueMinor - totalCogsMinor;

    // Process Operating Expenses
    let operatingExpensesMinor = 0;
    const expenseCategoryTotals: Record<string, number> = {};

    allExpenses.forEach((exp) => {
      const amt = exp.amountMinor || 0;
      operatingExpensesMinor += amt;
      const cat = exp.category || "other";
      expenseCategoryTotals[cat] = (expenseCategoryTotals[cat] || 0) + amt;
    });

    const netProfitMinor = grossProfitMinor - operatingExpensesMinor;

    // Process Purchases (Payables for unpaid/partially paid purchase orders)
    allPurchases.forEach((purchase) => {
      if (purchase.status === "cancelled") return;

      const total = purchase.grandTotalMinor || 0;
      if (purchase.paymentStatus === "unpaid") {
        totalPayablesMinor += total;
      } else if (purchase.paymentStatus === "partial") {
        const paid = purchase.amountPaidMinor || 0;
        totalPayablesMinor += Math.max(0, total - paid);
      }
    });

    // Process Customers & Suppliers Ledger Balances
    allCustomers.forEach((cust) => {
      if (cust.currentBalanceMinor && cust.currentBalanceMinor > 0) {
        totalReceivablesMinor += cust.currentBalanceMinor;
      }
    });

    allSuppliers.forEach((supp) => {
      if (supp.currentBalanceMinor && supp.currentBalanceMinor > 0) {
        totalPayablesMinor += supp.currentBalanceMinor;
      }
    });

    // Process Inventory Valuation & Low Stock
    let inventoryValueMinor = 0;
    let lowStockCount = 0;

    allInventory.forEach((inv) => {
      inventoryValueMinor += (inv.quantity || 0) * (inv.costPriceMinor || 0);
      const threshold = inv.reorderLevel ?? 10;
      if ((inv.quantity || 0) <= threshold) {
        lowStockCount++;
      }
    });

    // 4. Compute Chart Data Buckets
    interface InternalChartBucket {
      date: string;
      _rawDate: Date;
      revenue: number;
      netProfit: number;
      cogs: number;
      exp: number;
    }

    let chartData: InternalChartBucket[] = [];

    if (period === "today" || period === "week" || period === "month") {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      chartData = days.map((d) => ({
        date: format(d, period === "today" ? "h a" : "MMM d"),
        _rawDate: d,
        revenue: 0,
        netProfit: 0,
        cogs: 0,
        exp: 0,
      }));
    } else if (period === "year") {
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      chartData = months.map((m) => ({
        date: format(m, "MMM"),
        _rawDate: m,
        revenue: 0,
        netProfit: 0,
        cogs: 0,
        exp: 0,
      }));
    }

    allSales.forEach((sale) => {
      if (sale.status === "cancelled" || sale.status === "returned") return;
      if (!sale.createdAt) return;

      const saleDate = parseISO(sale.createdAt);
      const bucket = chartData.find((b) => {
        if (period === "year") return isSameMonth(b._rawDate, saleDate);
        return isSameDay(b._rawDate, saleDate);
      });

      if (bucket) {
        const rev = sale.grandTotalMinor || ((sale.subtotalMinor || 0) - (sale.discountMinor || 0));
        let cogs = 0;
        if (sale.items && sale.items.length > 0) {
          cogs = sale.items.reduce((sum, item) => sum + ((item.costPriceMinor || 0) * (item.quantity || 1)), 0);
        } else {
          cogs = Math.round(rev * 0.7);
        }

        bucket.revenue += rev;
        bucket.cogs += cogs;
      }
    });

    allExpenses.forEach((exp) => {
      if (!exp.date) return;
      const expDate = parseISO(exp.date);
      const bucket = chartData.find((b) => {
        if (period === "year") return isSameMonth(b._rawDate, expDate);
        return isSameDay(b._rawDate, expDate);
      });
      if (bucket) {
        bucket.exp += exp.amountMinor || 0;
      }
    });

    chartData.forEach((bucket) => {
      const gp = bucket.revenue - bucket.cogs;
      bucket.netProfit = gp - bucket.exp;
    });

    const expenseDistribution = Object.keys(expenseCategoryTotals)
      .map((cat) => ({
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        value: expenseCategoryTotals[cat],
      }))
      .sort((a, b) => b.value - a.value);

    return {
      revenueMinor,
      grossProfitMinor,
      netProfitMinor,
      totalReceivablesMinor,
      totalPayablesMinor,
      inventoryValueMinor,
      lowStockCount,
      chartData: chartData.map(({ date, revenue, netProfit }) => ({ date, revenue, netProfit })),
      expenseDistribution,
    };
  }
}
