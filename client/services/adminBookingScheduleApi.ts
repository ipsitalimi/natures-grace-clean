import { tryGetApiBaseUrl } from "@/lib/apiBase";
import { authJsonHeaders } from "@/lib/apiAuth";

export type AdminScheduledBooking = {
  id: string;
  booking_number: string | null;
  user_id: string;
  practitioner_id: string | null;
  client_name: string;
  service_name: string;
  session_date: string;
  session_time: string;
  duration_minutes: number;
  booking_status: string;
  payment_status: string;
  meeting_link: string | null;
};

export async function fetchAdminBookingSchedule(
  accessToken: string,
  from?: string,
  to?: string
): Promise<{ ok: boolean; sessions?: AdminScheduledBooking[]; error?: string }> {
  const baseUrl = tryGetApiBaseUrl();
  if (!baseUrl) return { ok: false, error: "Server API is not configured." };

  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  try {
    const response = await fetch(`${baseUrl}/api/admin/bookings/schedule?${params.toString()}`, {
      headers: authJsonHeaders(accessToken),
    });
    const body = (await response.json()) as { sessions?: AdminScheduledBooking[]; error?: string };
    if (!response.ok) return { ok: false, error: body.error ?? "Could not load schedule." };
    return { ok: true, sessions: body.sessions ?? [] };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not load schedule." };
  }
}

export async function updateAdminBookingSchedule(
  bookingId: string,
  accessToken: string,
  input: { sessionDate: string; sessionTime: string; meetingLink?: string | null }
): Promise<{ ok: boolean; error?: string; booking?: Pick<AdminScheduledBooking, "id" | "session_date" | "session_time" | "meeting_link"> }> {
  const baseUrl = tryGetApiBaseUrl();
  if (!baseUrl) return { ok: false, error: "Server API is not configured." };

  try {
    const response = await fetch(`${baseUrl}/api/admin/bookings/${encodeURIComponent(bookingId)}/schedule`, {
      method: "PATCH",
      headers: authJsonHeaders(accessToken),
      body: JSON.stringify(input),
    });
    const body = (await response.json()) as { ok?: boolean; error?: string; booking?: AdminScheduledBooking };
    if (!response.ok || !body.ok) return { ok: false, error: body.error ?? "Schedule update failed." };
    return { ok: true, booking: body.booking };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Schedule update failed." };
  }
}
