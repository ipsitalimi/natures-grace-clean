import { getSupabase } from "@/lib/supabase";

/** Returns distinct seller IDs for cart product IDs. Empty when Supabase is unavailable. */
export async function fetchDistinctSellerIdsForProducts(
  productIds: string[]
): Promise<string[]> {
  const ids = [...new Set(productIds.filter(Boolean))];
  if (ids.length === 0) return [];

  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.from("products").select("seller_id").in("id", ids);
  if (error || !data?.length) return [];

  return [
    ...new Set(
      (data as { seller_id: string | null }[])
        .map((row) => row.seller_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
}
