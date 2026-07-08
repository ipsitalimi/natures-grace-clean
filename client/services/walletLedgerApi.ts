import { tryGetApiBaseUrl } from "@/lib/apiBase";
import { authJsonHeaders } from "@/lib/apiAuth";

const API_UNAVAILABLE =
  "Server API is not configured. Set EXPO_PUBLIC_API_URL for wallet and checkout features.";

export async function syncSellerWallet(accessToken: string): Promise<{ error?: string }> {
  const baseUrl = tryGetApiBaseUrl();
  if (!baseUrl) return { error: API_UNAVAILABLE };
  try {
    const res = await fetch(`${baseUrl}/api/wallet/seller/sync`, {
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
  const baseUrl = tryGetApiBaseUrl();
  if (!baseUrl) return { error: API_UNAVAILABLE };
  try {
    const res = await fetch(`${baseUrl}/api/wallet/seller/request-payout`, {
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
  const baseUrl = tryGetApiBaseUrl();
  if (!baseUrl) return { error: API_UNAVAILABLE };
  try {
    const res = await fetch(`${baseUrl}/api/wallet/practitioner/sync`, {
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
  const baseUrl = tryGetApiBaseUrl();
  if (!baseUrl) return { error: API_UNAVAILABLE };
  try {
    const res = await fetch(`${baseUrl}/api/wallet/practitioner/request-payout`, {
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

export async function updateSellerBankDetails(
  input: { bankName: string; last4: string; accountHolder: string },
  accessToken: string
): Promise<{ error?: string }> {
  const baseUrl = tryGetApiBaseUrl();
  if (!baseUrl) return { error: API_UNAVAILABLE };
  try {
    const res = await fetch(`${baseUrl}/api/wallet/seller/bank-details`, {
      method: "POST",
      headers: authJsonHeaders(accessToken),
      body: JSON.stringify(input),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return { error: json.error ?? `Server error (${res.status})` };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save bank details" };
  }
}

export async function updatePractitionerBankDetails(
  input: { bankName: string; last4: string; accountHolder: string },
  accessToken: string
): Promise<{ error?: string }> {
  const baseUrl = tryGetApiBaseUrl();
  if (!baseUrl) return { error: API_UNAVAILABLE };
  try {
    const res = await fetch(`${baseUrl}/api/wallet/practitioner/bank-details`, {
      method: "POST",
      headers: authJsonHeaders(accessToken),
      body: JSON.stringify(input),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return { error: json.error ?? `Server error (${res.status})` };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save bank details" };
  }
}
