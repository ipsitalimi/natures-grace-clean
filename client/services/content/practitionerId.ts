import { getSupabase } from "@/lib/supabase";

let cachedPractitionerId: string | null = null;

export type PractitionerProfileSummary = {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
};

let cachedProfile: PractitionerProfileSummary | null = null;

/** Practitioner row linked to the signed-in profile — no global fallback. */
export async function resolvePractitionerId(
  profileId?: string | null
): Promise<string | null> {
  if (!profileId) return null;
  if (cachedPractitionerId) return cachedPractitionerId;

  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: linked } = await supabase
    .from("practitioners")
    .select("id")
    .eq("profile_id", profileId)
    .eq("is_active", true)
    .maybeSingle();

  if (linked?.id) {
    cachedPractitionerId = linked.id as string;
    return cachedPractitionerId;
  }

  return null;
}

export async function fetchPractitionerProfile(
  profileId?: string | null
): Promise<PractitionerProfileSummary | null> {
  const id = await resolvePractitionerId(profileId);
  if (!id) return null;
  if (cachedProfile?.id === id) return cachedProfile;

  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("practitioners")
    .select("id, name, rating, review_count")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  cachedProfile = {
    id: data.id as string,
    name: data.name as string,
    rating: Number(data.rating),
    reviewCount: Number(data.review_count),
  };
  return cachedProfile;
}

export function clearPractitionerIdCache(): void {
  cachedPractitionerId = null;
  cachedProfile = null;
}

export type PractitionerProfileDetails = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  bio: string;
  experience: string;
  certifications: string[];
  pricePerSession: number;
  isActive: boolean;
  meetingLink: string;
  photoUrl: string;
};

export async function fetchPractitionerProfileDetails(
  profileId?: string | null
): Promise<PractitionerProfileDetails | null> {
  const id = await resolvePractitionerId(profileId);
  if (!id) return null;

  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("practitioners")
    .select(
      "id, name, category, subcategory, bio, experience, certifications, price_per_session, is_active, meeting_link, photo_url"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    name: data.name as string,
    category: (data.category as string) ?? "",
    subcategory: (data.subcategory as string) ?? "",
    bio: (data.bio as string) ?? "",
    experience: (data.experience as string) ?? "",
    certifications: (data.certifications as string[]) ?? [],
    pricePerSession: Number(data.price_per_session) || 0,
    isActive: Boolean(data.is_active),
    meetingLink: (data.meeting_link as string) ?? "",
    photoUrl: (data.photo_url as string) ?? "",
  };
}

export async function updatePractitionerProfileDetails(
  profileId: string | null | undefined,
  patch: Partial<{
    name: string;
    bio: string;
    experience: string;
    certifications: string[];
    pricePerSession: number;
    isActive: boolean;
    meetingLink: string;
    photoUrl: string;
  }>
): Promise<{ error?: string }> {
  const id = await resolvePractitionerId(profileId);
  if (!id) return { error: "Practitioner profile not found" };

  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase not configured" };

  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.bio !== undefined) dbPatch.bio = patch.bio;
  if (patch.experience !== undefined) dbPatch.experience = patch.experience;
  if (patch.certifications !== undefined) dbPatch.certifications = patch.certifications;
  if (patch.pricePerSession !== undefined) dbPatch.price_per_session = patch.pricePerSession;
  if (patch.isActive !== undefined) dbPatch.is_active = patch.isActive;
  if (patch.meetingLink !== undefined) dbPatch.meeting_link = patch.meetingLink.trim() || null;
  if (patch.photoUrl !== undefined) dbPatch.photo_url = patch.photoUrl.trim() || null;

  const { error } = await supabase.from("practitioners").update(dbPatch).eq("id", id);
  if (error) return { error: error.message };

  cachedProfile = null;
  return {};
}
