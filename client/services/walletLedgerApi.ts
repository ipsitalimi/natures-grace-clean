import { getApiBaseUrl } from "@/lib/apiBase";
import { authJsonHeaders } from "@/lib/apiAuth";

export async function syncSellerWallet(accessToken: string): Promise<{ error?: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/wallet/seller/sync`, {
      method: "POST",
      headers: authJsonHeaders(accessToken),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return { error: json.error ?? `Server error (${res.status})` };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not sync wallet" };
  }
}

export async function requestSellerPayout(
  amount: number,
  accessToken: string
): Promise<{ payoutId?: string; error?: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/wallet/seller/request-payout`, {
      method: "POST",
      headers: authJsonHeaders(accessToken),
      body: JSON.stringify({ amount }),
    });
    const json = (await res.json()) as { payoutId?: string; error?: string };
    if (!res.ok) return { error: json.error ?? `Server error (${res.status})` };
    return { payoutId: json.payoutId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not request payout" };
  }
}

export async function syncPractitionerWallet(accessToken: string): Promise<{ error?: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/wallet/practitioner/sync`, {
      method: "POST",
      headers: authJsonHeaders(accessToken),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return { error: json.error ?? `Server error (${res.status})` };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not sync wallet" };
  }
}

export async function requestPractitionerPayout(
  amount: number,
  accessToken: string
): Promise<{ payoutId?: string; error?: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/wallet/practitioner/request-payout`, {
      method: "POST",
      headers: authJsonHeaders(accessToken),
      body: JSON.stringify({ amount }),
    });
    const json = (await res.json()) as { payoutId?: string; error?: string };
    if (!res.ok) return { error: json.error ?? `Server error (${res.status})` };
    return { payoutId: json.payoutId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not request payout" };
  }
}
