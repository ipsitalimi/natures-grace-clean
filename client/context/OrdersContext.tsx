import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ORDER_STATUS_FLOW,
  type OrderStatus,
  type PaymentStatus,
  type SellerOrder,
} from "@/data/orders";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import * as ordersService from "@/services/content/ordersService";
import { resolveSellerIdByProfileId } from "@/services/commerce/sellerId";

interface OrdersContextType {
  ordersLoading: boolean;
  ordersError: string | null;
  isRemoteOrders: boolean;
  orders: SellerOrder[];
  userOrders: SellerOrder[];
  refreshOrders: (options?: { silent?: boolean }) => Promise<void>;
  pendingOrderCount: number;
  recentOrders: SellerOrder[];
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  advanceOrderStatus: (
    orderId: string,
    options?: { courier?: string; trackingNumber?: string }
  ) => Promise<void>;
  createOrderFromCheckout: (input: ordersService.CreateOrderInput) => Promise<SellerOrder | null>;
}

const OrdersContext = createContext<OrdersContextType | null>(null);

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading, isConfigured: authConfigured, profile } = useAuth();
  const [ordersLoading, setOrdersLoading] = useState(isSupabaseConfigured());
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [isRemoteOrders, setIsRemoteOrders] = useState(false);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [userOrders, setUserOrders] = useState<SellerOrder[]>([]);

  const refreshOrders = useCallback(async (options?: { silent?: boolean }) => {
    if (!isSupabaseConfigured()) {
      setOrdersLoading(false);
      return;
    }

    if (!options?.silent) {
      setOrdersLoading(true);
    }
    setOrdersError(null);
    try {
      let remote: SellerOrder[] = [];
      let buyerOrders: SellerOrder[] = [];
      if (profile?.role === "Seller" && profile.id) {
        const sellerId = await resolveSellerIdByProfileId(profile.id);
        remote = sellerId ? await ordersService.fetchOrdersForSeller(sellerId) : [];
      } else if (profile?.role === "Admin") {
        remote = await ordersService.fetchSellerOrders();
      }
      if (session?.user?.id) {
        buyerOrders = await ordersService.fetchOrdersForUser(session.user.id);
        void ordersService.cleanupStalePendingOrders(session.user.id);
      }
      setOrders(remote);
      setUserOrders(buyerOrders);
      setIsRemoteOrders(true);
    } catch (err) {
      console.error("[OrdersContext] refresh failed:", err);
      setOrdersError(
        err instanceof Error ? err.message : "Could not load orders. Pull to refresh or try again."
      );
    } finally {
      if (!options?.silent) {
        setOrdersLoading(false);
      }
    }
  }, [profile?.id, profile?.role, session?.user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      refreshOrders();
      return;
    }
    if (authConfigured && authLoading) return;
    refreshOrders();
  }, [refreshOrders, authConfigured, authLoading, session?.user?.id, profile?.role]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    if (!isSupabaseConfigured()) return;
    const updated = await ordersService.updateOrderStatus(orderId, status);
    if (updated) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    }
  }, []);

  const advanceOrderStatus = useCallback(
    async (orderId: string, options?: { courier?: string; trackingNumber?: string }) => {
      const current = orders.find((o) => o.id === orderId);
      if (!current || current.status === "Cancelled" || current.status === "Delivered") return;
      const idx = ORDER_STATUS_FLOW.indexOf(current.status);
      const next =
        idx >= 0 && idx < ORDER_STATUS_FLOW.length - 1 ? ORDER_STATUS_FLOW[idx + 1] : current.status;

      if (next === "Shipped" && options) {
        await ordersService.updateOrderShipping(orderId, {
          courier: options.courier,
          trackingNumber: options.trackingNumber,
          trackingStatus: "In transit",
        });
      }

      await updateOrderStatus(orderId, next);
    },
    [orders, updateOrderStatus]
  );

  const createOrderFromCheckout = useCallback(
    async (input: ordersService.CreateOrderInput) => {
      const payload = {
        ...input,
        userId: input.userId ?? session?.user?.id,
        customerName:
          input.customerName ||
          profile?.full_name ||
          profile?.email?.split("@")[0] ||
          "Guest",
        customerEmail: input.customerEmail ?? profile?.email,
      };

      if (isSupabaseConfigured()) {
        const created = await ordersService.createOrder(payload);
        if (created) {
          setOrders((prev) => [created, ...prev]);
          if (session?.user?.id) {
            setUserOrders((prev) => [created, ...prev]);
          }
          setIsRemoteOrders(true);
          return created;
        }
        return null;
      }

      return null;
    },
    [session?.user?.id, profile]
  );

  const pendingOrderCount = useMemo(
    () => orders.filter((o) => o.status === "Pending").length,
    [orders]
  );

  const recentOrders = useMemo(() => orders.slice(0, 3), [orders]);

  const value: OrdersContextType = {
    ordersLoading,
    ordersError,
    isRemoteOrders,
    orders,
    userOrders,
    refreshOrders,
    pendingOrderCount,
    recentOrders,
    updateOrderStatus,
    advanceOrderStatus,
    createOrderFromCheckout,
  };

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrdersContext(): OrdersContextType {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrdersContext must be used inside OrdersProvider");
  return ctx;
}
