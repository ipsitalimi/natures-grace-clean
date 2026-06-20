import { getApiBaseUrl } from "@/lib/apiBase";
import { authJsonHeaders } from "@/lib/apiAuth";
import { getSupabase } from "@/lib/supabase";
import { pickPublicEnv } from "@/lib/publicEnv";

async function requestDeletionViaApi(
  accessToken: string,
  reason?: string
): Promise<{ error?: string } | null> {
  const hasApiUrl = Boolean(
    pickPublicEnv(process.env.EXPO_PUBLIC_API_URL, "EXPO_PUBLIC_API_URL")
  );
  if (!hasApiUrl) return null;

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/account/request-deletion`, {
      method: "POST",
      headers: authJsonHeaders(accessToken),
      body: JSON.stringify({ reason: reason?.trim() || null }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { error: body.error ?? "Could not submit deletion request" };
    return {};
  } catch {
    return null;
  }
}

export async function requestAccountDeletion(
  reason?: string,
  accessToken?: string | null
): Promise<{ error?: string }> {
  if (accessToken) {
    const apiResult = await requestDeletionViaApi(accessToken, reason);
    if (apiResult) return apiResult;
  }

  const supabase = getSupabase();
  if (!supabase) return { error: "Connect Supabase to request account deletion." };

  const { data, error } = await supabase.rpc("request_account_deletion", {
    p_reason: reason?.trim() || null,
  });

  if (error) return { error: error.message };
  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) return { error: result?.error ?? "Could not submit deletion request" };
  return {};
}

export async function completeAccountDeletionAdmin(
  accessToken: string,
  userId: string
): Promise<{ error?: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/admin/users/${userId}/complete-deletion`, {
      method: "POST",
      headers: authJsonHeaders(accessToken),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { error: body.error ?? "Could not complete account deletion" };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not complete account deletion" };
  }
}
