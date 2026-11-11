import type { AdminUpcomingSession, AdminSessionStatus } from "@/data/adminSessions";
import type {
  DbBookingRow,
  PractitionerSession,
  PractitionerSessionStatus,
  UserSessionHistory,
} from "@/data/practitionerBookings";
import { getSupabase } from "@/lib/supabase";
import { resolvePractitionerId } from "@/services/content/practitionerId";
import { cancelUserBooking } from "@/services/bookingCancellationApi";

function sessionTimeMinutes(value: string): number {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (match) {
    let hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === "PM") hour += 12;
    return hour * 60 + Number(match[2] ?? "0");
  }
  const twentyFourHour = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHour) return Number(twentyFourHour[1]) * 60 + Number(twentyFourHour[2]);
  return Number.MAX_SAFE_INTEGER;
}

function sortBookingsBySessionStart(rows: DbBookingRow[]): DbBookingRow[] {
  return [...rows].sort((a, b) =>
    a.session_date.localeCompare(b.session_date) ||
    sessionTimeMinutes(a.session_time) - sessionTimeMinutes(b.session_time)
  );
}

function uiStatus(row: DbBookingRow): PractitionerSessionStatus {
  if (row.booking_status === "Cancelled") return "Cancelled";
  if (row.booking_status === "Completed") return "Completed";
  return "Upcoming";
}

function adminSessionStatus(row: DbBookingRow): AdminSessionStatus {
  if (row.booking_status === "Cancelled") return "Cancelled";
  if (row.booking_status === "Completed") return "Completed";
  return "Upcoming";
}

export function toAdminUpcomingSession(
  row: DbBookingRow,
  practitionerName: string
): AdminUpcomingSession {
  return {
    id: row.id,
    userName: row.client_name,
    practitionerName,
    service: row.service_name,
    date: row.session_date,
    time: row.session_time,
    status: adminSessionStatus(row),
    duration: `${row.duration_minutes} mins`,
    paymentStatus: row.payment_status,
    bookingStatus: row.booking_status,
  };
}

/** Upcoming practitioner bookings for admin dashboard (shared booking source of truth). */
export async function fetchAdminUpcomingSessions(
  limit = 10
): Promise<AdminUpcomingSession[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data: bookings, error } = await supabase
    .from("practitioner_bookings")
    .select("*")
    .in("booking_status", ["Pending", "Confirmed"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[practitionerBookings] admin upcoming:", error.message);
    throw new Error(error.message);
  }

  const rows = (bookings ?? []) as DbBookingRow[];
  const practitionerIds = [
    ...new Set(rows.map((r) => r.practitioner_id).filter(Boolean)),
  ] as string[];

  const nameById = new Map<string, string>();
  if (practitionerIds.length) {
    const { data: practitioners } = await supabase
      .from("practitioners")
      .select("id, name")
      .in("id", practitionerIds);
    for (const p of practitioners ?? []) {
      nameById.set((p as { id: string }).id, (p as { name: string }).name);
    }
  }

  return rows.map((row) =>
    toAdminUpcomingSession(
      row,
      nameById.get(row.practitioner_id ?? "") ?? "Practitioner"
    )
  );
}

export function toPractitionerSession(row: DbBookingRow): PractitionerSession {
  return {
    id: row.id,
    userName: row.client_name,
    service: row.service_name,
    date: row.session_date,
    time: row.session_time,
    duration: `${row.duration_minutes} min`,
    status: uiStatus(row),
    notes: row.notes ?? undefined,
    amount: Number(row.amount),
    paymentStatus: row.payment_status,
  };
}

export function toUserSessionHistory(
  row: DbBookingRow,
  practitionerName: string
): UserSessionHistory {
  return {
    id: row.id,
    practitionerId: row.practitioner_id ?? undefined,
    practitionerName,
    serviceType: row.service_name,
    date: row.session_date,
    status: uiStatus(row),
    duration: `${row.duration_minutes} min`,
    price: Number(row.amount).toLocaleString("en-IN"),
    time: row.session_time,
    paymentStatus: row.payment_status,
  };
}

export async function fetchPractitionerBookings(
  profileId?: string | null
): Promise<PractitionerSession[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const practitionerId = await resolvePractitionerId(profileId);
  if (profileId && !practitionerId) {
    return [];
  }

  let query = supabase
    .from("practitioner_bookings")
    .select("*")
    .order("session_date", { ascending: true })
    .order("session_time", { ascending: true });

  if (practitionerId) {
    query = query.eq("practitioner_id", practitionerId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[practitionerBookings] fetch:", error.message);
    return [];
  }
  return sortBookingsBySessionStart((data ?? []) as DbBookingRow[]).map(toPractitionerSession);
}

export async function fetchUserBookings(
  userId: string
): Promise<UserSessionHistory[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data: bookings, error } = await supabase
    .from("practitioner_bookings")
    .select("*")
    .eq("user_id", userId)
    .order("session_date", { ascending: true })
    .order("session_time", { ascending: true });

  if (error) {
    console.error("[practitionerBookings] user fetch:", error.message);
    return [];
  }

  const rows = (bookings ?? []) as DbBookingRow[];
  const practitionerIds = [
    ...new Set(rows.map((r) => r.practitioner_id).filter(Boolean)),
  ] as string[];

  const nameById = new Map<string, string>();
  if (practitionerIds.length) {
    const { data: practitioners } = await supabase
      .from("practitioners")
      .select("id, name")
      .in("id", practitionerIds);
    for (const p of practitioners ?? []) {
      nameById.set((p as { id: string; name: string }).id, (p as { name: string }).name);
    }
  }

  return sortBookingsBySessionStart(rows).map((row) =>
    toUserSessionHistory(row, nameById.get(row.practitioner_id ?? "") ?? "Practitioner")
  );
}

