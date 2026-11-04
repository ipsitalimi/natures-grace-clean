import { tryGetApiBaseUrl } from "@/lib/apiBase";
import { authJsonHeaders } from "@/lib/apiAuth";

export async function cancelUserBooking(
  bookingId: string,
  accessToken: string,
  notes?: string
): Promise<{ ok: boolean; error?: string; refundRequested?: boolean }> {
  const baseUrl = tryGetApiBaseUrl();
  if (!baseUrl) return { ok: false, error: "Server API is not configured." };

  try {
    const response = await fetch(`${baseUrl}/api/bookings/${encodeURIComponent(bookingId)}/cancel`, {
      method: "POST",
      headers: authJsonHeaders(accessToken),
      body: JSON.stringify({ notes }),
    });
    const body = (await response.json()) as {
      error?: string;
      ok?: boolean;
      refundRequested?: boolean;
    };
    if (!response.ok || !body.ok) {
      return { ok: false, error: body.error ?? `Cancellation failed (${response.status})` };
    }
    return { ok: true, refundRequested: body.refundRequested };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Cancellation request failed",
    };
  }
}
