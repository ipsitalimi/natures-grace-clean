import { getSupabase } from "@/lib/supabase";

export async function resolveSellerIdByProfileId(
  profileId: string
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("sellers")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    console.error("[sellerId] resolve:", error.message);
    return null;
  }

  return (data as { id: string } | null)?.id ?? null;
}

export async function fetchSellerProductIds(sellerId: string): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("seller_id", sellerId);

  if (error) {
    console.error("[sellerId] product ids:", error.message);
    return [];
  }

  return (data ?? []).map((row) => (row as { id: string }).id);
}