/** Next upcoming paid/confirmed session for home screen. */
export async function fetchNextUpcomingUserBooking(
  userId: string
): Promise<UserSessionHistory | null> {
  const sessions = await fetchUserBookings(userId);
  const upcoming = sessions.find((s) => s.status === "Upcoming");
  return upcoming ?? null;
}

/** Admin user detail: full booking history for one user profile/auth id. */
export async function fetchAdminUserSessionHistory(
  userId: string
): Promise<AdminUpcomingSession[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data: bookings, error } = await supabase
    .from("practitioner_bookings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[practitionerBookings] admin user history:", error.message);
    throw new Error(error.message);
  }

  const rows = (bookings ?? []) as DbBookingRow[];
  const practitionerIds = [
    ...new Set(rows.map((r) => r.practitioner_id).filter(Boolean)),
  ] as string[];

  const nameById = new Map<string, string>();
  if (practitionerIds.length) {
    const { data: practitioners } = await supabase
      .from("practitioners")
      .select("id, name")
      .in("id", practitionerIds);
    for (const p of practitioners ?? []) {
      nameById.set((p as { id: string }).id, (p as { name: string }).name);
    }
  }

  return rows.map((row) =>
    toAdminUpcomingSession(
      row,
      nameById.get(row.practitioner_id ?? "") ?? "Practitioner"
    )
  );
}

export async function getBookingById(
  bookingId: string
): Promise<DbBookingRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("practitioner_bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    console.error("[practitionerBookings] get:", error.message);
    return null;
  }
  return data as DbBookingRow | null;
}

export type CreateBookingInput = {
  practitionerId: string;
  offeringId?: string;
  userId?: string;
  clientName: string;
  clientEmail?: string;
  serviceName: string;
  sessionDate: string;
  sessionTime: string;
  durationMinutes: number;
  amount: number;
  notes?: string;
  razorpayPaymentId?: string;
};

function bookingNumber(): string {
  return `BK-${Date.now().toString(36).toUpperCase()}`;
}

/** @deprecated Paid bookings are created server-side after checkout confirmation. */
export async function createPaidBooking(
  _input: CreateBookingInput,
  _commissionRate: number
): Promise<PractitionerSession | null> {
  console.error("[practitionerBookings] createPaidBooking is server-only");
  return null;
}

export async function completeBooking(
  bookingId: string,
  commissionRate: number,
  notes?: string
): Promise<PractitionerSession | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const existing = await getBookingById(bookingId);
  if (!existing) return null;

  const { data, error } = await supabase
    .from("practitioner_bookings")
    .update({
      booking_status: "Completed",
      completed_at: new Date().toISOString(),
      notes: notes ?? existing.notes,
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (error || !data) {
    console.error("[practitionerBookings] complete:", error?.message);
    return null;
  }

  const row = data as DbBookingRow;
  await recordSessionHistory(row);
  return toPractitionerSession(row);
}

export async function cancelBooking(
  bookingId: string,
  commissionRate: number,
  options?: { notes?: string; requestRefund?: boolean; accessToken?: string }
): Promise<PractitionerSession | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const existing = await getBookingById(bookingId);
  if (!existing) return null;

  // User cancellations go through the authenticated API and atomic server RPC.
  if (options?.requestRefund) {
    if (!options.accessToken) {
      console.error("[practitionerBookings] user cancellation requires auth token");
      return null;
    }
    const result = await cancelUserBooking(bookingId, options.accessToken, options.notes);
    if (!result.ok) {
      console.error("[practitionerBookings] user cancellation:", result.error);
      return null;
    }
    const updated = await getBookingById(bookingId);
    return updated ? toPractitionerSession(updated) : null;
  }

  // Practitioner cancellation path (no customer refund request).
  const { data, error } = await supabase
    .from("practitioner_bookings")
    .update({
      booking_status: "Cancelled",
      notes: options?.notes ?? existing.notes,
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (error || !data) {
    console.error("[practitionerBookings] cancel:", error?.message);
    return null;
  }

  return toPractitionerSession(data as DbBookingRow);
}

async function recordSessionHistory(row: DbBookingRow): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data: existing } = await supabase
    .from("practitioner_session_history")
    .select("id")
    .eq("booking_id", row.id)
    .maybeSingle();

  if (existing) return;

  await supabase.from("practitioner_session_history").insert({
    booking_id: row.id,
    practitioner_id: row.practitioner_id,
    client_name: row.client_name,
    service_name: row.service_name,
    session_date: row.session_date,
    session_time: row.session_time,
    duration_minutes: row.duration_minutes,
    amount: row.amount,
    notes: row.notes,
    completed_at: row.completed_at ?? new Date().toISOString(),
  });
}

export async function fetchAllBookingRows(
  profileId?: string | null
): Promise<DbBookingRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const practitionerId = await resolvePractitionerId(profileId);
  if (profileId && !practitionerId) {
    return [];
  }

  let query = supabase
    .from("practitioner_bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (practitionerId) {
    query = query.eq("practitioner_id", practitionerId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[practitionerBookings] fetch rows:", error.message);
    return [];
  }
  return (data ?? []) as DbBookingRow[];
}

/** @deprecated Ledger sync runs on the server via /api/wallet/practitioner/sync. */
export async function syncEarningsFromBookings(
  _bookings: DbBookingRow[],
  _commissionRate: number
): Promise<void> {
  return;
}
