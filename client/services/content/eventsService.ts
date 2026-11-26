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
    throw new Error(error.message);
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

/**
 * Permanently delete events that have no registration history.
 * Events with registrations are archived so attendee/payment history is preserved.
 */
export type EventDeleteResult = "deleted" | "archived" | false;

export async function deleteEventByDbId(dbId: string): Promise<EventDeleteResult> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { count, error: countError } = await supabase
    .from("event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", dbId);

  if (countError) {
    console.error("[eventsService] registration count before delete:", countError.message);
    return false;
  }

  const archiveEvent = async (): Promise<EventDeleteResult> => {
    const { data, error } = await supabase
      .from("events")
      .update({ is_visible: false, status: "Ended" })
      .eq("id", dbId)
      .select("id")
      .maybeSingle();
    if (error) console.error("[eventsService] archive:", error.message);
    return !error && data?.id ? "archived" : false;
  };

  if ((count ?? 0) > 0) {
    return archiveEvent();
  }

  const { data, error } = await supabase
    .from("events")
    .delete()
    .eq("id", dbId)
    .select("id")
    .maybeSingle();

  if (!error && data?.id) return "deleted";

  // A registration may have been created after the count query. The FK
  // restriction is the final safeguard; archive instead of losing history.
  if (error?.code === "23503") {
    console.warn("[eventsService] Event gained registration history during delete; archiving instead.");
    return archiveEvent();
  }

  if (error) console.error("[eventsService] delete:", error.message);
  return false;
}

export async function updateEventVisibility(dbId: string, isVisible: boolean): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("events")
    .update({ is_visible: isVisible, status: isVisible ? "Active" : "Ended" })
    .eq("id", dbId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[eventsService] visibility:", error.message);
    return false;
  }
  return Boolean(data?.id);
}

export type EventUpdatePatch = Partial<
  Pick<
    CommunityEvent,
    | "title"
    | "description"
    | "date"
    | "time"
    | "mode"
    | "venue"
    | "price"
    | "pricing"
    | "whatToExpect"
    | "ctaText"
    | "bottomNote"
    | "photos"
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
