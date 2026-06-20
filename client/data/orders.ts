/** Shared order types for Seller, Admin, and checkout flows. */

export type OrderStatus = "Pending" | "Packed" | "Shipped" | "Delivered" | "Cancelled";
export type PaymentStatus = "Paid" | "Pending" | "Refunded";
export type DeliveryStatus = "Pending" | "Processing" | "In Transit" | "Delivered" | "Cancelled";

/** Flattened row shape used by seller order cards (one card per order). */
export interface SellerOrder {
  id: string;
  orderId: string;
  customerName: string;
  productName: string;
  productCategory: string;
  price: number;
  qty: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  date: string;
}

export function deliveryStatusForOrderStatus(status: OrderStatus): DeliveryStatus {
  switch (status) {
    case "Packed":
      return "Processing";
    case "Shipped":
      return "In Transit";
    case "Delivered":
      return "Delivered";
    case "Cancelled":
      return "Cancelled";
    default:
      return "Pending";
  }
}

export function getOrderStatusColor(status: OrderStatus): { bg: string; text: string } {
  switch (status) {
    case "Pending":
      return { bg: "rgba(212, 148, 58, 0.12)", text: "#B8860B" };
    case "Packed":
      return { bg: "rgba(108, 180, 217, 0.15)", text: "#2B6CB0" };
    case "Shipped":
      return { bg: "rgba(123, 196, 127, 0.15)", text: "#276749" };
    case "Delivered":
      return { bg: "rgba(1, 50, 32, 0.1)", text: "#013220" };
    case "Cancelled":
      return { bg: "rgba(139, 58, 58, 0.1)", text: "#8B3A3A" };
  }
}

export function getPaymentStatusColor(status: PaymentStatus): { bg: string; text: string } {
  switch (status) {
    case "Paid":
      return { bg: "rgba(1, 50, 32, 0.1)", text: "#013220" };
    case "Pending":
      return { bg: "rgba(212, 148, 58, 0.12)", text: "#B8860B" };
    case "Refunded":
      return { bg: "rgba(139, 58, 58, 0.1)", text: "#8B3A3A" };
  }
}

export const ORDER_STATUS_FLOW: OrderStatus[] = ["Pending", "Packed", "Shipped", "Delivered"];

export function getNextOrderStatus(current: OrderStatus): OrderStatus | null {
  if (current === "Cancelled" || current === "Delivered") return null;
  const idx = ORDER_STATUS_FLOW.indexOf(current);
  if (idx < 0 || idx >= ORDER_STATUS_FLOW.length - 1) return null;
  return ORDER_STATUS_FLOW[idx + 1];
}

const ADVANCE_CONFIRM_MESSAGES: Partial<Record<OrderStatus, string>> = {
  Packed: "Confirm this order is packed and ready to ship?",
  Delivered: "Confirm this order was delivered to the customer?",
};

export function getOrderAdvanceConfirmMessage(
  orderNumber: string,
  nextStatus: OrderStatus
): string {
  const base = ADVANCE_CONFIRM_MESSAGES[nextStatus];
  if (base) return `${base}\n\nOrder ${orderNumber}`;
  return `Advance order ${orderNumber} to ${nextStatus}?`;
}
