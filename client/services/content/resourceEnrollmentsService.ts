import type { ResourceEnrollment } from "@/data/resourceEnrollments";
import { getSupabase } from "@/lib/supabase";

export type DbResourceEnrollmentRow = {
  id: string;
  resource_id: string;
  user_id: string;
  status: ResourceEnrollment["status"];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function mapRow(row: DbResourceEnrollmentRow): ResourceEnrollment {
  return {
    id: row.id,
    resourceId: row.resource_id,
    userId: row.user_id,
    status: row.status,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchMyEnrollments(): Promise<ResourceEnrollment[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("resource_enrollments")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[resourceEnrollmentsService] fetch mine:", error.message);
    throw new Error(error.message);
  }

  return ((data ?? []) as DbResourceEnrollmentRow[]).map(mapRow);
}

export async function enrollForResource(resourceId: string): Promise<ResourceEnrollment | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("resource_enrollments")
    .insert({
      resource_id: resourceId,
      user_id: user.id,
      status: "Enrolled",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("You are already enrolled in this course.");
    }
    console.error("[resourceEnrollmentsService] enroll:", error.message);
    throw new Error(error.message);
  }

  return mapRow(data as DbResourceEnrollmentRow);
}

export async function cancelEnrollmentForResource(resourceId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("resource_enrollments")
    .update({ status: "Cancelled" })
    .eq("resource_id", resourceId)
    .eq("user_id", user.id)
    .eq("status", "Enrolled")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[resourceEnrollmentsService] cancel:", error.message);
    throw new Error(error.message);
  }
  return Boolean(data?.id);
}

export type AdminCourseInterest = {
  id: string;
  resourceId: string;
  userId: string;
  status: ResourceEnrollment["status"];
  createdAt: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string | null;
};

/** Admin-only listing. RLS on resource_enrollments and profiles remains authoritative. */
export async function fetchActiveCourseInterestsForAdmin(): Promise<AdminCourseInterest[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("resource_enrollments")
    .select("id, resource_id, user_id, status, created_at")
    .eq("status", "Enrolled")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[resourceEnrollmentsService] admin course interests:", error.message);
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<{
    id: string; resource_id: string; user_id: string; status: ResourceEnrollment["status"]; created_at: string;
  }>;
  const userIds = Array.from(new Set(rows.map((row) => row.user_id)));
  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone")
    .in("id", userIds);
  if (profilesError) {
    console.error("[resourceEnrollmentsService] admin course interest profiles:", profilesError.message);
    throw new Error(profilesError.message);
  }

  const profileById = new Map(
    ((profiles ?? []) as Array<{ id: string; full_name: string; email: string; phone: string | null }>)
      .map((profile) => [profile.id, profile])
  );
  return rows.map((row) => {
    const profile = profileById.get(row.user_id);
    return {
      id: row.id,
      resourceId: row.resource_id,
      userId: row.user_id,
      status: row.status,
      createdAt: row.created_at,
      attendeeName: profile?.full_name?.trim() || "Nature's Grace user",
      attendeeEmail: profile?.email ?? "",
      attendeePhone: profile?.phone ?? null,
    };
  });
}

export function activeEnrollmentResourceIds(enrollments: ResourceEnrollment[]): Set<string> {
  const ids = new Set<string>();
  for (const row of enrollments) {
    if (row.status === "Enrolled") ids.add(row.resourceId);
  }
  return ids;
}
