/** Gratitude entry types (Supabase-backed). */

export interface GratitudeEntry {
  id: string;
  text: string;
  date: string;
  dateISO: string;
  isPublic: boolean;
  author: string;
  authorInitial: string;
  isOwn?: boolean;
  createdAt?: string;
}

export function relativeGratitudeDate(dateISO: string): string {
  const today = toISODateString(new Date());
  const yesterday = toISODateString(new Date(Date.now() - 86400000));
  if (dateISO === today) return "Today";
  if (dateISO === yesterday) return "Yesterday";
  const d = new Date(dateISO + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function toISODateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function authorInitialFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}
