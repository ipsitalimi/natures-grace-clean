import { getSupabase } from "@/lib/supabase";

let cachedPractitionerId: { profileId: string; id: string } | null = null;

export type PractitionerProfileSummary = {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
};

let cachedProfile: PractitionerProfileSummary | null = null;

export type PractitionerProvisionErrorCode =
  | "not_configured"
  | "rpc_missing"
  | "not_authenticated"
  | "not_practitioner"
  | "profile_not_found"
  | "provision_failed"
  | "lookup_failed";

export type EnsurePractitionerProfileResult =
  | { ok: true; practitionerId: string; created: boolean }
  | { ok: false; code: PractitionerProvisionErrorCode; error: string };

let lastProvisionError: Extract<EnsurePractitionerProfileResult, { ok: false }> | null =
  null;

export function consumeLastPractitionerProvisionError(): EnsurePractitionerProfileResult | null {
  const err = lastProvisionError;
  lastProvisionError = null;
  return err;
}

export function peekLastPractitionerProvisionError(): EnsurePractitionerProfileResult | null {
  return lastProvisionError;
}

function classifyRpcError(message: string): PractitionerProvisionErrorCode {
  const lower = message.toLowerCase();
  if (
    lower.includes("could not find the function") ||
    lower.includes("schema cache") ||
    lower.includes("pgrst202")
  ) {
    return "rpc_missing";
  }
  if (lower.includes("not_authenticated")) return "not_authenticated";
  if (lower.includes("not_practitioner")) return "not_practitioner";
  if (lower.includes("profile_not_found")) return "profile_not_found";
  return "provision_failed";
}

function provisionErrorMessage(
  code: PractitionerProvisionErrorCode,
  hint?: string
): string {
  switch (code) {
    case "not_configured":
      return "Supabase is not configured. Practitioner profile cannot be initialized.";
    case "rpc_missing":
      return (
        "Practitioner profile setup is not available: the database function " +
        "ensure_practitioner_profile is missing. Apply migrations " +
        "052_ensure_practitioner_profile.sql and " +
        "053_ensure_practitioner_profile_role_sync.sql and " +
        "054_practitioner_specialties.sql to your Supabase project " +
        "(supabase db push or SQL Editor), then reload the app."
      );
    case "not_authenticated":
      return "Sign in to initialize your practitioner profile.";
    case "not_practitioner":
      return (
        "Your account does not have the Practitioner role. Complete practitioner approval " +
        "or ask an admin to assign the Practitioner role." +
        (hint ? ` ${hint}` : "")
      );
    case "profile_not_found":
      return "Your user profile was not found. Try signing out and back in.";
    case "lookup_failed":
      return "Could not look up your practitioner profile.";
    default:
      return "Could not initialize your practitioner profile. Try again or contact support.";
  }
}

async function lookupActivePractitionerId(profileId: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("practitioners")
    .select("id")
    .eq("profile_id", profileId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    lastProvisionError = {
      ok: false,
      code: "lookup_failed",
      error: provisionErrorMessage("lookup_failed"),
    };
    console.warn("[practitionerId] active lookup:", error.message);
    return null;
  }

  return (data as { id: string } | null)?.id ?? null;
}

async function lookupOwnPractitionerId(profileId: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("practitioners")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    console.warn("[practitionerId] own lookup:", error.message);
    return null;
  }

  return (data as { id: string } | null)?.id ?? null;
}

/** True when the signed-in user may self-provision a practitioner row. */
export async function canSelfProvisionPractitionerProfile(
  profileId?: string | null
): Promise<boolean> {
  if (!profileId) return false;

  const supabase = getSupabase();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || user.id !== profileId) return false;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle();

  if (profileError) {
    console.warn("[practitionerId] role lookup:", profileError.message);
    return false;
  }

  if ((profile as { role?: string } | null)?.role === "Practitioner") {
    return true;
  }

  const { data: approvedApp, error: appError } = await supabase
    .from("role_applications")
    .select("id")
    .eq("user_id", profileId)
    .eq("target_role", "Practitioner")
    .eq("status", "Approved")
    .limit(1)
    .maybeSingle();

  if (appError) {
    console.warn("[practitionerId] application lookup:", appError.message);
    return false;
  }

  return Boolean(approvedApp);
}

