import { getSupabase } from "@/lib/supabase";

export type ScheduleSlot = {
  practitionerId: string;
  practitionerName: string;
  offeringId?: string;
  sessionType?: string;
  date: string | null;
  startTime: string;
  endTime: string;
  alwaysAvailable: boolean;
};

type DbAvailabilityRow = {
  id: string;
  practitioner_id: string | null;
  offering_id: string | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
  is_available: boolean;
  metadata: Record<string, unknown> | null;
};

function normalizeDateKey(value: string | null): string | null {
  if (!value) return null;
  // DB may return timestamptz or date; keep YYYY-MM-DD
  return value.slice(0, 10);
}

/**
 * Admin schedule: all active/approved practitioners + their availability windows.
 * Does not change availability write rules — read/normalize only.
 */
export async function fetchAdminPractitionerSchedule(): Promise<ScheduleSlot[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const [practitionersRes, availabilityRes, offeringsRes] = await Promise.all([
    supabase
      .from("practitioners")
      .select("id, name, approval_status, is_active")
      .eq("is_active", true)
      .order("name"),
    supabase.from("practitioner_availability").select("*").eq("is_available", true),
    supabase.from("practitioner_offerings").select("id, session_type").eq("is_active", true),
  ]);

  if (practitionersRes.error) {
    console.error("[adminSchedule] practitioners:", practitionersRes.error.message);
    throw new Error(practitionersRes.error.message);
  }
  if (availabilityRes.error) {
    console.error("[adminSchedule] availability:", availabilityRes.error.message);
    throw new Error(availabilityRes.error.message);
  }

  const practitioners = (practitionersRes.data ?? []) as {
    id: string;
    name: string;
    approval_status: string | null;
    is_active: boolean;
  }[];

  const active = practitioners.filter(
    (p) =>
      !p.approval_status ||
      p.approval_status === "Approved" ||
      p.approval_status.toLowerCase() === "approved"
  );

  const nameById = new Map(active.map((p) => [p.id, p.name]));
  const activeIds = new Set(active.map((p) => p.id));

  const sessionTypeByOffering = new Map<string, string>();
  for (const row of (offeringsRes.data ?? []) as { id: string; session_type: string }[]) {
    sessionTypeByOffering.set(row.id, row.session_type);
  }

  const slots: ScheduleSlot[] = [];

  for (const row of (availabilityRes.data ?? []) as DbAvailabilityRow[]) {
    const practitionerId = row.practitioner_id;
    if (!practitionerId || !activeIds.has(practitionerId)) continue;

    const metaAlways =
      (row.metadata as { alwaysAvailable?: boolean } | null)?.alwaysAvailable === true;
    const alwaysAvailable = metaAlways || !row.specific_date;

    slots.push({
      practitionerId,
      practitionerName: nameById.get(practitionerId) ?? "Practitioner",
      offeringId: row.offering_id ?? undefined,
      sessionType: row.offering_id
        ? sessionTypeByOffering.get(row.offering_id)
        : undefined,
      date: alwaysAvailable ? null : normalizeDateKey(row.specific_date),
      startTime: row.start_time,
      endTime: row.end_time,
      alwaysAvailable,
    });
  }

  return slots;
}

/** Slots that apply on a given local YYYY-MM-DD date. */
export function slotsForDate(slots: ScheduleSlot[], dateKey: string): ScheduleSlot[] {
  return slots.filter(
    (s) => s.alwaysAvailable || (s.date != null && s.date === dateKey)
  );
}

export function uniquePractitionersOnDate(
  slots: ScheduleSlot[],
  dateKey: string
): { practitionerId: string; practitionerName: string; windows: ScheduleSlot[] }[] {
  const forDay = slotsForDate(slots, dateKey);
  const byId = new Map<
    string,
    { practitionerId: string; practitionerName: string; windows: ScheduleSlot[] }
  >();

  for (const slot of forDay) {
    const existing = byId.get(slot.practitionerId);
    if (existing) {
      existing.windows.push(slot);
    } else {
      byId.set(slot.practitionerId, {
        practitionerId: slot.practitionerId,
        practitionerName: slot.practitionerName,
        windows: [slot],
      });
    }
  }

  return [...byId.values()].sort((a, b) =>
    a.practitionerName.localeCompare(b.practitionerName)
  );
}
