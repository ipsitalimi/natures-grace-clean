/** Journal entry types (Supabase-backed). */

export type JournalMood = "Peaceful" | "Grateful" | "Anxious" | "Hopeful";

export interface JournalEntry {
  id: string;
  date: string;
  dateISO: string;
  preview: string;
  fullText: string;
  mood: string | null;
  prompt?: string | null;
  createdAt?: string;
}

export function buildPreview(text: string, maxLen = 100): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.substring(0, maxLen) + "...";
}

export function formatJournalDate(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function toISODateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
