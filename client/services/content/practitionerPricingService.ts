import { getSupabase } from "@/lib/supabase";
import { resolvePractitionerId } from "@/services/content/practitionerId";

export type PractitionerPricingRule = {
  id: string;
  practitioner_id: string;
  duration_minutes: number;
  is_enabled: boolean;
  min_price: number;
  max_price: number;
};

export const SUPPORTED_SESSION_DURATIONS = [15, 20, 30, 45, 60] as const;

export async function fetchPractitionerPricingRules(
  practitionerId: string
): Promise<PractitionerPricingRule[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("practitioner_pricing_rules")
    .select("*")
    .eq("practitioner_id", practitionerId)
    .order("duration_minutes");
  if (error) {
    console.error("[practitionerPricing] fetch:", error.message);
    return [];
  }
  return (data ?? []).map((row: any) => ({
    ...row,
    min_price: Number(row.min_price),
    max_price: Number(row.max_price),
  })) as PractitionerPricingRule[];
}

export async function fetchMyPractitionerPricingRules(
  profileId?: string | null
): Promise<PractitionerPricingRule[]> {
  const practitionerId = await resolvePractitionerId(profileId);
  if (!practitionerId) return [];
  return fetchPractitionerPricingRules(practitionerId);
}

export async function savePractitionerPricingRule(input: {
  practitionerId: string;
  durationMinutes: number;
  enabled: boolean;
  minPrice: number;
  maxPrice: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  if (!SUPPORTED_SESSION_DURATIONS.includes(input.durationMinutes as any)) {
    return { ok: false, error: "Unsupported session duration." };
  }
  if (!Number.isInteger(input.minPrice) || !Number.isInteger(input.maxPrice)
    || input.minPrice < 0 || input.maxPrice > 10000 || input.minPrice > input.maxPrice) {
    return { ok: false, error: "Enter whole-rupee prices between ₹0 and ₹10,000, with minimum no greater than maximum." };
  }
  const { error } = await supabase.from("practitioner_pricing_rules").upsert({
    practitioner_id: input.practitionerId,
    duration_minutes: input.durationMinutes,
    is_enabled: input.enabled,
    min_price: input.minPrice,
    max_price: input.maxPrice,
  }, { onConflict: "practitioner_id,duration_minutes" });
  if (error) {
    console.error("[practitionerPricing] save:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