/**
 * Creates practitioners + wallet rows when the signed-in user has Practitioner role
 * but no row exists. Requires migrations 052–053 (ensure_practitioner_profile RPC).
 */
export async function ensurePractitionerProfile(): Promise<EnsurePractitionerProfileResult> {
  const supabase = getSupabase();
  if (!supabase) {
    const result = {
      ok: false as const,
      code: "not_configured" as const,
      error: provisionErrorMessage("not_configured"),
    };
    lastProvisionError = result;
    return result;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    const result = {
      ok: false as const,
      code: "not_authenticated" as const,
      error: provisionErrorMessage("not_authenticated"),
    };
    lastProvisionError = result;
    return result;
  }

  const existingId = await lookupOwnPractitionerId(user.id);
  if (existingId) {
    lastProvisionError = null;
    return { ok: true, practitionerId: existingId, created: false };
  }

  const mayProvision = await canSelfProvisionPractitionerProfile(user.id);
  if (!mayProvision) {
    const result = {
      ok: false as const,
      code: "not_practitioner" as const,
      error: provisionErrorMessage("not_practitioner"),
    };
    lastProvisionError = result;
    return result;
  }

  const { data, error } = await supabase.rpc("ensure_practitioner_profile");

  if (error) {
    const code = classifyRpcError(error.message);
    const notPractitionerHint =
      code === "not_practitioner"
        ? "If your application was already approved, ensure migrations 053 and 054 are applied on Supabase and try again."
        : undefined;
    const result = {
      ok: false as const,
      code,
      error: provisionErrorMessage(code, notPractitionerHint),
    };
    lastProvisionError = result;
    if (code !== "not_practitioner") {
      console.error("[practitionerId] ensure profile:", error.message);
    }
    return result;
  }

  const practitionerId = (data as string | null) ?? null;
  if (!practitionerId) {
    const result = {
      ok: false as const,
      code: "provision_failed" as const,
      error: provisionErrorMessage("provision_failed"),
    };
    lastProvisionError = result;
    return result;
  }

  lastProvisionError = null;
  return { ok: true, practitionerId, created: true };
}

/** Practitioner row linked to the signed-in profile — no global fallback. */
export async function resolvePractitionerId(
  profileId?: string | null
): Promise<string | null> {
  if (!profileId) return null;
  if (cachedPractitionerId?.profileId === profileId) return cachedPractitionerId.id;

  let id = await lookupActivePractitionerId(profileId);
  if (!id) {
    const mayProvision = await canSelfProvisionPractitionerProfile(profileId);
    if (mayProvision) {
      const ensured = await ensurePractitionerProfile();
      if (ensured.ok) {
        id = ensured.practitionerId;
      }
      // keep lastProvisionError from ensure for practitioner-facing screens
    }

    if (!id) {
      id = await lookupActivePractitionerId(profileId);
      if (!id) {
        const ownId = await lookupOwnPractitionerId(profileId);
        if (ownId) {
          id = ownId;
          lastProvisionError = null;
        }
      }
    }
  } else {
    lastProvisionError = null;
  }

  if (id) {
    cachedPractitionerId = { profileId, id };
    return id;
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
  lastProvisionError = null;
}

export type PractitionerProfileDetails = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  specialties: { category: string; subcategory: string }[];
  bio: string;
  experience: string;
  certifications: string[];
  pricePerSession: number;
  isActive: boolean;
  meetingLink: string;
  photoUrl: string;
};

export type FetchPractitionerProfileDetailsResult =
  | { ok: true; profile: PractitionerProfileDetails }
  | { ok: false; error: string; code?: PractitionerProvisionErrorCode };

