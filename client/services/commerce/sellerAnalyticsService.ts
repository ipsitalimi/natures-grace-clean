import type {
  CategoryPerformanceRow,
  ProductSalesRow,
  RevenueChartPoint,
  SellerAnalyticsSnapshot,
  SellerDashboardStats,
  SellerWalletSummary,
} from "@/data/sellerAnalytics";
import { EMPTY_SELLER_ANALYTICS } from "@/data/sellerAnalytics";
import { resolveSellerIdByProfileId } from "@/services/commerce/sellerId";
import {
  fetchOrdersWithItems,
  type DbOrderRow,
  type OrderWithItems,
} from "@/services/content/ordersService";
import { fetchWalletSnapshot } from "@/services/content/walletService";

const CATEGORY_COLORS = [
  "#E8A0B5",
  "#7B68EE",
  "#6CB4D9",
  "#D4943A",
  "#7BC47F",
  "#4A9A5B",
  "#C9A96E",
  "#8B6B4A",
];

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function isActiveOrder(order: DbOrderRow): boolean {
  return order.status !== "Cancelled";
}

function countsTowardRevenue(order: DbOrderRow): boolean {
  return order.payment_status === "Paid" && isActiveOrder(order);
}

function getMondayWeekStart(reference = new Date()): Date {
  const d = new Date(reference);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function filterOrdersForSeller(
  rows: OrderWithItems[],
  sellerId: string | null
): OrderWithItems[] {
  if (!sellerId) return rows;
  return rows.filter(
    ({ order }) => order.seller_id === sellerId
  );
}

export function buildSellerAnalytics(
  rows: OrderWithItems[],
  wallet: SellerWalletSummary | null
): SellerAnalyticsSnapshot {
  const active = rows.filter(({ order }) => isActiveOrder(order));
  const paid = rows.filter(({ order }) => countsTowardRevenue(order));

  const revenue = paid.reduce((sum, { order }) => sum + Number(order.total), 0);
  const totalSales = paid.length;

  const now = new Date();
  const weekStart = getMondayWeekStart(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const ordersThisWeek = active.filter(({ order }) => {
    const created = new Date(order.created_at);
    return created >= weekStart && created < weekEnd;
  }).length;

  const stats: SellerDashboardStats = {
    revenue,
    totalSales,
    ordersThisWeek,
    pendingOrderCount: active.filter(({ order }) => order.status === "Pending").length,
    paidOrderCount: active.filter(({ order }) => order.payment_status === "Paid").length,
    pendingPaymentCount: active.filter(({ order }) => order.payment_status === "Pending").length,
  };

  const weeklyRevenue: RevenueChartPoint[] = WEEKDAY_LABELS.map((label, index) => {
    const dayStart = new Date(weekStart);
    dayStart.setDate(dayStart.getDate() + index);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const amount = paid
      .filter(({ order }) => {
        const created = new Date(order.created_at);
        return created >= dayStart && created < dayEnd;
      })
      .reduce((sum, { order }) => sum + Number(order.total), 0);

    return { label, amount: Math.round(amount) };
  });

  const monthlyRevenue: RevenueChartPoint[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const label = monthStart.toLocaleDateString("en-US", { month: "short" });
    const amount = paid
      .filter(({ order }) => {
        const created = new Date(order.created_at);
        return created >= monthStart && created < monthEnd;
      })
      .reduce((sum, { order }) => sum + Number(order.total), 0);
    monthlyRevenue.push({ label, amount: Math.round(amount) });
  }

  const categoryMap = new Map<string, { sales: number; revenue: number }>();
  for (const { order, items } of paid) {
    for (const item of items) {
      const cat = item.product_category || "General";
      const prev = categoryMap.get(cat) ?? { sales: 0, revenue: 0 };
      prev.sales += item.quantity;
      prev.revenue += Number(item.line_total);
      categoryMap.set(cat, prev);
    }
    if (items.length === 0) {
      const prev = categoryMap.get("General") ?? { sales: 0, revenue: 0 };
      prev.sales += 1;
      prev.revenue += Number(order.total);
      categoryMap.set("General", prev);
    }
  }

  const categoryPerformance: CategoryPerformanceRow[] = [...categoryMap.entries()]
    .sort((a, b) => b[1].sales - a[1].sales)
    .map(([category, { sales, revenue: catRevenue }], index) => ({
      category,
      sales,
      revenue: Math.round(catRevenue),
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));

  const productMap = new Map<string, ProductSalesRow>();
  for (const { items } of paid) {
    for (const item of items) {
      const key = item.product_id ?? item.product_name;
      const prev = productMap.get(key) ?? {
        productId: item.product_id ?? key,
        productName: item.product_name,
        quantity: 0,
        revenue: 0,
      };
      prev.quantity += item.quantity;
      prev.revenue += Number(item.line_total);
      productMap.set(key, prev);
    }
  }

  const productSales = [...productMap.values()].sort((a, b) => b.quantity - a.quantity);

  return {
    stats,
    weeklyRevenue,
    monthlyRevenue,
    categoryPerformance,
    productSales,
    wallet: wallet ?? EMPTY_SELLER_ANALYTICS.wallet,
  };
}

export async function fetchSellerAnalytics(
  profileId: string | undefined,
  commissionRate = 10
): Promise<SellerAnalyticsSnapshot> {
  const sellerId = profileId ? await resolveSellerIdByProfileId(profileId) : null;
  const allRows = await fetchOrdersWithItems();
  const rows = filterOrdersForSeller(allRows, sellerId);

  const walletRemote = await fetchWalletSnapshot(commissionRate);
  const wallet: SellerWalletSummary | null = walletRemote
    ? {
        availableBalance: walletRemote.availableBalance,
        pendingPayout: walletRemote.pendingPayout,
        heldBalance: walletRemote.heldBalance,
        totalEarned: walletRemote.totalEarned,
      }
    : null;

  return buildSellerAnalytics(rows, wallet);
}
