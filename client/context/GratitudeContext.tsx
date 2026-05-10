import React, { createContext, useContext, useState, useCallback } from "react";

export interface GratitudeEntry {
  id: string;
  text: string;
  date: string;
  dateISO: string;
  isPublic: boolean;
  author: string;
  authorInitial: string;
}

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
  addGratitude: (text: string, isPublic: boolean) => void;
  toggleVisibility: (id: string) => void;
  addCommunityToMine: (entry: GratitudeEntry) => void;
  addPrompt: (text: string) => void;
  removePrompt: (id: string) => void;
  togglePromptActive: (id: string) => void;
  getActivePrompts: () => DailyPrompt[];
}

const GratitudeContext = createContext<GratitudeContextType | null>(null);

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function toISODateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function relativeDate(dateISO: string): string {
  const today = toISODateString(new Date());
  const yesterday = toISODateString(new Date(Date.now() - 86400000));
  if (dateISO === today) return "Today";
  if (dateISO === yesterday) return "Yesterday";
  const d = new Date(dateISO + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const seedMyGratitudes: GratitudeEntry[] = [
  { id: "g1", text: "The warm sunshine on my morning walk", date: "Today", dateISO: toISODateString(new Date()), isPublic: true, author: "You", authorInitial: "Y" },
  { id: "g2", text: "A good conversation with a friend", date: "Yesterday", dateISO: toISODateString(new Date(Date.now() - 86400000)), isPublic: false, author: "You", authorInitial: "Y" },
  { id: "g3", text: "Finding peace in a quiet moment", date: "Feb 17", dateISO: "2026-02-17", isPublic: true, author: "You", authorInitial: "Y" },
  { id: "g4", text: "A delicious home-cooked meal", date: "Feb 15", dateISO: "2026-02-15", isPublic: false, author: "You", authorInitial: "Y" },
  { id: "g5", text: "The sound of rain on the window", date: "Feb 13", dateISO: "2026-02-13", isPublic: true, author: "You", authorInitial: "Y" },
];

const seedCommunityGratitudes: GratitudeEntry[] = [
  { id: "cg1", text: "My morning cup of tea and the stillness before the day begins", date: "Today", dateISO: toISODateString(new Date()), isPublic: true, author: "Sarah M.", authorInitial: "S" },
  { id: "cg2", text: "A stranger held the door for me and smiled", date: "Today", dateISO: toISODateString(new Date()), isPublic: true, author: "James K.", authorInitial: "J" },
  { id: "cg3", text: "Watching my garden bloom after weeks of care", date: "Yesterday", dateISO: toISODateString(new Date(Date.now() - 86400000)), isPublic: true, author: "Priya L.", authorInitial: "P" },
  { id: "cg4", text: "My child's laughter echoing through the house", date: "Yesterday", dateISO: toISODateString(new Date(Date.now() - 86400000)), isPublic: true, author: "Maya R.", authorInitial: "M" },
  { id: "cg5", text: "The first warm breeze of the season", date: "Feb 17", dateISO: "2026-02-17", isPublic: true, author: "Alex T.", authorInitial: "A" },
  { id: "cg6", text: "Being able to take a deep breath and feel okay", date: "Feb 16", dateISO: "2026-02-16", isPublic: true, author: "Dana W.", authorInitial: "D" },
];

const seedPrompts: DailyPrompt[] = [
  { id: "p1", text: "What moment today made you pause and feel something?", date: "Feb 19, 2026", dateISO: "2026-02-19", active: true },
  { id: "p2", text: "If your body could speak right now, what would it say?", date: "Feb 19, 2026", dateISO: "2026-02-19", active: true },
  { id: "p3", text: "What's one thing you'd like to gently release today?", date: "Feb 19, 2026", dateISO: "2026-02-19", active: true },
  { id: "p4", text: "What brought you a small sense of comfort today?", date: "Feb 18, 2026", dateISO: "2026-02-18", active: true },
  { id: "p5", text: "Is there something you've been avoiding thinking about?", date: "Feb 18, 2026", dateISO: "2026-02-18", active: true },
  { id: "p6", text: "What would you tell your younger self right now?", date: "Feb 18, 2026", dateISO: "2026-02-18", active: true },
  { id: "p7", text: "What are you carrying that isn't yours to hold?", date: "Feb 17, 2026", dateISO: "2026-02-17", active: false },
  { id: "p8", text: "When did you last feel truly at ease?", date: "Feb 17, 2026", dateISO: "2026-02-17", active: true },
  { id: "p9", text: "What does your heart need most in this moment?", date: "Feb 17, 2026", dateISO: "2026-02-17", active: true },
];

export function GratitudeProvider({ children }: { children: React.ReactNode }) {
  const [myGratitudes, setMyGratitudes] = useState<GratitudeEntry[]>(seedMyGratitudes);
  const [communityGratitudes, setCommunityGratitudes] = useState<GratitudeEntry[]>(seedCommunityGratitudes);
  const [dailyPrompts, setDailyPrompts] = useState<DailyPrompt[]>(seedPrompts);

  const addGratitude = useCallback((text: string, isPublic: boolean) => {
    const now = new Date();
    const newEntry: GratitudeEntry = {
      id: `g-${Date.now()}`,
      text,
      date: relativeDate(toISODateString(now)),
      dateISO: toISODateString(now),
      isPublic,
      author: "You",
      authorInitial: "Y",
    };
    setMyGratitudes((prev) => [newEntry, ...prev]);
    if (isPublic) {
      setCommunityGratitudes((prev) => [newEntry, ...prev]);
    }
  }, []);

  const toggleVisibility = useCallback((id: string) => {
    setMyGratitudes((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const updated = { ...g, isPublic: !g.isPublic };
          if (updated.isPublic) {
            setCommunityGratitudes((cp) => [updated, ...cp]);
          } else {
            setCommunityGratitudes((cp) => cp.filter((c) => c.id !== id));
          }
          return updated;
        }
        return g;
      })
    );
  }, []);

  const addCommunityToMine = useCallback((entry: GratitudeEntry) => {
    const now = new Date();
    const newEntry: GratitudeEntry = {
      id: `g-${Date.now()}`,
      text: entry.text,
      date: relativeDate(toISODateString(now)),
      dateISO: toISODateString(now),
      isPublic: false,
      author: "You",
      authorInitial: "Y",
    };
    setMyGratitudes((prev) => [newEntry, ...prev]);
  }, []);

  const addPrompt = useCallback((text: string) => {
    const now = new Date();
    const newPrompt: DailyPrompt = {
      id: `p-${Date.now()}`,
      text,
      date: formatDate(now),
      dateISO: toISODateString(now),
      active: true,
    };
    setDailyPrompts((prev) => [newPrompt, ...prev]);
  }, []);

  const removePrompt = useCallback((id: string) => {
    setDailyPrompts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const togglePromptActive = useCallback((id: string) => {
    setDailyPrompts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
  }, []);

  const getActivePrompts = useCallback(() => {
    return dailyPrompts.filter((p) => p.active);
  }, [dailyPrompts]);

  return (
    <GratitudeContext.Provider
      value={{
        myGratitudes,
        communityGratitudes,
        dailyPrompts,
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
