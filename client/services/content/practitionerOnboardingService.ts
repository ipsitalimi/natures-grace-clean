import { getSupabase } from "@/lib/supabase";
import { resolvePractitionerId } from "@/services/content/practitionerId";

export type PractitionerOnboardingState = {
  practitionerId: string;
  name: string;
  bio: string;
  pricePerSession: number;
  meetingLink: string;
  onboardingComplete: boolean;
};

function parseOnboardingComplete(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  return (metadata as { onboarding_complete?: boolean }).onboarding_complete === true;
}

export function isPractitionerOnboardingComplete(state: PractitionerOnboardingState): boolean {
  if (state.onboardingComplete) return true;
  return state.bio.trim().length > 20 && state.pricePerSession > 0;
}

export async function fetchPractitionerOnboardingState(
  profileId: string
): Promise<{ ok: true; state: PractitionerOnboardingState } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const practitionerId = await resolvePractitionerId(profileId);
  if (!practitionerId) {
    return { ok: false, error: "Practitioner profile not found." };
  }

  const { data, error } = await supabase
    .from("practitioners")
    .select("id, name, bio, price_per_session, meeting_link, metadata")
    .eq("id", practitionerId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not load practitioner profile." };
  }

  return {
    ok: true,
    state: {
      practitionerId: data.id as string,
      name: (data.name as string) ?? "",
      bio: (data.bio as string) ?? "",
      pricePerSession: Number(data.price_per_session) || 0,
      meetingLink: (data.meeting_link as string) ?? "",
      onboardingComplete: parseOnboardingComplete(data.metadata),
    },
  };
}

export async function completePractitionerOnboarding(
  profileId: string,
  input: {
    name: string;
    bio: string;
    pricePerSession: number;
    meetingLink?: string;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const practitionerId = await resolvePractitionerId(profileId);
  if (!practitionerId) {
    return { ok: false, error: "Practitioner profile not found." };
  }

  const { data: existing } = await supabase
    .from("practitioners")
    .select("metadata")
    .eq("id", practitionerId)
    .maybeSingle();

  const priorMeta =
    existing?.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
      ? (existing.metadata as Record<string, unknown>)
      : {};

  const { error } = await supabase
    .from("practitioners")
    .update({
      name: input.name.trim(),
      bio: input.bio.trim(),
      price_per_session: input.pricePerSession,
      meeting_link: input.meetingLink?.trim() || null,
      metadata: { ...priorMeta, onboarding_complete: true },
    })
    .eq("id", practitionerId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
