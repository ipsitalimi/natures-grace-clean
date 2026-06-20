import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import * as promptsService from "@/services/content/promptsService";
import * as gratitudeService from "@/services/wellness/gratitudeService";
import type { GratitudeEntry } from "@/data/gratitude";
import { useDataContext } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";

export type { GratitudeEntry } from "@/data/gratitude";

export interface DailyPrompt {
  id: string;
  text: string;
  date: string;
  dateISO: string;
  active: boolean;
}

interface GratitudeContextType {
  myGratitudes: GratitudeEntry[];
  communityGratitudes: GratitudeEntry[];
  dailyPrompts: DailyPrompt[];
  gratitudeLoading: boolean;
  gratitudeError: string | null;
  promptsLoading: boolean;
  refreshGratitude: () => Promise<void>;
  addGratitude: (text: string, isPublic: boolean) => Promise<boolean>;
  toggleVisibility: (id: string) => Promise<boolean>;
  addCommunityToMine: (entry: GratitudeEntry) => Promise<boolean>;
  addPrompt: (text: string) => void;
  removePrompt: (id: string) => void;
  togglePromptActive: (id: string) => void;
  getActivePrompts: () => DailyPrompt[];
}

const GratitudeContext = createContext<GratitudeContextType | null>(null);

export function GratitudeProvider({ children }: { children: React.ReactNode }) {
  const { dataLoading } = useDataContext();
  const { session, loading: authLoading, isConfigured: authConfigured, profile } =
    useAuth();
  const [myGratitudes, setMyGratitudes] = useState<GratitudeEntry[]>([]);
  const [communityGratitudes, setCommunityGratitudes] = useState<GratitudeEntry[]>([]);
  const [dailyPrompts, setDailyPrompts] = useState<DailyPrompt[]>([]);
  const [gratitudeLoading, setGratitudeLoading] = useState(isSupabaseConfigured());
  const [gratitudeError, setGratitudeError] = useState<string | null>(null);
  const [promptsLoading, setPromptsLoading] = useState(isSupabaseConfigured());

  const authorDisplayName =
    profile?.full_name?.trim() ||
    profile?.email?.split("@")[0] ||
    "Community member";

  const refreshGratitude = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setMyGratitudes([]);
      setCommunityGratitudes([]);
      setGratitudeLoading(false);
      setGratitudeError(null);
      return;
    }

    if (!session?.user) {
      setMyGratitudes([]);
      setCommunityGratitudes([]);
      setGratitudeLoading(false);
      setGratitudeError(null);
      return;
    }

    setGratitudeLoading(true);
    setGratitudeError(null);
    try {
      const [mine, community] = await Promise.all([
        gratitudeService.fetchMyGratitudes(),
        gratitudeService.fetchCommunityGratitudes(),
      ]);
      setMyGratitudes(mine);
      setCommunityGratitudes(community);
    } catch (err) {
      setGratitudeError(
        err instanceof Error ? err.message : "Could not load gratitude entries"
      );
      setMyGratitudes([]);
      setCommunityGratitudes([]);
    } finally {
      setGratitudeLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      refreshGratitude();
      return;
    }
    if (authConfigured && authLoading) return;
    refreshGratitude();
  }, [refreshGratitude, authConfigured, authLoading, session?.user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setPromptsLoading(false);
      return;
    }
    if (dataLoading) return;

    let cancelled = false;
    (async () => {
      try {
        const remote = await promptsService.fetchPrompts();
        if (!cancelled && remote.length > 0) setDailyPrompts(remote);
      } finally {
        if (!cancelled) setPromptsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dataLoading]);

  const addGratitude = useCallback(
    async (text: string, isPublic: boolean) => {
      if (!isSupabaseConfigured() || !session?.user) return false;

      const created = await gratitudeService.insertGratitude({
        text,
        isPublic,
        authorName: authorDisplayName,
      });
      if (!created) return false;

      setMyGratitudes((prev) => [created, ...prev]);
      if (isPublic) {
        setCommunityGratitudes((prev) => [created, ...prev]);
      }
      return true;
    },
    [session?.user, authorDisplayName]
  );

  const toggleVisibility = useCallback(
    async (id: string) => {
      if (!isSupabaseConfigured()) return false;

      const current = myGratitudes.find((g) => g.id === id);
      if (!current) return false;

      const nextPublic = !current.isPublic;
      const updated = await gratitudeService.setGratitudeVisibility(id, nextPublic);
      if (!updated) return false;

      setMyGratitudes((prev) =>
        prev.map((g) => (g.id === id ? updated : g))
      );

      if (nextPublic) {
        setCommunityGratitudes((prev) => {
          if (prev.some((c) => c.id === id)) {
            return prev.map((c) => (c.id === id ? updated : c));
          }
          return [updated, ...prev];
        });
      } else {
        setCommunityGratitudes((prev) => prev.filter((c) => c.id !== id));
      }
      return true;
    },
    [myGratitudes]
  );

  const addCommunityToMine = useCallback(
    async (entry: GratitudeEntry) => {
      if (!isSupabaseConfigured() || !session?.user) return false;

      const created = await gratitudeService.copyGratitudeToMine({
        text: entry.text,
        authorName: authorDisplayName,
      });
      if (!created) return false;

      setMyGratitudes((prev) => [created, ...prev]);
      return true;
    },
    [session?.user, authorDisplayName]
  );

  const addPrompt = useCallback(async (text: string) => {
    const now = new Date();
    const dateISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (isSupabaseConfigured()) {
      const created = await promptsService.insertPrompt(text, dateISO);
      if (created) {
        setDailyPrompts((prev) => [created, ...prev]);
        return;
      }
    }
    const newPrompt: DailyPrompt = {
      id: `p-${Date.now()}`,
      text,
      date: now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      dateISO,
      active: true,
    };
    setDailyPrompts((prev) => [newPrompt, ...prev]);
  }, []);

  const removePrompt = useCallback(async (id: string) => {
    if (isSupabaseConfigured()) await promptsService.deletePrompt(id);
    setDailyPrompts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const togglePromptActive = useCallback(
    async (id: string) => {
      const target = dailyPrompts.find((p) => p.id === id);
      const nextActive = target ? !target.active : true;
      if (isSupabaseConfigured()) await promptsService.setPromptActive(id, nextActive);
      setDailyPrompts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active: nextActive } : p))
      );
    },
    [dailyPrompts]
  );

  const getActivePrompts = useCallback(() => {
    return dailyPrompts.filter((p) => p.active);
  }, [dailyPrompts]);

  return (
    <GratitudeContext.Provider
      value={{
        myGratitudes,
        communityGratitudes,
        dailyPrompts,
        gratitudeLoading,
        gratitudeError,
        promptsLoading,
        refreshGratitude,
        addGratitude,
        toggleVisibility,
        addCommunityToMine,
        addPrompt,
        removePrompt,
        togglePromptActive,
        getActivePrompts,
      }}
    >
      {children}
    </GratitudeContext.Provider>
  );
}

export function useGratitude() {
  const context = useContext(GratitudeContext);
  if (!context) {
    throw new Error("useGratitude must be used within a GratitudeProvider");
  }
  return context;
}
