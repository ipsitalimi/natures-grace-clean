import type { AddFavoriteInput, FavoriteItem, FavoriteItemType } from "@/data/favorites";
import { getSupabase } from "@/lib/supabase";

export type DbFavoriteItemRow = {
  id: string;
  user_id: string;
  item_type: FavoriteItemType;
  item_id: string;
  item_db_id: string | null;
  display_name: string;
  display_subtitle: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

function mapRow(row: DbFavoriteItemRow): FavoriteItem {
  return {
    id: row.id,
    userId: row.user_id,
    itemType: row.item_type,
    itemId: row.item_id,
    itemDbId: row.item_db_id,
    displayName: row.display_name,
    displaySubtitle: row.display_subtitle,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

export async function fetchMyFavorites(): Promise<FavoriteItem[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("favorite_items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[favoritesService] fetch:", error.message);
    throw new Error(error.message);
  }

  return ((data ?? []) as DbFavoriteItemRow[]).map(mapRow);
}

export async function addFavorite(input: AddFavoriteInput): Promise<FavoriteItem | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("favorite_items")
    .insert({
      user_id: user.id,
      item_type: input.itemType,
      item_id: input.itemId,
      item_db_id: input.itemDbId ?? null,
      display_name: input.displayName.trim(),
      display_subtitle: input.displaySubtitle?.trim() ?? "",
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      const existing = await fetchFavorite(input.itemType, input.itemId);
      return existing;
    }
    console.error("[favoritesService] add:", error.message);
    return null;
  }

  return mapRow(data as DbFavoriteItemRow);
}

export async function removeFavorite(favoriteId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("favorite_items")
    .delete()
    .eq("id", favoriteId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[favoritesService] remove:", error.message);
    return false;
  }
  return true;
}

export async function removeFavoriteByItem(
  itemType: FavoriteItemType,
  itemId: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("favorite_items")
    .delete()
    .eq("user_id", user.id)
    .eq("item_type", itemType)
    .eq("item_id", itemId);

  if (error) {
    console.error("[favoritesService] remove by item:", error.message);
    return false;
  }
  return true;
}

export async function fetchFavorite(
  itemType: FavoriteItemType,
  itemId: string
): Promise<FavoriteItem | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("favorite_items")
    .select("*")
    .eq("user_id", user.id)
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .maybeSingle();

  if (error) {
    console.error("[favoritesService] fetch one:", error.message);
    return null;
  }

  return data ? mapRow(data as DbFavoriteItemRow) : null;
}
