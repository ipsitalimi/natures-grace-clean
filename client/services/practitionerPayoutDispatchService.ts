import { getApiBaseUrl } from "@/lib/apiBase";

export type DispatchPayoutResult = {
  payoutId?: string;
  status?: string;
  message?: string;
  error?: string;
  devMode?: boolean;
};

export async function dispatchPractitionerPayout(
  payoutId: string,
  accessToken: string
): Promise<DispatchPayoutResult> {
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/api/practitioner-payouts/${payoutId}/dispatch`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const json = (await res.json()) as DispatchPayoutResult;
    if (!res.ok) {
      return { error: json.error ?? `Server error (${res.status})` };
    }
    return json;
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not reach payout server",
    };
  }
}
