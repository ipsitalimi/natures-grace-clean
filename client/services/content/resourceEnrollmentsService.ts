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

  const { error } = await supabase
    .from("resource_enrollments")
    .update({ status: "Cancelled" })
    .eq("resource_id", resourceId)
    .eq("user_id", user.id)
    .eq("status", "Enrolled");

  if (error) {
    console.error("[resourceEnrollmentsService] cancel:", error.message);
    throw new Error(error.message);
  }
  return true;
}

export function activeEnrollmentResourceIds(enrollments: ResourceEnrollment[]): Set<string> {
  const ids = new Set<string>();
  for (const row of enrollments) {
    if (row.status === "Enrolled") ids.add(row.resourceId);
  }
  return ids;
}