export async function fetchPractitionerProfileDetails(
  profileId?: string | null
): Promise<PractitionerProfileDetails | null> {
  const result = await fetchPractitionerProfileDetailsResult(profileId);
  return result.ok ? result.profile : null;
}

export async function fetchPractitionerProfileDetailsResult(
  profileId?: string | null
): Promise<FetchPractitionerProfileDetailsResult> {
  if (!profileId) {
    return { ok: false, error: "No signed-in profile.", code: "profile_not_found" };
  }

  const resolvedId = await resolvePractitionerId(profileId);
  if (!resolvedId) {
    const provision = peekLastPractitionerProvisionError();
    if (provision && !provision.ok) {
      return { ok: false, error: provision.error, code: provision.code };
    }
    return {
      ok: false,
      error:
        "Your practitioner profile has not been set up yet. Complete practitioner approval or contact support.",
      code: "provision_failed",
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, error: provisionErrorMessage("not_configured"), code: "not_configured" };
  }

  const { data, error } = await supabase
    .from("practitioners")
    .select(
      "id, name, category, subcategory, specialties, bio, experience, certifications, price_per_session, is_active, meeting_link, photo_url"
    )
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message, code: "lookup_failed" };
  }
  if (!data) {
    return {
      ok: false,
      error: provisionErrorMessage("provision_failed"),
      code: "provision_failed",
    };
  }

  const specialtiesRaw = (data as { specialties?: { category: string; subcategory: string }[] })
    .specialties;
  const specialties =
    Array.isArray(specialtiesRaw) && specialtiesRaw.length > 0
      ? specialtiesRaw
          .map((s) => ({
            category: String(s.category ?? "").trim(),
            subcategory: String(s.subcategory ?? "").trim(),
          }))
          .filter((s) => s.category && s.subcategory)
      : data.category && data.subcategory
        ? [{ category: data.category as string, subcategory: data.subcategory as string }]
        : [];

  return {
    ok: true,
    profile: {
      id: data.id as string,
      name: data.name as string,
      category: (data.category as string) ?? "",
      subcategory: (data.subcategory as string) ?? "",
      specialties,
      bio: (data.bio as string) ?? "",
      experience: (data.experience as string) ?? "",
      certifications: (data.certifications as string[]) ?? [],
      pricePerSession: Number(data.price_per_session) || 0,
      isActive: Boolean(data.is_active),
      meetingLink: (data.meeting_link as string) ?? "",
      photoUrl: (data.photo_url as string) ?? "",
    },
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
): Promise<{ error?: string; code?: PractitionerProvisionErrorCode }> {
  if (!profileId) return { error: "Practitioner profile not found", code: "profile_not_found" };

  const resolvedId = await resolvePractitionerId(profileId);
  if (!resolvedId) {
    const provision = peekLastPractitionerProvisionError();
    if (provision && !provision.ok) {
      return { error: provision.error, code: provision.code };
    }
    return { error: "Practitioner profile not found", code: "provision_failed" };
  }

  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase not configured", code: "not_configured" };

  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.bio !== undefined) dbPatch.bio = patch.bio;
  if (patch.experience !== undefined) dbPatch.experience = patch.experience;
  if (patch.certifications !== undefined) dbPatch.certifications = patch.certifications;
  if (patch.pricePerSession !== undefined) dbPatch.price_per_session = patch.pricePerSession;
  if (patch.isActive !== undefined) dbPatch.is_active = patch.isActive;
  if (patch.meetingLink !== undefined) dbPatch.meeting_link = patch.meetingLink.trim() || null;
  if (patch.photoUrl !== undefined) dbPatch.photo_url = patch.photoUrl.trim() || null;

  const { error } = await supabase
    .from("practitioners")
    .update(dbPatch)
    .eq("id", resolvedId);

  if (error) return { error: error.message, code: "lookup_failed" };

  cachedPractitionerId = null;
  cachedProfile = null;
  return {};
}
