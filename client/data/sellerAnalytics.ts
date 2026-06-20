/** Seller dashboard analytics (derived from `orders` + wallet). */

export interface SellerDashboardStats {
  revenue: number;
  totalSales: number;
  ordersThisWeek: number;
  pendingOrderCount: number;
  paidOrderCount: number;
  pendingPaymentCount: number;
}

export interface RevenueChartPoint {
  label: string;
  amount: number;
}

export interface CategoryPerformanceRow {
  category: string;
  sales: number;
  revenue: number;
  color: string;
}

export interface SellerWalletSummary {
  availableBalance: number;
  pendingPayout: number;
  heldBalance: number;
  totalEarned: number;
}

/** Paid order line-item totals keyed by product id (from `order_items`). */
export interface ProductSalesRow {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
}

export interface SellerAnalyticsSnapshot {
  stats: SellerDashboardStats;
  weeklyRevenue: RevenueChartPoint[];
  monthlyRevenue: RevenueChartPoint[];
  categoryPerformance: CategoryPerformanceRow[];
  productSales: ProductSalesRow[];
  wallet: SellerWalletSummary;
}

export const EMPTY_SELLER_ANALYTICS: SellerAnalyticsSnapshot = {
  stats: {
    revenue: 0,
    totalSales: 0,
    ordersThisWeek: 0,
    pendingOrderCount: 0,
    paidOrderCount: 0,
    pendingPaymentCount: 0,
  },
  weeklyRevenue: [
    { label: "Mon", amount: 0 },
    { label: "Tue", amount: 0 },
    { label: "Wed", amount: 0 },
    { label: "Thu", amount: 0 },
    { label: "Fri", amount: 0 },
    { label: "Sat", amount: 0 },
    { label: "Sun", amount: 0 },
  ],
  monthlyRevenue: [],
  categoryPerformance: [],
  productSales: [],
  wallet: {
    availableBalance: 0,
    pendingPayout: 0,
    heldBalance: 0,
    totalEarned: 0,
  },
};
