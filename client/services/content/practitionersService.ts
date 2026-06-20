import { getSupabase } from "@/lib/supabase";
import type { Practitioner } from "@/data/practitioners";
import { practitionerRowToPractitioner, type DbPractitionerRow } from "@/services/content/types";

export async function fetchPractitioners(): Promise<Practitioner[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("practitioners")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("[practitionersService] fetch:", error.message);
    return [];
  }
  return ((data ?? []) as DbPractitionerRow[]).map(practitionerRowToPractitioner);
}

export async function insertPractitioner(
  practitioner: Omit<Practitioner, "id" | "photo" | "localPhoto" | "reviewCount" | "availability"> & {
    id?: string;
    profileId?: string;
  }
): Promise<Practitioner | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const row: Record<string, unknown> = {
    name: practitioner.name,
    category: practitioner.category,
    subcategory: practitioner.subcategory ?? "",
    bio: practitioner.bio ?? "",
    experience: practitioner.experience,
    certifications: practitioner.certifications ?? [],
    rating: practitioner.rating ?? 5,
    review_count: 0,
    price_per_session: practitioner.pricePerSession,
    approval_status: practitioner.approvalStatus ?? "Approved",
    is_verified: practitioner.isVerified ?? false,
    featured: practitioner.featured ?? false,
    is_active: true,
  };
  if (practitioner.profileId) {
    row.profile_id = practitioner.profileId;
  }

  const { data, error } = await supabase.from("practitioners").insert(row).select().single();

  if (error) {
    console.error("[practitionersService] insert:", error.message);
    return null;
  }
  return practitionerRowToPractitioner(data as DbPractitionerRow);
}

export async function updatePractitioner(
  id: string,
  patch: Partial<{
    name: string;
    bio: string;
    experience: string;
    certifications: string[];
    price_per_session: number;
    is_active: boolean;
    approval_status: string;
    is_verified: boolean;
    featured: boolean;
  }>
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("practitioners").update(patch).eq("id", id);
  if (error) {
    console.error("[practitionersService] update:", error.message);
    return false;
  }
  return true;
}

export async function deletePractitioner(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("practitioners").update({ is_active: false }).eq("id", id);
  if (error) console.error("[practitionersService] delete:", error.message);
  return !error;
}

export async function countPractitioners(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("practitioners")
    .select("*", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}
