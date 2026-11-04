import { tryGetApiBaseUrl } from "@/lib/apiBase";
import { authJsonHeaders } from "@/lib/apiAuth";

export async function rescheduleUserBooking(
  bookingId: string,
  accessToken: string,
  sessionDate: string,
  sessionTime: string
): Promise<{ ok: boolean; error?: string; sessionDate?: string; sessionTime?: string }> {
  const baseUrl = tryGetApiBaseUrl();
  if (!baseUrl) return { ok: false, error: "Server API is not configured." };

  try {
    const response = await fetch(
      `${baseUrl}/api/bookings/${encodeURIComponent(bookingId)}/reschedule`,
      {
        method: "POST",
        headers: authJsonHeaders(accessToken),
        body: JSON.stringify({ sessionDate, sessionTime }),
      }
    );
    const body = (await response.json()) as {
      error?: string;
      ok?: boolean;
      sessionDate?: string;
      sessionTime?: string;
    };
    if (!response.ok || !body.ok) {
      return { ok: false, error: body.error ?? `Rescheduling failed (${response.status})` };
    }
    return { ok: true, sessionDate: body.sessionDate, sessionTime: body.sessionTime };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Reschedule request failed",
    };
  }
}
