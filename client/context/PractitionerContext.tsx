import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/context/AuthContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { emptyPractitionerWalletSnapshot } from "@/lib/emptySnapshots";
import type {
  OfferingAvailabilityInput,
  PractitionerDashboard,
  PractitionerSession,
  PractitionerStats,
  PractitionerWalletSnapshot,
  SessionOffering,
  UserSessionHistory,
} from "@/data/practitionerBookings";
import { clearPractitionerIdCache } from "@/services/content/practitionerId";
import * as bookingsService from "@/services/content/practitionerBookingsService";
import * as earningsService from "@/services/content/practitionerEarningsService";
import * as offeringsService from "@/services/content/practitionerOfferingsService";
import { buildDashboard } from "@/services/content/practitionerDashboardService";
import { fetchPractitionerProfile } from "@/services/content/practitionerId";
import {
  requestPractitionerPayout,
  syncPractitionerWallet,
} from "@/services/walletLedgerApi";

interface PractitionerContextType {
  loading: boolean;
  loadError: string | null;
  isRemote: boolean;
  sessions: PractitionerSession[];
  offerings: SessionOffering[];
  userSessions: UserSessionHistory[];
  snapshot: PractitionerWalletSnapshot;
  stats: PractitionerStats;
  dashboard: PractitionerDashboard;
  practiceName: string;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
  upsertOffering: (
    offering: SessionOffering,
    availability?: OfferingAvailabilityInput
  ) => Promise<SessionOffering | null>;
  deleteOffering: (id: string) => Promise<boolean>;
  completeSession: (bookingId: string, notes?: string) => Promise<PractitionerSession | null>;
  cancelSession: (bookingId: string, notes?: string) => Promise<PractitionerSession | null>;
  cancelUserSession: (bookingId: string) => Promise<UserSessionHistory | null>;
  requestPayout: (amount?: number) => Promise<{
    error?: string;
    status?: string;
    message?: string;
  }>;
}

function computeStats(
  sessions: PractitionerSession[],
  snapshot: PractitionerWalletSnapshot
): PractitionerStats {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const upcomingSessions = sessions.filter((s) => s.status === "Upcoming").length;
  const completedThisMonth = sessions.filter((s) => {
    if (s.status !== "Completed") return false;
    const d = new Date(s.date);
    return !Number.isNaN(d.getTime()) && d.getMonth() === month && d.getFullYear() === year;
  }).length;
  const sessionsThisWeek = sessions.filter((s) => {
    const d = new Date(s.date);
    return !Number.isNaN(d.getTime()) && d >= weekAgo;
  }).length;

  return {
    upcomingSessions,
    completedThisMonth,
    walletBalance: snapshot.availableBalance,
    pendingPayout: snapshot.pendingPayout,
    totalSessions: sessions.filter((s) => s.status === "Completed").length,
    sessionsThisWeek,
    earnedThisMonth: snapshot.totalEarned,
  };
}

const emptyDashboard = (): PractitionerDashboard => ({
  weeklySessions: [
    { day: "Mon", amount: 0 },
    { day: "Tue", amount: 0 },
    { day: "Wed", amount: 0 },
    { day: "Thu", amount: 0 },
    { day: "Fri", amount: 0 },
    { day: "Sat", amount: 0 },
    { day: "Sun", amount: 0 },
  ],
  monthlyEarnings: 0,
  monthlyGrowthPct: 0,
  avgRating: 0,
  reviewCount: 0,
  reviews: [],
  clientsBookedToday: 0,
});

const PractitionerContext = createContext<PractitionerContextType | null>(null);

