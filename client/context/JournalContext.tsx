import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

export interface JournalEntry {
  id: string;
  date: string;
  dateISO: string;
  preview: string;
  fullText: string;
  mood: string | null;
}

interface JournalContextType {
  entries: JournalEntry[];
  selectedMood: string | null;
  setSelectedMood: (mood: string | null) => void;
  addEntry: (text: string, mood: string | null, prompt?: string) => void;
  getStreak: () => number;
}

const JournalContext = createContext<JournalContextType | null>(null);

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function toISODateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: string, b: string): boolean {
  return a === b;
}

const seedEntries: JournalEntry[] = [
  {
    id: "seed-1",
    date: "February 18, 2026",
    dateISO: "2026-02-18",
    preview: "Today was a peaceful day. I spent time in the garden and felt truly connected to nature...",
    fullText: "Today was a peaceful day. I spent time in the garden and felt truly connected to nature. The winter sun was gentle, and I could hear birds singing in the distance.\n\nI realized that these simple moments are what life is really about. Not the busy schedules or the endless to-do lists, but the quiet appreciation of what's right in front of us.",
    mood: "Peaceful",
  },
  {
    id: "seed-2",
    date: "February 17, 2026",
    dateISO: "2026-02-17",
    preview: "Reflecting on the week, I'm grateful for the small moments of joy that brightened each day...",
    fullText: "Reflecting on the week, I'm grateful for the small moments of joy that brightened each day. A warm cup of tea in the morning. A kind word from a colleague. The way the light fell through my window at sunset.\n\nIt's easy to overlook these things when we're rushing through life. But today I choose to pause and acknowledge them.",
    mood: "Grateful",
  },
  {
    id: "seed-3",
    date: "February 16, 2026",
    dateISO: "2026-02-16",
    preview: "Started my morning meditation practice again. It's amazing how 10 minutes can shift my entire perspective...",
    fullText: "Started my morning meditation practice again. It's amazing how 10 minutes can shift my entire perspective for the day.\n\nI've been resisting this for weeks, telling myself I don't have time. But the truth is, I don't have time NOT to do it.",
    mood: "Hopeful",
  },
  {
    id: "seed-4",
    date: "February 14, 2026",
    dateISO: "2026-02-14",
    preview: "Had a wonderful conversation with an old friend. Sometimes reconnecting with people reminds us of who we are...",
    fullText: "Had a wonderful conversation with an old friend. Sometimes reconnecting with people reminds us of who we are \u2013 or who we were, and how far we've come.\n\nWe talked about our dreams from years ago, some achieved, some transformed, some gently released.",
    mood: "Grateful",
  },
  {
    id: "seed-5",
    date: "February 12, 2026",
    dateISO: "2026-02-12",
    preview: "The rain today felt cleansing. I sat by the window and let my thoughts flow freely without judgment...",
    fullText: "The rain today felt cleansing. I sat by the window and let my thoughts flow freely without judgment.\n\nThere's something about watching rain that invites reflection. Each drop seems to carry away a little of the mental clutter we accumulate.",
    mood: "Peaceful",
  },
];

export function JournalProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<JournalEntry[]>(seedEntries);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const addEntry = useCallback((text: string, mood: string | null, prompt?: string) => {
    const now = new Date();
    const fullText = prompt ? `${prompt}\n\n${text}` : text;
    const preview = text.length > 100 ? text.substring(0, 100) + "..." : text;
    const newEntry: JournalEntry = {
      id: `entry-${Date.now()}`,
      date: formatDate(now),
      dateISO: toISODateString(now),
      preview,
      fullText,
      mood,
    };
    setEntries((prev) => [newEntry, ...prev]);
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
    let checkDate = new Date(entryDates[0]);

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
    <JournalContext.Provider value={{ entries, selectedMood, setSelectedMood, addEntry, getStreak }}>
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
