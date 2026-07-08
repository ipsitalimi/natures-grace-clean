import type {
  OfferingAvailabilityInput,
  SessionOffering,
} from "@/data/practitionerBookings";
import { getSupabase } from "@/lib/supabase";
import { saveAvailabilityForOffering } from "@/services/content/practitionerAvailabilityService";
import { resolvePractitionerId } from "@/services/content/practitionerId";

export type DbOfferingRow = {
  id: string;
  practitioner_id: string | null;
  session_type: string;
  duration_minutes: number;
  price: number;
  notes: string | null;
  is_active: boolean;
};

function mapOffering(row: DbOfferingRow): SessionOffering {
  return {
    id: row.id,
    sessionType: row.session_type,
    duration: Number(row.duration_minutes),
    price: Number(row.price),
    notes: row.notes ?? "",
  };
}

export async function fetchOfferingsForPractitioner(
  practitionerId: string
): Promise<SessionOffering[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("practitioner_offerings")
    .select("*")
    .eq("practitioner_id", practitionerId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[practitionerOfferings] fetch by practitioner:", error.message);
    return [];
  }
  return ((data ?? []) as DbOfferingRow[]).map(mapOffering);
}

export async function fetchOfferings(
  profileId?: string | null
): Promise<SessionOffering[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const practitionerId = await resolvePractitionerId(profileId);
  if (profileId && !practitionerId) {
    return [];
  }

  let query = supabase
    .from("practitioner_offerings")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (practitionerId) {
    query = query.eq("practitioner_id", practitionerId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[practitionerOfferings] fetch:", error.message);
    return [];
  }
  return ((data ?? []) as DbOfferingRow[]).map(mapOffering);
}

export async function upsertOffering(
  offering: SessionOffering,
  profileId?: string | null,
  availability?: OfferingAvailabilityInput
): Promise<SessionOffering | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const practitionerId = await resolvePractitionerId(profileId);
  if (!practitionerId) {
    console.error("[practitionerOfferings] upsert: practitioner profile not provisioned");
    return null;
  }
  const payload = {
    practitioner_id: practitionerId,
    session_type: offering.sessionType,
    duration_minutes: offering.duration,
    price: offering.price,
    notes: offering.notes,
    is_active: true,
  };

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      offering.id
    );

  if (isUuid) {
    const { data, error } = await supabase
      .from("practitioner_offerings")
      .update(payload)
      .eq("id", offering.id)
      .select()
      .single();
    if (error) {
      console.error("[practitionerOfferings] update:", error.message);
      return null;
    }
    const mapped = mapOffering(data as DbOfferingRow);
    if (availability) {
      await saveAvailabilityForOffering(mapped.id, availability, profileId);
    }
    return mapped;
  }

  const { data, error } = await supabase
    .from("practitioner_offerings")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("[practitionerOfferings] insert:", error.message);
    return null;
  }
  const mapped = mapOffering(data as DbOfferingRow);
  if (availability) {
    await saveAvailabilityForOffering(mapped.id, availability, profileId);
  }
  return mapped;
}

export async function deleteOffering(offeringId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("practitioner_offerings")
    .update({ is_active: false })
    .eq("id", offeringId);

  if (error) {
    console.error("[practitionerOfferings] delete:", error.message);
    return false;
  }
  return true;
}
