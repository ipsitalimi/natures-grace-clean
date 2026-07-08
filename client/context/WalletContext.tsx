import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { SellerOrder } from "@/data/orders";
import type { SellerWalletSnapshot } from "@/data/wallet";
import { useAuth } from "@/context/AuthContext";
import { useOrdersContext } from "@/context/OrdersContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { emptySellerWalletSnapshot } from "@/lib/emptySnapshots";
import * as walletService from "@/services/content/walletService";
import { requestSellerPayout, syncSellerWallet } from "@/services/walletLedgerApi";

interface WalletContextType {
  walletLoading: boolean;
  walletLoadError: string | null;
  isRemoteWallet: boolean;
  snapshot: SellerWalletSnapshot;
  refreshWallet: () => Promise<void>;
  syncWalletForOrders: (orders: SellerOrder[]) => Promise<void>;
  requestPayout: (amount?: number) => Promise<{
    error?: string;
    status?: string;
    message?: string;
  }>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading, isConfigured: authConfigured } = useAuth();
  const { orders, ordersLoading } = useOrdersContext();
  const { settings } = usePlatformConfig();
  const [walletLoading, setWalletLoading] = useState(isSupabaseConfigured());
  const [walletLoadError, setWalletLoadError] = useState<string | null>(null);
  const [isRemoteWallet, setIsRemoteWallet] = useState(false);
  const [snapshot, setSnapshot] = useState<SellerWalletSnapshot>(() => emptySellerWalletSnapshot());

  const commissionRate = settings.commissionRate ?? 10;

  const refreshWallet = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setWalletLoading(false);
      return;
    }

    setWalletLoading(true);
    setWalletLoadError(null);
    try {
      if (session?.access_token) {
        await syncSellerWallet(session.access_token);
      }
      const remote = await walletService.fetchWalletSnapshot(commissionRate);
      if (remote) {
        setSnapshot(remote);
        setIsRemoteWallet(true);
      }
    } catch (err) {
      console.error("[WalletContext] refresh failed:", err);
      setWalletLoadError(
        err instanceof Error ? err.message : "Could not load wallet. Pull to refresh or try again."
      );
    } finally {
      setWalletLoading(false);
    }
  }, [commissionRate, session?.access_token]);

  const syncWalletForOrders = useCallback(
    async (_orderList: SellerOrder[]) => {
      if (!isSupabaseConfigured() || !session?.access_token) return;
      await syncSellerWallet(session.access_token);
      const remote = await walletService.fetchWalletSnapshot(commissionRate);
      if (remote) {
        setSnapshot(remote);
        setIsRemoteWallet(true);
      }
    },
    [commissionRate, session?.access_token]
  );

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      refreshWallet();
      return;
    }
    if (authConfigured && authLoading) return;
    refreshWallet();
  }, [refreshWallet, authConfigured, authLoading, session?.user?.id]);

  useEffect(() => {
    if (ordersLoading || orders.length === 0) return;
    syncWalletForOrders(orders);
  }, [orders, ordersLoading, syncWalletForOrders]);

  const requestPayout = useCallback(
    async (amount?: number) => {
      const amt = amount ?? snapshot.availableBalance;
      if (!isSupabaseConfigured()) {
        return { error: "Connect Supabase to request payouts" };
      }
      if (!session?.access_token) {
        return { error: "Please sign in to request a payout" };
      }

      const result = await requestSellerPayout(amt, session.access_token);
      if (result.error) return { error: result.error };

      await refreshWallet();
      return {
        status: "Pending",
        message:
          "Your withdrawal request was received. The Nature's Grace team processes requests manually within 3–7 business days.",
      };
    },
    [
      snapshot.availableBalance,
      refreshWallet,
      session?.access_token,
    ]
  );

  const value = useMemo<WalletContextType>(
    () => ({
      walletLoading,
      walletLoadError,
      isRemoteWallet,
      snapshot,
      refreshWallet,
      syncWalletForOrders,
      requestPayout,
    }),
    [walletLoading, walletLoadError, isRemoteWallet, snapshot, refreshWallet, syncWalletForOrders, requestPayout]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWalletContext(): WalletContextType {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWalletContext must be used inside WalletProvider");
  return ctx;
}
