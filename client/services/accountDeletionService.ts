import { getApiBaseUrl } from "@/lib/apiBase";
import { authJsonHeaders } from "@/lib/apiAuth";
import { getSupabase } from "@/lib/supabase";
import { pickPublicEnv } from "@/lib/publicEnv";

async function deleteAccountViaApi(accessToken: string): Promise<{ error?: string } | null> {
  const hasApiUrl = Boolean(
    pickPublicEnv(process.env.EXPO_PUBLIC_API_URL, "EXPO_PUBLIC_API_URL")
  );
  if (!hasApiUrl) return null;

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/account/delete`, {
      method: "POST",
      headers: authJsonHeaders(accessToken),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { error: body.error ?? "Could not delete account" };
    return {};
  } catch {
    return null;
  }
}

export async function deleteMyAccount(accessToken?: string | null): Promise<{ error?: string }> {
  if (accessToken) {
    const apiResult = await deleteAccountViaApi(accessToken);
    if (apiResult) return apiResult;
  }

  const supabase = getSupabase();
  if (!supabase) return { error: "Connect Supabase to delete account." };
  return { error: "Account deletion service unavailable. Set EXPO_PUBLIC_API_URL and retry." };
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
