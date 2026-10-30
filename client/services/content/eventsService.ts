import { getSupabase } from "@/lib/supabase";
import type { CommunityEvent } from "@/context/DataContext";
import {
  communityEventToRow,
  eventRowToCommunityEvent,
  type DbEventRow,
} from "@/services/content/types";

export async function fetchEvents(): Promise<CommunityEvent[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.from("events").select("*").order("created_at", {
    ascending: true,
  });

  if (error) {
    console.error("[eventsService] fetch:", error.message);
    return [];
  }
  return ((data ?? []) as DbEventRow[]).map(eventRowToCommunityEvent);
}

export async function insertEvent(event: Omit<CommunityEvent, "dbId">): Promise<CommunityEvent | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const row = communityEventToRow(event as CommunityEvent);
  const { data, error } = await supabase
    .from("events")
    .insert({
      title: row.title,
      description: row.description,
      event_date: row.event_date,
      event_time: row.event_time,
      mode: row.mode,
      price_label: row.price_label,
      status: row.status,
      is_visible: row.is_visible,
      metadata: row.metadata,
    })
    .select()
    .single();

  if (error) {
    console.error("[eventsService] insert:", error.message);
    return null;
  }
  return eventRowToCommunityEvent(data as DbEventRow);
}

export async function deleteEventByDbId(dbId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("events").delete().eq("id", dbId);
  if (error) console.error("[eventsService] delete:", error.message);
  return !error;
}

export async function updateEventVisibility(dbId: string, isVisible: boolean): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("events").update({ is_visible: isVisible }).eq("id", dbId);
}

export type EventUpdatePatch = Partial<
  Pick<
    CommunityEvent,
    | "title"
    | "description"
    | "date"
    | "time"
    | "mode"
    | "price"
    | "pricing"
    | "whatToExpect"
    | "ctaText"
    | "bottomNote"
    | "status"
  >
>;

export async function updateEvent(
  dbId: string,
  patch: EventUpdatePatch
): Promise<CommunityEvent | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: existing, error: fetchError } = await supabase
    .from("events")
    .select("*")
    .eq("id", dbId)
    .maybeSingle();

  if (fetchError || !existing) {
    console.error("[eventsService] update fetch:", fetchError?.message);
    return null;
  }

  const current = eventRowToCommunityEvent(existing as DbEventRow);
  const next: CommunityEvent = {
    ...current,
    ...patch,
    id: current.id,
    dbId: current.dbId,
  };

  const row = communityEventToRow(next);
  const { data, error } = await supabase
    .from("events")
    .update({
      title: row.title,
      description: row.description,
      event_date: row.event_date,
      event_time: row.event_time,
      mode: row.mode,
      price_label: row.price_label,
      status: row.status,
      is_visible: row.is_visible,
      metadata: row.metadata,
    })
    .eq("id", dbId)
    .select()
    .single();

  if (error) {
    console.error("[eventsService] update:", error.message);
    return null;
  }
  return eventRowToCommunityEvent(data as DbEventRow);
}

export async function countEvents(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}
