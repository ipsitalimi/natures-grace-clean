import type { OfferingAvailabilityInput, OfferingAvailabilityState } from "@/data/practitionerBookings";
import { getSupabase } from "@/lib/supabase";
import { resolvePractitionerId } from "@/services/content/practitionerId";

type DbAvailabilityRow = {
  id: string;
  practitioner_id: string | null;
  offering_id: string | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
  is_available: boolean;
  timing_mode: string | null;
  metadata: Record<string, unknown> | null;
};

const EMPTY: OfferingAvailabilityState = {
  alwaysAvailable: true,
  selectedDates: [],
  timingMode: "same",
  globalTiming: { start: "9:00 AM", end: "5:00 PM" },
  dateTimings: {},
};

export async function fetchAvailabilityForOffering(
  offeringId: string
): Promise<OfferingAvailabilityState> {
  const supabase = getSupabase();
  if (!supabase) return { ...EMPTY };

  const { data, error } = await supabase
    .from("practitioner_availability")
    .select("*")
    .eq("offering_id", offeringId);

  if (error || !data?.length) {
    return { ...EMPTY };
  }

  const rows = data as DbAvailabilityRow[];
  const metaRow = rows.find(
    (r) => (r.metadata as { alwaysAvailable?: boolean })?.alwaysAvailable === true
  );
  if (metaRow || rows.some((r) => !r.specific_date && r.is_available)) {
    const timingMode = (rows[0]?.timing_mode as "same" | "custom") ?? "same";
    const global = rows.find((r) => !r.specific_date);
    return {
      alwaysAvailable: true,
      selectedDates: [],
      timingMode,
      globalTiming: {
        start: global?.start_time ?? "9:00 AM",
        end: global?.end_time ?? "5:00 PM",
      },
      dateTimings: {},
    };
  }

  const dated = rows.filter((r) => r.specific_date);
  const timingMode = (dated[0]?.timing_mode as "same" | "custom") ?? "same";
  const selectedDates = dated.map((r) => r.specific_date as string);
  const dateTimings: Record<string, { start: string; end: string }> = {};
  for (const r of dated) {
    if (r.specific_date) {
      dateTimings[r.specific_date] = { start: r.start_time, end: r.end_time };
    }
  }

  const first = dated[0];
  return {
    alwaysAvailable: false,
    selectedDates,
    timingMode,
    globalTiming: {
      start: first?.start_time ?? "9:00 AM",
      end: first?.end_time ?? "5:00 PM",
    },
    dateTimings,
  };
}

export async function saveAvailabilityForOffering(
  offeringId: string,
  input: OfferingAvailabilityInput,
  profileId?: string | null
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const practitionerId = await resolvePractitionerId(profileId);

  await supabase.from("practitioner_availability").delete().eq("offering_id", offeringId);

  if (input.alwaysAvailable) {
    await supabase.from("practitioner_availability").insert({
      practitioner_id: practitionerId,
      offering_id: offeringId,
      start_time: input.globalTiming.start,
      end_time: input.globalTiming.end,
      is_available: true,
      timing_mode: input.timingMode,
      metadata: { alwaysAvailable: true },
    });
    return;
  }

  const rows = input.selectedDates.map((dateKey) => {
    const slot =
      input.timingMode === "custom" && input.dateTimings[dateKey]
        ? input.dateTimings[dateKey]
        : input.globalTiming;
    return {
      practitioner_id: practitionerId,
      offering_id: offeringId,
      specific_date: dateKey,
      start_time: slot.start,
      end_time: slot.end,
      is_available: true,
      timing_mode: input.timingMode,
      metadata: {},
    };
  });

  if (rows.length) {
    await supabase.from("practitioner_availability").insert(rows);
  }
}
