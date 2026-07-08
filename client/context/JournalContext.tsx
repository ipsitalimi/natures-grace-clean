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
import {
  formatMoodsForStorage,
  loadCustomMoods,
  MAX_CUSTOM_MOODS,
  MAX_SELECTED_MOODS,
  saveCustomMoods,
} from "@/lib/journalMoods";
import * as journalService from "@/services/wellness/journalService";

export type { JournalEntry } from "@/data/journal";

interface JournalContextType {
  entries: JournalEntry[];
  journalLoading: boolean;
  journalError: string | null;
  selectedMoods: string[];
  customMoods: string[];
  toggleSelectedMood: (mood: string) => void;
  setSelectedMoods: (moods: string[]) => void;
  clearSelectedMoods: () => void;
  addCustomMood: (name: string) => Promise<boolean>;
  removeCustomMood: (name: string) => Promise<void>;
  refreshJournal: () => Promise<void>;
  addEntry: (text: string, moods: string[], prompt?: string) => Promise<boolean>;
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
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [customMoods, setCustomMoods] = useState<string[]>([]);

  useEffect(() => {
    void loadCustomMoods().then(setCustomMoods);
  }, []);

  const toggleSelectedMood = useCallback((mood: string) => {
    const trimmed = mood.trim();
    if (!trimmed) return;
    setSelectedMoods((prev) => {
      if (prev.includes(trimmed)) {
        return prev.filter((m) => m !== trimmed);
      }
      if (prev.length >= MAX_SELECTED_MOODS) return prev;
      return [...prev, trimmed];
    });
  }, []);

  const clearSelectedMoods = useCallback(() => {
    setSelectedMoods([]);
  }, []);

  const setSelectedMoodsDirect = useCallback((moods: string[]) => {
    setSelectedMoods(moods.slice(0, MAX_SELECTED_MOODS));
  }, []);

  const addCustomMood = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 24) return false;
    const normalized = trimmed.replace(/\s+/g, " ");
    const exists = customMoods.some((m) => m.toLowerCase() === normalized.toLowerCase());
    if (exists) {
      toggleSelectedMood(normalized);
      return true;
    }
    if (customMoods.length >= MAX_CUSTOM_MOODS) return false;
    const next = [...customMoods, normalized];
    setCustomMoods(next);
    await saveCustomMoods(next);
    toggleSelectedMood(normalized);
    return true;
  }, [customMoods, toggleSelectedMood]);

  const removeCustomMood = useCallback(async (name: string) => {
    const next = customMoods.filter((m) => m !== name);
    setCustomMoods(next);
    setSelectedMoods((prev) => prev.filter((m) => m !== name));
    await saveCustomMoods(next);
  }, [customMoods]);

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
    async (text: string, moods: string[], prompt?: string) => {
      if (!isSupabaseConfigured() || !session?.user) return false;

      const created = await journalService.insertJournalEntry({
        body: text.trim(),
        mood: formatMoodsForStorage(moods),
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
        selectedMoods,
        customMoods,
        toggleSelectedMood,
        setSelectedMoods: setSelectedMoodsDirect,
        clearSelectedMoods,
        addCustomMood,
        removeCustomMood,
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
