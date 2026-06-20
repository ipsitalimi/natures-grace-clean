import { getSupabase } from "@/lib/supabase";
import type { LegalVersions } from "@/types/legal";

export async function saveLegalVersions(
  versions: LegalVersions
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { data: existing, error: fetchError } = await supabase
    .from("platform_settings")
    .select("settings")
    .eq("id", "default")
    .maybeSingle();

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }

  const currentSettings =
    existing?.settings && typeof existing.settings === "object"
      ? (existing.settings as Record<string, unknown>)
      : {};

  const nextSettings = {
    ...currentSettings,
    legalVersions: versions,
  };

  const { error } = await supabase.from("platform_settings").upsert({
    id: "default",
    settings: nextSettings,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
