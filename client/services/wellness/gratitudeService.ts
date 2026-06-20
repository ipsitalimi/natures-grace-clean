import type { GratitudeEntry } from "@/data/gratitude";
import {
  authorInitialFromName,
  relativeGratitudeDate,
  toISODateString,
} from "@/data/gratitude";
import { getSupabase } from "@/lib/supabase";

export type DbGratitudeRow = {
  id: string;
  user_id: string;
  body: string;
  is_public: boolean;
  author_name: string;
  entry_date: string;
  created_at: string;
  updated_at: string;
};

function mapGratitudeRow(row: DbGratitudeRow, currentUserId?: string): GratitudeEntry {
  const dateISO =
    typeof row.entry_date === "string"
      ? row.entry_date.slice(0, 10)
      : toISODateString(new Date(row.entry_date));
  const isOwn = currentUserId ? row.user_id === currentUserId : false;
  const author = isOwn ? "You" : row.author_name;
  return {
    id: row.id,
    text: row.body,
    date: relativeGratitudeDate(dateISO),
    dateISO,
    isPublic: row.is_public,
    author,
    authorInitial: isOwn ? "Y" : authorInitialFromName(row.author_name),
    isOwn,
    createdAt: row.created_at,
  };
}

export async function fetchMyGratitudes(): Promise<GratitudeEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("gratitude_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[gratitudeService] fetch mine:", error.message);
    throw new Error(error.message);
  }

  return ((data ?? []) as DbGratitudeRow[]).map((r) => mapGratitudeRow(r, user.id));
}

export async function fetchCommunityGratitudes(): Promise<GratitudeEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("gratitude_entries")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[gratitudeService] fetch community:", error.message);
    throw new Error(error.message);
  }

  return ((data ?? []) as DbGratitudeRow[]).map((r) =>
    mapGratitudeRow(r, user?.id)
  );
}

export async function insertGratitude(input: {
  text: string;
  isPublic: boolean;
  authorName: string;
}): Promise<GratitudeEntry | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const entryDate = toISODateString(new Date());

  const { data, error } = await supabase
    .from("gratitude_entries")
    .insert({
      user_id: user.id,
      body: input.text.trim(),
      is_public: input.isPublic,
      author_name: input.authorName,
      entry_date: entryDate,
    })
    .select()
    .single();

  if (error) {
    console.error("[gratitudeService] insert:", error.message);
    return null;
  }

  return mapGratitudeRow(data as DbGratitudeRow, user.id);
}

export async function setGratitudeVisibility(
  id: string,
  isPublic: boolean
): Promise<GratitudeEntry | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("gratitude_entries")
    .update({ is_public: isPublic })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[gratitudeService] visibility:", error.message);
    return null;
  }

  return mapGratitudeRow(data as DbGratitudeRow, user.id);
}

export async function copyGratitudeToMine(input: {
  text: string;
  authorName: string;
}): Promise<GratitudeEntry | null> {
  return insertGratitude({
    text: input.text,
    isPublic: false,
    authorName: input.authorName,
  });
}
