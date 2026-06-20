import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  AddPaymentMethodInput,
  PaymentMethod,
  PaymentMethodCardView,
} from "@/data/paymentMethods";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import * as paymentMethodsService from "@/services/payments/paymentMethodsService";

interface PaymentMethodsContextType {
  methods: PaymentMethod[];
  cardViews: PaymentMethodCardView[];
  methodsLoading: boolean;
  methodsError: string | null;
  refreshPaymentMethods: () => Promise<void>;
  addPaymentMethod: (input: AddPaymentMethodInput) => Promise<PaymentMethod | null>;
  removePaymentMethod: (methodId: string) => Promise<boolean>;
  setDefaultPaymentMethod: (methodId: string) => Promise<boolean>;
  defaultMethod: PaymentMethod | undefined;
}

const PaymentMethodsContext = createContext<PaymentMethodsContextType | null>(null);

export function PaymentMethodsProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading, isConfigured: authConfigured } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(isSupabaseConfigured());
  const [methodsError, setMethodsError] = useState<string | null>(null);

  const refreshPaymentMethods = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setMethods([]);
      setMethodsLoading(false);
      setMethodsError(null);
      return;
    }

    if (!session?.user) {
      setMethods([]);
      setMethodsLoading(false);
      setMethodsError(null);
      return;
    }

    setMethodsLoading(true);
    setMethodsError(null);
    try {
      const rows = await paymentMethodsService.fetchMyPaymentMethods();
      setMethods(rows);
    } catch (err) {
      setMethodsError(
        err instanceof Error ? err.message : "Could not load payment methods"
      );
      setMethods([]);
    } finally {
      setMethodsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      refreshPaymentMethods();
      return;
    }
    if (authConfigured && authLoading) return;
    refreshPaymentMethods();
  }, [refreshPaymentMethods, authConfigured, authLoading, session?.user?.id]);

  const cardViews = useMemo(
    () => methods.map(paymentMethodsService.paymentMethodToCardView),
    [methods]
  );

  const defaultMethod = useMemo(
    () => methods.find((m) => m.isDefault),
    [methods]
  );

  const addPaymentMethod = useCallback(
    async (input: AddPaymentMethodInput) => {
      if (!isSupabaseConfigured() || !session?.user) return null;
      const created = await paymentMethodsService.addPaymentMethod(input);
      if (created) {
        await refreshPaymentMethods();
      }
      return created;
    },
    [session?.user, refreshPaymentMethods]
  );

  const removePaymentMethod = useCallback(
    async (methodId: string) => {
      if (!isSupabaseConfigured()) return false;
      const ok = await paymentMethodsService.removePaymentMethod(methodId);
      if (ok) {
        setMethods((prev) => prev.filter((m) => m.id !== methodId));
        await refreshPaymentMethods();
      }
      return ok;
    },
    [refreshPaymentMethods]
  );

  const setDefaultPaymentMethod = useCallback(
    async (methodId: string) => {
      if (!isSupabaseConfigured()) return false;
      const ok = await paymentMethodsService.setDefaultPaymentMethod(methodId);
      if (ok) {
        setMethods((prev) =>
          prev.map((m) => ({ ...m, isDefault: m.id === methodId }))
        );
      }
      return ok;
    },
    []
  );

  return (
    <PaymentMethodsContext.Provider
      value={{
        methods,
        cardViews,
        methodsLoading,
        methodsError,
        refreshPaymentMethods,
        addPaymentMethod,
        removePaymentMethod,
        setDefaultPaymentMethod,
        defaultMethod,
      }}
    >
      {children}
    </PaymentMethodsContext.Provider>
  );
}

export function usePaymentMethods() {
  const ctx = useContext(PaymentMethodsContext);
  if (!ctx) {
    throw new Error("usePaymentMethods must be used within PaymentMethodsProvider");
  }
  return ctx;
}
