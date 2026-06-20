/** Shopping cart types (Supabase-backed). */

export type CartCheckoutStatus = "active" | "checkout" | "completed";

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  productName: string;
  productCategory: string;
}

export interface CartCheckoutState {
  sessionId: string | null;
  deliveryOption: string;
  orderNote: string;
  checkoutStatus: CartCheckoutStatus;
  subtotal: number;
  deliveryFee: number;
  promoDiscount: number;
  sellerPromoId: string | null;
  platformPromoId: string | null;
  promoCode: string;
  total: number;
}

export interface ProductSnapshot {
  name: string;
  category: string;
  price: number;
}

export const EMPTY_CHECKOUT: CartCheckoutState = {
  sessionId: null,
  deliveryOption: "standard",
  orderNote: "",
  checkoutStatus: "active",
  subtotal: 0,
  deliveryFee: 0,
  promoDiscount: 0,
  sellerPromoId: null,
  platformPromoId: null,
  promoCode: "",
  total: 0,
};