export function PractitionerProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading, isConfigured: authConfigured, profile } =
    useAuth();
  const { settings } = usePlatformConfig();
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRemote, setIsRemote] = useState(false);
  const [sessions, setSessions] = useState<PractitionerSession[]>([]);
  const [offerings, setOfferings] = useState<SessionOffering[]>([]);
  const [userSessions, setUserSessions] = useState<UserSessionHistory[]>([]);
  const [snapshot, setSnapshot] = useState<PractitionerWalletSnapshot>(() =>
    emptyPractitionerWalletSnapshot()
  );
  const [dashboard, setDashboard] = useState<PractitionerDashboard>(emptyDashboard);
  const [practiceName, setPracticeName] = useState("My Practice");

  const commissionRate = settings.commissionRate ?? 10;
  const profileId = profile?.id ?? session?.user?.id;

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }
    setLoadError(null);
    try {
      clearPractitionerIdCache();

      const [remoteSessions, remoteOfferings, remoteWallet, remoteUser] =
        await Promise.all([
          bookingsService.fetchPractitionerBookings(profileId),
          offeringsService.fetchOfferings(profileId),
          earningsService.fetchWalletSnapshot(commissionRate, profileId),
          session?.user?.id
            ? bookingsService.fetchUserBookings(session.user.id)
            : Promise.resolve([]),
        ]);

      const rawRows = await bookingsService.fetchAllBookingRows(profileId);
      setSessions(remoteSessions);
      setOfferings(remoteOfferings);
      setUserSessions(remoteUser);
      if (session?.access_token) {
        await syncPractitionerWallet(session.access_token);
      }
      setIsRemote(true);

      const walletAfterSync = await earningsService.fetchWalletSnapshot(
        commissionRate,
        profileId
      );
      const walletFinal = walletAfterSync ?? remoteWallet;
      if (walletFinal) {
        setSnapshot(walletFinal);
        const dash = await buildDashboard(rawRows, walletFinal, profileId);
        setDashboard(dash);
      } else {
        setSnapshot(emptyPractitionerWalletSnapshot(commissionRate));
        setDashboard(emptyDashboard());
      }

      const profileSummary = await fetchPractitionerProfile(profileId);
      if (profileSummary?.name) {
        setPracticeName(`${profileSummary.name}'s Practice`);
      }
    } catch (err) {
      console.error("[PractitionerContext] refresh failed:", err);
      setLoadError(
        err instanceof Error ? err.message : "Could not load sessions. Try again."
      );
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [commissionRate, profileId, session?.user?.id, session?.access_token]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      refresh();
      return;
    }
    if (authConfigured && authLoading) return;
    refresh();
  }, [refresh, authConfigured, authLoading, session?.user?.id]);

  const upsertOffering = useCallback(
    async (offering: SessionOffering, availability?: OfferingAvailabilityInput) => {
      if (!isSupabaseConfigured()) return null;
      const saved = await offeringsService.upsertOffering(
        offering,
        profileId,
        availability
      );
      if (saved) {
        setOfferings((prev) => {
          const idx = prev.findIndex((o) => o.id === saved.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = saved;
            return next;
          }
          return [...prev, saved];
        });
      }
      return saved;
    },
    [profileId]
  );

  const deleteOffering = useCallback(async (id: string) => {
    if (!isSupabaseConfigured()) return false;
    const ok = await offeringsService.deleteOffering(id);
    if (ok) setOfferings((prev) => prev.filter((o) => o.id !== id));
    return ok;
  }, []);

  const completeSession = useCallback(
    async (bookingId: string, notes?: string) => {
      if (!isSupabaseConfigured()) return null;
      const updated = await bookingsService.completeBooking(
        bookingId,
        commissionRate,
        notes
      );
      if (updated) {
        setSessions((prev) => prev.map((s) => (s.id === bookingId ? updated : s)));
        if (session?.access_token) {
          await syncPractitionerWallet(session.access_token);
        }
        const remoteWallet = await earningsService.fetchWalletSnapshot(
          commissionRate,
          profileId
        );
        if (remoteWallet) setSnapshot(remoteWallet);
      }
      return updated;
    },
    [commissionRate, profileId, session?.access_token]
  );

  const cancelSession = useCallback(
    async (bookingId: string, notes?: string) => {
      if (!isSupabaseConfigured()) return null;
      const updated = await bookingsService.cancelBooking(
        bookingId,
        commissionRate,
        notes ? { notes } : undefined
      );
      if (updated) {
        setSessions((prev) => prev.map((s) => (s.id === bookingId ? updated : s)));
        if (session?.access_token) {
          await syncPractitionerWallet(session.access_token);
        }
        const remoteWallet = await earningsService.fetchWalletSnapshot(
          commissionRate,
          profileId
        );
        if (remoteWallet) setSnapshot(remoteWallet);
      }
      return updated;
    },
    [commissionRate, profileId, session?.access_token]
  );

  const cancelUserSession = useCallback(
    async (bookingId: string) => {
      if (!isSupabaseConfigured()) return null;
      const updated = await bookingsService.cancelBooking(bookingId, commissionRate, {
        requestRefund: true,
      });
      if (!updated) return null;
      let cancelledSession: UserSessionHistory | null = null;
      setUserSessions((prev) =>
        prev.map((s) => {
          if (s.id !== bookingId) return s;
          cancelledSession = { ...s, status: "Cancelled" };
          return cancelledSession;
        })
      );
      return cancelledSession;
    },
    [commissionRate]
  );

  const requestPayout = useCallback(
    async (amount?: number) => {
      const amt = amount ?? snapshot.availableBalance;
      if (!isSupabaseConfigured()) {
        return { error: "Connect Supabase to request payouts" };
      }
      if (!session?.access_token) {
        return { error: "Please sign in to request a payout" };
      }

      const result = await requestPractitionerPayout(amt, session.access_token);
      if (result.error) return { error: result.error };

      await refresh();
      return {
        status: "Pending",
        message:
          "Your withdrawal request was received. The Nature's Grace team processes requests manually within 3–7 business days.",
      };
    },
    [snapshot.availableBalance, commissionRate, profileId, refresh, session?.access_token]
  );

  const stats = useMemo(
    () => computeStats(sessions, snapshot),
    [sessions, snapshot]
  );

  const value = useMemo<PractitionerContextType>(
    () => ({
      loading,
      loadError,
      isRemote,
      sessions,
      offerings,
      userSessions,
      snapshot,
      stats,
      dashboard,
      practiceName,
      refresh,
      upsertOffering,
      deleteOffering,
      completeSession,
      cancelSession,
      cancelUserSession,
      requestPayout,
    }),
    [
      loading,
      loadError,
      isRemote,
      sessions,
      offerings,
      userSessions,
      snapshot,
      stats,
      dashboard,
      practiceName,
      refresh,
      upsertOffering,
      deleteOffering,
      completeSession,
      cancelSession,
      cancelUserSession,
      requestPayout,
    ]
  );

  return (
    <PractitionerContext.Provider value={value}>{children}</PractitionerContext.Provider>
  );
}

export function usePractitionerContext(): PractitionerContextType {
  const ctx = useContext(PractitionerContext);
  if (!ctx) {
    throw new Error("usePractitionerContext must be used inside PractitionerProvider");
  }
  return ctx;
}
