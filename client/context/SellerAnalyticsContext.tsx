import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  EMPTY_SELLER_ANALYTICS,
  type SellerAnalyticsSnapshot,
} from "@/data/sellerAnalytics";
import { useAuth } from "@/context/AuthContext";
import { useOrdersContext } from "@/context/OrdersContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import * as sellerAnalyticsService from "@/services/commerce/sellerAnalyticsService";

interface SellerAnalyticsContextType extends SellerAnalyticsSnapshot {
  analyticsLoading: boolean;
  analyticsError: string | null;
  isRemoteAnalytics: boolean;
  refreshAnalytics: () => Promise<void>;
}

const SellerAnalyticsContext = createContext<SellerAnalyticsContextType | null>(null);

export function SellerAnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { session, profile, loading: authLoading, isConfigured: authConfigured } = useAuth();
  const { settings } = usePlatformConfig();
  const { ordersLoading, isRemoteOrders } = useOrdersContext();
  const commissionRate = settings.commissionRate ?? 10;

  const [snapshot, setSnapshot] = useState<SellerAnalyticsSnapshot>(EMPTY_SELLER_ANALYTICS);
  const [analyticsLoading, setAnalyticsLoading] = useState(isSupabaseConfigured());
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [isRemoteAnalytics, setIsRemoteAnalytics] = useState(false);

  const refreshAnalytics = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setSnapshot(EMPTY_SELLER_ANALYTICS);
      setAnalyticsLoading(false);
      setAnalyticsError(null);
      setIsRemoteAnalytics(false);
      return;
    }

    if (!session?.user) {
      setSnapshot(EMPTY_SELLER_ANALYTICS);
      setAnalyticsLoading(false);
      setAnalyticsError(null);
      setIsRemoteAnalytics(false);
      return;
    }

    if (profile?.role !== "Seller" && profile?.role !== "Admin") {
      setSnapshot(EMPTY_SELLER_ANALYTICS);
      setAnalyticsLoading(false);
      setAnalyticsError(null);
      return;
    }

    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const data = await sellerAnalyticsService.fetchSellerAnalytics(
        session.user.id,
        commissionRate
      );
      setSnapshot(data);
      setIsRemoteAnalytics(true);
    } catch (err) {
      setAnalyticsError(
        err instanceof Error ? err.message : "Could not load store analytics"
      );
      setSnapshot(EMPTY_SELLER_ANALYTICS);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [session?.user?.id, profile?.role, commissionRate]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      refreshAnalytics();
      return;
    }
    if (authConfigured && authLoading) return;
    refreshAnalytics();
  }, [refreshAnalytics, authConfigured, authLoading, session?.user?.id, profile?.role]);

  useEffect(() => {
    if (!isSupabaseConfigured() || ordersLoading) return;
    if (isRemoteOrders) {
      refreshAnalytics();
    }
  }, [ordersLoading, isRemoteOrders, refreshAnalytics]);

  const value = useMemo<SellerAnalyticsContextType>(
    () => ({
      ...snapshot,
      analyticsLoading,
      analyticsError,
      isRemoteAnalytics,
      refreshAnalytics,
    }),
    [snapshot, analyticsLoading, analyticsError, isRemoteAnalytics, refreshAnalytics]
  );

  return (
    <SellerAnalyticsContext.Provider value={value}>
      {children}
    </SellerAnalyticsContext.Provider>
  );
}

export function useSellerAnalytics() {
  const ctx = useContext(SellerAnalyticsContext);
  if (!ctx) {
    throw new Error("useSellerAnalytics must be used within SellerAnalyticsProvider");
  }
  return ctx;
}
