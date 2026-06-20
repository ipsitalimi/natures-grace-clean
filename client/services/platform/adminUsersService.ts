import { getApiBaseUrl } from "@/lib/apiBase";
import { authJsonHeaders } from "@/lib/apiAuth";

export async function provisionUserRole(
  userId: string,
  role: string,
  accessToken: string
): Promise<{ error?: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/admin/users/${userId}/role`, {
      method: "POST",
      headers: authJsonHeaders(accessToken),
      body: JSON.stringify({ role }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return { error: json.error ?? `Server error (${res.status})` };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not update role" };
  }
}
