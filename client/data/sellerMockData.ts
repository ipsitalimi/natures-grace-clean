import type { OrderStatus, PaymentStatus, SellerOrder } from "@/data/orders";
import { getStoreCategoryNames } from "@/data/storeCategories";

export type { OrderStatus, PaymentStatus, SellerOrder };
export {
  getOrderStatusColor,
  getPaymentStatusColor,
  deliveryStatusForOrderStatus,
  ORDER_STATUS_FLOW,
} from "@/data/orders";

export interface SellerProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  status: "Active" | "Low Stock" | "Out of Stock";
  approvalStatus?: "Approved" | "Pending" | "Rejected";
  imageUrl?: string | null;
  /** @deprecated No live product view tracking — do not display in UI. */
  views?: number;
  /** @deprecated No live save tracking — do not display in UI. */
  saves?: number;
  /** @deprecated No live cart-add tracking — do not display in UI. */
  cartAdds?: number;
  /** @deprecated Use `SellerAnalyticsContext.productSales` from paid orders instead. */
  purchases?: number;
}

export interface SellerReview {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  productName: string;
  date: string;
  sellerReply?: string;
  sentiment: "positive" | "neutral" | "negative";
}

/** Promo card shape — data comes from `seller_promos` via `sellerPromosService`. */
export interface SellerPromo {
  id: string;
  code: string;
  type: "Percentage" | "Fixed";
  value: number;
  usageCount: number;
  /** `null` = unlimited uses (UI shows ∞). */
  usageLimit: number | null;
  expiry: string;
  status: "Active" | "Expired" | "Paused";
  description: string;
}

export interface WalletTransaction {
  id: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  date: string;
}

export const SELLER_CATEGORIES = getStoreCategoryNames();

export function getCategoryShortName(category: string): string {
  switch (category) {
    case "Spiritual Manifestation & Protection":
      return "Spiritual";
    case "Mindful Radiance":
      return "Beauty";
    case "Conscious Nutrition":
      return "Nutrition";
    case "Spirit & Space":
      return "Space";
    case "Sacred Rituals":
      return "Rituals";
    case "Daily Vitality":
      return "Vitality";
    default:
      return category;
  }
}

export function getStockColor(status: SellerProduct["status"]): { bg: string; text: string } {
  switch (status) {
    case "Active":
      return { bg: "rgba(1, 50, 32, 0.1)", text: "#013220" };
    case "Low Stock":
      return { bg: "rgba(212, 148, 58, 0.12)", text: "#B8860B" };
    case "Out of Stock":
      return { bg: "rgba(139, 58, 58, 0.1)", text: "#8B3A3A" };
  }
}
