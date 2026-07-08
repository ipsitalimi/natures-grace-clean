import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type { CartCheckoutState, CartItem, ProductSnapshot } from "@/data/cart";
import { EMPTY_CHECKOUT } from "@/data/cart";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import * as cartService from "@/services/commerce/cartService";
import type { DeliveryTierId } from "@/constants/sellerDelivery";

export type { CartItem } from "@/data/cart";

interface CartContextType {
  items: CartItem[];
  checkout: CartCheckoutState;
  cartLoading: boolean;
  cartError: string | null;
  cartMutating: boolean;
  refreshCart: () => Promise<void>;
  addItem: (productId: string, product?: ProductSnapshot) => Promise<boolean>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  setDeliveryOption: (deliveryOption: string) => Promise<void>;
  setSellerDeliveryOption: (sellerId: string, optionId: DeliveryTierId) => Promise<void>;
  removeOrderedItems: (productIds: string[]) => Promise<void>;
  setOrderNote: (note: string) => Promise<void>;
  prepareCheckout: () => Promise<CartCheckoutState | null>;
  clearCart: () => Promise<void>;
  applyPromoCode: (code: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  clearAppliedPromo: () => Promise<void>;
  getItemCount: () => number;
  getItemQuantity: (productId: string) => number;
}

const CartContext = createContext<CartContextType | null>(null);

function applySnapshot(
  setItems: React.Dispatch<React.SetStateAction<CartItem[]>>,
  setCheckout: React.Dispatch<React.SetStateAction<CartCheckoutState>>,
  snap: cartService.CartSnapshot | null
) {
  if (!snap) return;
  setItems(snap.items);
  setCheckout(snap.checkout);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading, isConfigured: authConfigured } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [checkout, setCheckout] = useState<CartCheckoutState>({ ...EMPTY_CHECKOUT });
  const [cartLoading, setCartLoading] = useState(isSupabaseConfigured());
  const [cartError, setCartError] = useState<string | null>(null);
  const [cartMutating, setCartMutating] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setItems([]);
      setCheckout({ ...EMPTY_CHECKOUT });
      setCartLoading(false);
      setCartError(null);
      return;
    }

    if (!session?.user) {
      setItems([]);
      setCheckout({ ...EMPTY_CHECKOUT });
      setCartLoading(false);
      setCartError(null);
      return;
    }

    setCartLoading(true);
    setCartError(null);
    try {
      const snap = await cartService.fetchCart();
      setItems(snap.items);
      setCheckout(snap.checkout);
    } catch (err) {
      setCartError(err instanceof Error ? err.message : "Could not load cart");
      setItems([]);
      setCheckout({ ...EMPTY_CHECKOUT });
    } finally {
      setCartLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      refreshCart();
      return;
    }
    if (authConfigured && authLoading) return;
    refreshCart();
  }, [refreshCart, authConfigured, authLoading, session?.user?.id]);

  const runMutation = useCallback(
    async (fn: () => Promise<cartService.CartSnapshot | null>) => {
      if (!isSupabaseConfigured() || !session?.user) return;
      setCartMutating(true);
      try {
        const snap = await fn();
        applySnapshot(setItems, setCheckout, snap);
      } finally {
        setCartMutating(false);
      }
    },
    [session?.user]
  );

  const addItem = useCallback(
    async (productId: string, product?: ProductSnapshot) => {
      if (!isSupabaseConfigured() || !session?.user) return false;
      let ok = false;
      await runMutation(async () => {
        const snap = await cartService.addOrIncrementItem(productId, product);
        if (snap) {
          ok = snap.items.some((i) => i.productId === productId);
        }
        return snap;
      });
      return ok;
    },
    [session?.user, runMutation]
  );

  const removeItem = useCallback(
    async (productId: string) => {
      if (!isSupabaseConfigured() || !session?.user) return;
      await runMutation(() => cartService.removeItem(productId));
    },
    [session?.user, runMutation]
  );

  const updateQuantity = useCallback(
    async (productId: string, quantity: number) => {
      if (!isSupabaseConfigured() || !session?.user) return;
      await runMutation(() => cartService.setItemQuantity(productId, quantity));
    },
    [session?.user, runMutation]
  );

  const setSellerDeliveryOption = useCallback(
    async (sellerId: string, optionId: DeliveryTierId) => {
      if (!isSupabaseConfigured() || !session?.user) return;
      setCartMutating(true);
      try {
        const snap = await cartService.setSellerDeliveryOption(sellerId, optionId);
        if (snap) {
          setItems(snap.items);
          setCheckout(snap.checkout);
        }
      } finally {
        setCartMutating(false);
      }
    },
    [session?.user]
  );

  const removeOrderedItems = useCallback(
    async (productIds: string[]) => {
      if (!isSupabaseConfigured() || !session?.user) return;
      await runMutation(() => cartService.removeItemsByProductIds(productIds));
    },
    [session?.user, runMutation]
  );

  const setDeliveryOption = useCallback(
    async (deliveryOption: string) => {
      if (!isSupabaseConfigured() || !session?.user) return;
      setCartMutating(true);
      try {
        const next = await cartService.updateCartPreferences({ deliveryOption });
        if (next) setCheckout(next);
        const snap = await cartService.fetchCart();
        setItems(snap.items);
        setCheckout(snap.checkout);
      } finally {
        setCartMutating(false);
      }
    },
    [session?.user]
  );

  const setOrderNote = useCallback(
    async (note: string) => {
      if (!isSupabaseConfigured() || !session?.user) {
        setCheckout((c) => ({ ...c, orderNote: note }));
        return;
      }
      const next = await cartService.updateCartPreferences({ orderNote: note });
      if (next) setCheckout((c) => ({ ...c, orderNote: next.orderNote }));
    },
    [session?.user]
  );

  const prepareCheckout = useCallback(async () => {
    if (!isSupabaseConfigured() || !session?.user) return null;
    setCartMutating(true);
    try {
      const snap = await cartService.prepareCheckout();
      if (!snap) return null;
      setItems(snap.items);
      setCheckout(snap.checkout);
      return snap.checkout;
    } finally {
      setCartMutating(false);
    }
  }, [session?.user]);

  const clearAppliedPromo = useCallback(async () => {
    if (!isSupabaseConfigured() || !session?.user) return;
    setCartMutating(true);
    try {
      const snap = await cartService.clearAppliedPromo();
      if (snap) {
        setItems(snap.items);
        setCheckout(snap.checkout);
      }
    } finally {
      setCartMutating(false);
    }
  }, [session?.user]);

  const applyPromoCode = useCallback(
    async (code: string) => {
      if (!isSupabaseConfigured() || !session?.user) {
        return { ok: false as const, error: "Sign in required" };
      }
      setCartMutating(true);
      try {
        const res = await cartService.applyPromoCode(code.trim());
        if ("error" in res) {
          return { ok: false as const, error: res.error };
        }
        setItems(res.snap.items);
        setCheckout(res.snap.checkout);
        return { ok: true as const };
      } finally {
        setCartMutating(false);
      }
    },
    [session?.user]
  );

  const clearCart = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setItems([]);
      setCheckout({ ...EMPTY_CHECKOUT });
      return;
    }
    await cartService.clearCart();
    setItems([]);
    setCheckout({ ...EMPTY_CHECKOUT });
  }, []);

  const getItemCount = useCallback(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const getItemQuantity = useCallback(
    (productId: string) => {
      const item = items.find((i) => i.productId === productId);
      return item ? item.quantity : 0;
    },
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        checkout,
        cartLoading,
        cartError,
        cartMutating,
        refreshCart,
        addItem,
        removeItem,
        updateQuantity,
        setDeliveryOption,
        setSellerDeliveryOption,
        removeOrderedItems,
        setOrderNote,
        prepareCheckout,
        clearCart,
        applyPromoCode,
        clearAppliedPromo,
        getItemCount,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
