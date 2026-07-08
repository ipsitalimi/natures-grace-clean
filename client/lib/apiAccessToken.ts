import { getSupabase } from "@/lib/supabase";

/** Fresh access token for Express API calls (refreshes session when needed). */
export async function resolveApiAccessToken(
  fallback?: string | null
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return fallback?.trim() || null;

  const { data: sessionData } = await supabase.auth.getSession();
  const existing = sessionData.session?.access_token?.trim();
  if (existing) return existing;

  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (!error && refreshed.session?.access_token) {
    return refreshed.session.access_token.trim();
  }

  return fallback?.trim() || null;
}
