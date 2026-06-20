/** User favorites / saved items (Supabase-backed). */

export type FavoriteItemType = "practitioner" | "product" | "resource" | "event";

export interface FavoriteItem {
  id: string;
  userId: string;
  itemType: FavoriteItemType;
  itemId: string;
  itemDbId: string | null;
  displayName: string;
  displaySubtitle: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AddFavoriteInput {
  itemType: FavoriteItemType;
  itemId: string;
  itemDbId?: string | null;
  displayName: string;
  displaySubtitle?: string;
  metadata?: Record<string, unknown>;
}

/** Resolved row for Favorites list UI. */
export interface FavoriteListEntry {
  id: string;
  itemType: FavoriteItemType;
  itemId: string;
  name: string;
  specialty: string;
}
