import { getSupabase } from "@/lib/supabase";
import type { DailyPrompt } from "@/context/GratitudeContext";
import { promptRowToDaily, type DbPromptRow } from "@/services/content/types";

export async function fetchPrompts(): Promise<DailyPrompt[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("prompts")
    .select("*")
    .order("date_iso", { ascending: false });

  if (error) {
    console.error("[promptsService] fetch:", error.message);
    throw new Error(error.message);
  }
  return ((data ?? []) as DbPromptRow[]).map(promptRowToDaily);
}

export async function insertPrompt(text: string, dateISO: string): Promise<DailyPrompt | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("prompts")
    .insert({ text, date_iso: dateISO, active: true })
    .select()
    .single();

  if (error) {
    console.error("[promptsService] insert:", error.message);
    return null;
  }
  return promptRowToDaily(data as DbPromptRow);
}

export async function deletePrompt(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { data, error } = await supabase.from("prompts").delete().eq("id", id).select("id").maybeSingle();
  if (error) {
    console.error("[promptsService] delete:", error.message);
    return false;
  }
  return Boolean(data?.id);
}

export async function setPromptActive(id: string, active: boolean): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { data, error } = await supabase.from("prompts").update({ active }).eq("id", id).select("id").maybeSingle();
  if (error) {
    console.error("[promptsService] toggle active:", error.message);
    return false;
  }
  return Boolean(data?.id);
}

export async function countPrompts(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("prompts")
    .select("*", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}
