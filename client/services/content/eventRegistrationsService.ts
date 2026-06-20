import type { EventRegistration, EventRegistrationInput } from "@/data/eventRegistrations";
import { getSupabase } from "@/lib/supabase";

export type DbEventRegistrationRow = {
  id: string;
  event_id: string;
  user_id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone: string;
  message: string;
  status: EventRegistration["status"];
  payment_status: EventRegistration["paymentStatus"];
  razorpay_payment_id: string | null;
  amount_paid: number | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: DbEventRegistrationRow): EventRegistration {
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    attendeeName: row.attendee_name,
    attendeeEmail: row.attendee_email,
    attendeePhone: row.attendee_phone,
    message: row.message ?? "",
    status: row.status,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
  };
}

export async function fetchMyRegistrations(): Promise<EventRegistration[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("event_registrations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[eventRegistrationsService] fetch mine:", error.message);
    throw new Error(error.message);
  }

  return ((data ?? []) as DbEventRegistrationRow[]).map(mapRow);
}

export async function fetchRegistrationsForEvent(
  eventDbId: string
): Promise<EventRegistration[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("event_registrations")
    .select("*")
    .eq("event_id", eventDbId)
    .eq("status", "Registered")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[eventRegistrationsService] fetch for event:", error.message);
    throw new Error(error.message);
  }

  return ((data ?? []) as DbEventRegistrationRow[]).map(mapRow);
}

export async function fetchAllActiveRegistrations(): Promise<EventRegistration[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("event_registrations")
    .select("*")
    .eq("status", "Registered")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[eventRegistrationsService] fetch all:", error.message);
    throw new Error(error.message);
  }

  return ((data ?? []) as DbEventRegistrationRow[]).map(mapRow);
}

export async function registerForEvent(
  input: EventRegistrationInput
): Promise<EventRegistration | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("event_registrations")
    .insert({
      event_id: input.eventDbId,
      user_id: user.id,
      attendee_name: input.attendeeName.trim(),
      attendee_email: input.attendeeEmail.trim(),
      attendee_phone: input.attendeePhone.trim(),
      message: input.message?.trim() ?? "",
      status: "Registered",
      payment_status: "None",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("You are already registered for this event.");
    }
    console.error("[eventRegistrationsService] register:", error.message);
    return null;
  }

  return mapRow(data as DbEventRegistrationRow);
}

export async function cancelRegistration(registrationId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("event_registrations")
    .update({ status: "Cancelled" })
    .eq("id", registrationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[eventRegistrationsService] cancel:", error.message);
    return false;
  }
  return true;
}

export function countRegistrationsByEvent(
  registrations: EventRegistration[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of registrations) {
    if (r.status !== "Registered") continue;
    counts.set(r.eventId, (counts.get(r.eventId) ?? 0) + 1);
  }
  return counts;
}
