import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { FlaggedItem, SubmitContentReportInput } from "@/data/contentReports";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import * as contentReportsService from "@/services/content/contentReportsService";

interface ModerationContextType {
  flaggedItems: FlaggedItem[];
  openFlaggedCount: number;
  moderationLoading: boolean;
  moderationError: string | null;
  refreshModerationQueue: () => Promise<void>;
  dismissReport: (reportId: string) => Promise<boolean>;
  removeReportedContent: (reportId: string) => Promise<boolean>;
  banFromReport: (reportId: string) => Promise<boolean>;
  submitReport: (input: SubmitContentReportInput) => Promise<FlaggedItem | null>;
  flagReviewForQueue: (reviewId: string, preview: string) => Promise<boolean>;
}

const ModerationContext = createContext<ModerationContextType | null>(null);

export function ModerationProvider({ children }: { children: React.ReactNode }) {
  const { session, profile, loading: authLoading, isConfigured: authConfigured } = useAuth();
  const [flaggedItems, setFlaggedItems] = useState<FlaggedItem[]>([]);
  const [moderationLoading, setModerationLoading] = useState(isSupabaseConfigured());
  const [moderationError, setModerationError] = useState<string | null>(null);

  const refreshModerationQueue = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setFlaggedItems([]);
      setModerationLoading(false);
      setModerationError(null);
      return;
    }

    if (!session?.user) {
      setFlaggedItems([]);
      setModerationLoading(false);
      setModerationError(null);
      return;
    }

    const isAdmin = profile?.role === "Admin";
    if (!isAdmin) {
      setFlaggedItems([]);
      setModerationLoading(false);
      setModerationError(null);
      return;
    }

    setModerationLoading(true);
    setModerationError(null);
    try {
      const rows = await contentReportsService.fetchModerationQueue();
      setFlaggedItems(rows);
    } catch (err) {
      setModerationError(
        err instanceof Error ? err.message : "Could not load moderation queue"
      );
      setFlaggedItems([]);
    } finally {
      setModerationLoading(false);
    }
  }, [session?.user?.id, profile?.role]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      refreshModerationQueue();
      return;
    }
    if (authConfigured && authLoading) return;
    refreshModerationQueue();
  }, [refreshModerationQueue, authConfigured, authLoading, session?.user?.id, profile?.role]);

  const runAction = useCallback(
    async (reportId: string, action: "dismiss" | "remove_content" | "ban_reporter") => {
      if (!isSupabaseConfigured()) return false;
      const ok = await contentReportsService.applyModerationAction(
        reportId,
        action,
        session?.user?.id
      );
      if (ok) {
        await refreshModerationQueue();
      }
      return ok;
    },
    [session?.user?.id, refreshModerationQueue]
  );

  const dismissReport = useCallback(
    (reportId: string) => runAction(reportId, "dismiss"),
    [runAction]
  );

  const removeReportedContent = useCallback(
    (reportId: string) => runAction(reportId, "remove_content"),
    [runAction]
  );

  const banFromReport = useCallback(
    (reportId: string) => runAction(reportId, "ban_reporter"),
    [runAction]
  );

  const submitReport = useCallback(
    async (input: SubmitContentReportInput) => {
      if (!isSupabaseConfigured() || !session?.user) return null;
      const created = await contentReportsService.submitContentReport(input, {
        id: session.user.id,
        name: profile?.full_name ?? undefined,
      });
      if (created && profile?.role === "Admin") {
        await refreshModerationQueue();
      }
      return created;
    },
    [session?.user, profile?.full_name, profile?.role, refreshModerationQueue]
  );

  const flagReviewForQueue = useCallback(
    async (reviewId: string, preview: string) => {
      if (!isSupabaseConfigured()) return false;
      const created = await contentReportsService.createReportForReview(
        reviewId,
        preview,
        profile?.full_name ?? "Admin"
      );
      if (created) {
        await refreshModerationQueue();
        return true;
      }
      return false;
    },
    [profile?.full_name, refreshModerationQueue]
  );

  const openFlaggedCount = useMemo(
    () => flaggedItems.filter((f) => !f.resolved).length,
    [flaggedItems]
  );

  const value = useMemo<ModerationContextType>(
    () => ({
      flaggedItems,
      openFlaggedCount,
      moderationLoading,
      moderationError,
      refreshModerationQueue,
      dismissReport,
      removeReportedContent,
      banFromReport,
      submitReport,
      flagReviewForQueue,
    }),
    [
      flaggedItems,
      openFlaggedCount,
      moderationLoading,
      moderationError,
      refreshModerationQueue,
      dismissReport,
      removeReportedContent,
      banFromReport,
      submitReport,
      flagReviewForQueue,
    ]
  );

  return (
    <ModerationContext.Provider value={value}>{children}</ModerationContext.Provider>
  );
}

export function useModeration() {
  const ctx = useContext(ModerationContext);
  if (!ctx) {
    throw new Error("useModeration must be used within ModerationProvider");
  }
  return ctx;
}
