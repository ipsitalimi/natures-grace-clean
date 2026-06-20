import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type { JournalEntry } from "@/data/journal";
import { toISODateString } from "@/data/journal";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import * as journalService from "@/services/wellness/journalService";

export type { JournalEntry } from "@/data/journal";

interface JournalContextType {
  entries: JournalEntry[];
  journalLoading: boolean;
  journalError: string | null;
  selectedMood: string | null;
  setSelectedMood: (mood: string | null) => void;
  refreshJournal: () => Promise<void>;
  addEntry: (text: string, mood: string | null, prompt?: string) => Promise<boolean>;
  updateEntry: (
    id: string,
    patch: { body?: string; mood?: string | null }
  ) => Promise<boolean>;
  deleteEntry: (id: string) => Promise<boolean>;
  getStreak: () => number;
}

const JournalContext = createContext<JournalContextType | null>(null);

function isSameDay(a: string, b: string): boolean {
  return a === b;
}

export function JournalProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading, isConfigured: authConfigured } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [journalLoading, setJournalLoading] = useState(isSupabaseConfigured());
  const [journalError, setJournalError] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const refreshJournal = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setEntries([]);
      setJournalLoading(false);
      setJournalError(null);
      return;
    }

    if (!session?.user) {
      setEntries([]);
      setJournalLoading(false);
      setJournalError(null);
      return;
    }

    setJournalLoading(true);
    setJournalError(null);
    try {
      const remote = await journalService.fetchJournalEntries();
      setEntries(remote);
    } catch (err) {
      setJournalError(
        err instanceof Error ? err.message : "Could not load journal entries"
      );
      setEntries([]);
    } finally {
      setJournalLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      refreshJournal();
      return;
    }
    if (authConfigured && authLoading) return;
    refreshJournal();
  }, [refreshJournal, authConfigured, authLoading, session?.user?.id]);

  const addEntry = useCallback(
    async (text: string, mood: string | null, prompt?: string) => {
      if (!isSupabaseConfigured() || !session?.user) return false;

      const created = await journalService.insertJournalEntry({
        body: text.trim(),
        mood,
        prompt,
      });
      if (!created) return false;

      setEntries((prev) => [created, ...prev]);
      return true;
    },
    [session?.user]
  );

  const updateEntry = useCallback(
    async (id: string, patch: { body?: string; mood?: string | null }) => {
      if (!isSupabaseConfigured() || !session?.user) return false;
      const updated = await journalService.updateJournalEntry(id, patch);
      if (!updated) return false;
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
      return true;
    },
    [session?.user]
  );

  const deleteEntry = useCallback(async (id: string) => {
    if (!isSupabaseConfigured()) return false;
    const ok = await journalService.deleteJournalEntry(id);
    if (!ok) return false;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    return true;
  }, []);

  const getStreak = useCallback(() => {
    if (entries.length === 0) return 0;

    const entryDates = [...new Set(entries.map((e) => e.dateISO))].sort().reverse();
    const today = toISODateString(new Date());
    const yesterday = toISODateString(new Date(Date.now() - 86400000));

    if (!isSameDay(entryDates[0], today) && !isSameDay(entryDates[0], yesterday)) {
      return 0;
    }

    let streak = 1;
    let checkDate = new Date(entryDates[0] + "T12:00:00");

    for (let i = 1; i < entryDates.length; i++) {
      const prevDay = new Date(checkDate);
      prevDay.setDate(prevDay.getDate() - 1);
      const prevDayISO = toISODateString(prevDay);

      if (isSameDay(entryDates[i], prevDayISO)) {
        streak++;
        checkDate = prevDay;
      } else {
        break;
      }
    }

    return streak;
  }, [entries]);

  return (
    <JournalContext.Provider
      value={{
        entries,
        journalLoading,
        journalError,
        selectedMood,
        setSelectedMood,
        refreshJournal,
        addEntry,
        updateEntry,
        deleteEntry,
        getStreak,
      }}
    >
      {children}
    </JournalContext.Provider>
  );
}

export function useJournal() {
  const context = useContext(JournalContext);
  if (!context) {
    throw new Error("useJournal must be used within a JournalProvider");
  }
  return context;
}
