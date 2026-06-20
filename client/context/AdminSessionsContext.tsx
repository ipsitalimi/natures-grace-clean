import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { AdminUpcomingSession } from "@/data/adminSessions";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import * as bookingsService from "@/services/content/practitionerBookingsService";

interface AdminSessionsContextType {
  upcomingSessions: AdminUpcomingSession[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  refreshUpcomingSessions: () => Promise<void>;
}

const AdminSessionsContext = createContext<AdminSessionsContextType | null>(null);

export function AdminSessionsProvider({ children }: { children: React.ReactNode }) {
  const { session, profile, loading: authLoading, isConfigured: authConfigured } = useAuth();
  const [upcomingSessions, setUpcomingSessions] = useState<AdminUpcomingSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(isSupabaseConfigured());
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const refreshUpcomingSessions = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setUpcomingSessions([]);
      setSessionsLoading(false);
      setSessionsError(null);
      return;
    }

    if (!session?.user) {
      setUpcomingSessions([]);
      setSessionsLoading(false);
      setSessionsError(null);
      return;
    }

    if (profile?.role !== "Admin") {
      setUpcomingSessions([]);
      setSessionsLoading(false);
      setSessionsError(null);
      return;
    }

    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const rows = await bookingsService.fetchAdminUpcomingSessions(10);
      setUpcomingSessions(rows);
    } catch (err) {
      setSessionsError(
        err instanceof Error ? err.message : "Could not load upcoming sessions"
      );
      setUpcomingSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [session?.user?.id, profile?.role]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      refreshUpcomingSessions();
      return;
    }
    if (authConfigured && authLoading) return;
    refreshUpcomingSessions();
  }, [refreshUpcomingSessions, authConfigured, authLoading, session?.user?.id, profile?.role]);

  const value = useMemo<AdminSessionsContextType>(
    () => ({
      upcomingSessions,
      sessionsLoading,
      sessionsError,
      refreshUpcomingSessions,
    }),
    [upcomingSessions, sessionsLoading, sessionsError, refreshUpcomingSessions]
  );

  return (
    <AdminSessionsContext.Provider value={value}>{children}</AdminSessionsContext.Provider>
  );
}

export function useAdminSessions() {
  const ctx = useContext(AdminSessionsContext);
  if (!ctx) {
    throw new Error("useAdminSessions must be used within AdminSessionsProvider");
  }
  return ctx;
}
