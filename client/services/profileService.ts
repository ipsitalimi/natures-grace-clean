import { getSupabase } from "@/lib/supabase";
import type { ProfileRow, UserRole, AccountStatus } from "@/types/database";
import type { AdminUser } from "@/data/adminMockData";
import type { ProfilePreferences } from "@/types/profilePreferences";
import { parseProfilePreferences } from "@/types/profilePreferences";

export async function fetchProfileByEmail(email: string): Promise<ProfileRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    console.error("[profileService] fetchProfileByEmail:", error.message);
    return null;
  }
  return data as ProfileRow | null;
}

export async function fetchProfileByUserId(userId: string): Promise<ProfileRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[profileService] fetchProfileByUserId:", error.message);
    return null;
  }
  return data as ProfileRow | null;
}

export async function fetchAllProfiles(): Promise<ProfileRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[profileService] fetchAllProfiles:", error.message);
    return [];
  }
  return (data ?? []) as ProfileRow[];
}

/** Count of non-admin accounts with Active status (Admin Community “Active Members”). */
export type ActiveCommunityMemberCountResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

export async function fetchActiveCommunityMemberCount(): Promise<ActiveCommunityMemberCountResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, error: "Supabase not configured" };
  }

  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("status", "Active")
    .in("role", ["User", "Practitioner", "Seller"]);

  if (error) {
    console.error("[profileService] fetchActiveCommunityMemberCount:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, count: count ?? 0 };
}

export async function updateProfile(
  userId: string,
  patch: Partial<
    Pick<ProfileRow, "full_name" | "role" | "status" | "phone" | "preferences" | "avatar_url">
  >
): Promise<{ error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const safePatch = { ...patch };
  if (user) {
    const { data: self } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if ((self as { role?: string } | null)?.role !== "Admin") {
      delete safePatch.role;
      delete safePatch.status;
    }
  } else {
    delete safePatch.role;
    delete safePatch.status;
  }

  const { error } = await supabase.from("profiles").update(safePatch).eq("id", userId);

  if (error) return { error: error.message };
  return {};
}

export async function updateProfilePreferences(
  userId: string,
  patch: Partial<ProfilePreferences>
): Promise<{ error?: string; preferences?: ProfilePreferences }> {
  const current = await fetchProfileByUserId(userId);
  if (!current) return { error: "Profile not found" };

  const next = {
    ...parseProfilePreferences(current.preferences),
    ...patch,
  };

  const result = await updateProfile(userId, { preferences: next });
  if (result.error) return result;
  return { preferences: next };
}

export function profileToAdminUser(row: ProfileRow): AdminUser {
  const joined = new Date(row.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return {
    id: row.id,
    name: row.full_name || row.email.split("@")[0],
    email: row.email,
    status: row.status as AdminUser["status"],
    role: row.role as AdminUser["role"],
    joinedDate: joined,
    phone: row.phone ?? "",
    sessionsCount: 0,
  };
}

export type { UserRole, AccountStatus };
