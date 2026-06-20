import type { JournalEntry } from "@/data/journal";
import { buildPreview, formatJournalDate, toISODateString } from "@/data/journal";
import { getSupabase } from "@/lib/supabase";

export type DbJournalRow = {
  id: string;
  user_id: string;
  body: string;
  mood: string | null;
  prompt: string | null;
  entry_date: string;
  created_at: string;
  updated_at: string;
};

function mapJournalRow(row: DbJournalRow): JournalEntry {
  const dateISO =
    typeof row.entry_date === "string"
      ? row.entry_date.slice(0, 10)
      : toISODateString(new Date(row.entry_date));
  const body = row.body ?? "";
  let previewSource = body;
  if (row.prompt && body.startsWith(row.prompt)) {
    previewSource = body.slice(row.prompt.length).replace(/^\s+/, "");
  }
  return {
    id: row.id,
    date: formatJournalDate(dateISO),
    dateISO,
    preview: buildPreview(previewSource),
    fullText: body,
    mood: row.mood,
    prompt: row.prompt,
    createdAt: row.created_at,
  };
}

export async function fetchJournalEntries(): Promise<JournalEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[journalService] fetch:", error.message);
    throw new Error(error.message);
  }

  return ((data ?? []) as DbJournalRow[]).map(mapJournalRow);
}

export async function insertJournalEntry(input: {
  body: string;
  mood: string | null;
  prompt?: string;
  entryDate?: string;
}): Promise<JournalEntry | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const entryDate = input.entryDate ?? toISODateString(new Date());
  const fullText = input.prompt ? `${input.prompt}\n\n${input.body}` : input.body;

  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: user.id,
      body: fullText.trim(),
      mood: input.mood,
      prompt: input.prompt ?? null,
      entry_date: entryDate,
    })
    .select()
    .single();

  if (error) {
    console.error("[journalService] insert:", error.message);
    return null;
  }

  return mapJournalRow(data as DbJournalRow);
}

export async function updateJournalEntry(
  id: string,
  patch: { body?: string; mood?: string | null }
): Promise<JournalEntry | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const row: Partial<DbJournalRow> = {};
  if (patch.body !== undefined) row.body = patch.body;
  if (patch.mood !== undefined) row.mood = patch.mood;

  const { data, error } = await supabase
    .from("journal_entries")
    .update(row)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[journalService] update:", error.message);
    return null;
  }

  return mapJournalRow(data as DbJournalRow);
}

export async function deleteJournalEntry(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase.from("journal_entries").delete().eq("id", id);
  if (error) {
    console.error("[journalService] delete:", error.message);
    return false;
  }
  return true;
}
