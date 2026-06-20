import { getSupabase } from "@/lib/supabase";
import type { ResourceItem } from "@/data/mockResources";
import { resourceRowToItem, type DbResourceRow } from "@/services/content/types";

export async function fetchResources(): Promise<ResourceItem[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.from("resources").select("*").order("title");

  if (error) {
    console.error("[resourcesService] fetch:", error.message);
    return [];
  }
  return ((data ?? []) as DbResourceRow[]).map(resourceRowToItem);
}

export async function insertResource(
  resource: Omit<ResourceItem, "id">
): Promise<ResourceItem | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const metadata: Record<string, unknown> = {};
  if (resource.instructorName) metadata.instructorName = resource.instructorName;
  if (resource.locations) metadata.locations = resource.locations;
  if (resource.certificateNote) metadata.certificateNote = resource.certificateNote;

  const { data, error } = await supabase
    .from("resources")
    .insert({
      title: resource.title,
      description: resource.description,
      section: resource.section,
      body: resource.body,
      duration: resource.duration ?? null,
      action_label: resource.actionLabel,
      price_label: resource.price ?? null,
      is_published: true,
      ...(Object.keys(metadata).length ? { metadata } : {}),
    })
    .select()
    .single();

  if (error) {
    console.error("[resourcesService] insert:", error.message);
    return null;
  }
  return resourceRowToItem(data as DbResourceRow);
}

export type ResourceUpdatePatch = Partial<
  Pick<ResourceItem, "title" | "description" | "body" | "price" | "instructorName" | "locations" | "certificateNote">
>;

export async function updateResource(
  id: string,
  patch: ResourceUpdatePatch
): Promise<ResourceItem | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: existing, error: fetchError } = await supabase
    .from("resources")
    .select("metadata")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    console.error("[resourcesService] update fetch:", fetchError?.message);
    return null;
  }

  const dbPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.body !== undefined) dbPatch.body = patch.body;
  if (patch.price !== undefined) dbPatch.price_label = patch.price || null;

  const metaKeys = ["instructorName", "locations", "certificateNote"] as const;
  const hasMetaChange = metaKeys.some((k) => patch[k] !== undefined);
  if (hasMetaChange) {
    const currentMeta = ((existing as { metadata?: Record<string, unknown> }).metadata ??
      {}) as Record<string, unknown>;
    const nextMeta = { ...currentMeta };
    if (patch.instructorName !== undefined) {
      nextMeta.instructorName = patch.instructorName.trim() || null;
    }
    if (patch.locations !== undefined) {
      nextMeta.locations = patch.locations.trim() || null;
    }
    if (patch.certificateNote !== undefined) {
      nextMeta.certificateNote = patch.certificateNote.trim() || null;
    }
    dbPatch.metadata = nextMeta;
  }

  const { data, error } = await supabase
    .from("resources")
    .update(dbPatch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[resourcesService] update:", error.message);
    return null;
  }
  return resourceRowToItem(data as DbResourceRow);
}

export async function deleteResource(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) console.error("[resourcesService] delete:", error.message);
  return !error;
}

export async function setResourcePublished(id: string, published: boolean): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("resources").update({ is_published: published }).eq("id", id);
}

export async function countResources(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("resources")
    .select("*", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}
