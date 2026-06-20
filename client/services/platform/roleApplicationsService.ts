import type {
  RoleApplication,
  RoleApplicationFormData,
  RoleApplicationTarget,
  ApplicationProgressStage,
} from "@/data/roleApplications";
import { getSupabase } from "@/lib/supabase";
import { updateProfile } from "@/services/profileService";
import { notifyUserHook, selfNotifyHook } from "@/services/transactionalHooksApi";

async function sendRoleApprovalNotifications(
  application: RoleApplication,
  accessToken?: string | null
): Promise<void> {
  const isPractitioner = application.targetRole === "Practitioner";
  const event = isPractitioner ? "practitioner_approved" : "seller_approved";
  const emailTemplate = event;
  const linkRoute = isPractitioner ? "PractitionerMain" : "SellerOnboarding";
  const message = isPractitioner
    ? "Congratulations! Your practitioner application has been approved."
    : "Congratulations! Your seller application was approved. Set up your store to get started.";

  if (accessToken) {
    void notifyUserHook(accessToken, {
      userId: application.userId,
      event,
      message,
      linkRoute,
      emailTemplate,
    });
  }
}

type DbRoleApplicationRow = {
  id: string;
  user_id: string;
  target_role: RoleApplicationTarget;
  status: RoleApplication["status"];
  progress_stage?: ApplicationProgressStage;
  rejection_reason?: string | null;
  form_data: Record<string, string>;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: DbRoleApplicationRow): RoleApplication {
  return {
    id: row.id,
    userId: row.user_id,
    targetRole: row.target_role,
    status: row.status,
    progressStage: row.progress_stage ?? (row.status === "Approved" ? "approved" : row.status === "Rejected" ? "rejected" : "submitted"),
    rejectionReason: row.rejection_reason ?? null,
    formData: row.form_data ?? {},
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parsePriceFromRange(raw: string): number {
  const match = raw.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function parseCertifications(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function submitRoleApplication(
  targetRole: RoleApplicationTarget,
  formData: RoleApplicationFormData
): Promise<RoleApplication | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const payload: Record<string, string> = {};
  for (const [key, value] of Object.entries(formData)) {
    payload[key] = String(value ?? "").trim();
  }

  const { data, error } = await supabase
    .from("role_applications")
    .insert({
      user_id: user.id,
      target_role: targetRole,
      status: "Pending",
      form_data: payload,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("You already have a pending application for this role.");
    }
    if (error.code === "42P01") {
      throw new Error(
        "Applications are not set up yet. Run Supabase migration 033_role_applications.sql."
      );
    }
    console.error("[roleApplicationsService] submit:", error.message);
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Application could not be saved. Please try again.");
  }

  const application = mapRow(data as DbRoleApplicationRow);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    const emailTemplate =
      targetRole === "Practitioner" ? "practitioner_application_submitted" : "seller_application_submitted";
    void selfNotifyHook(session.access_token, {
      event: "application_submitted",
      message: `Your ${targetRole.toLowerCase()} application was submitted. We'll review it within 5–7 business days.`,
      linkRoute: "ApplicationStatus",
      emailTemplate,
    });
  }

  return application;
}

export async function fetchMyRoleApplications(): Promise<RoleApplication[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("role_applications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[roleApplicationsService] fetch mine:", error.message);
    throw new Error(error.message);
  }

  return ((data ?? []) as DbRoleApplicationRow[]).map(mapRow);
}

export async function fetchAllRoleApplications(): Promise<RoleApplication[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data: rpcData, error: rpcError } = await supabase.rpc("admin_list_role_applications");

  if (!rpcError && rpcData) {
    return (rpcData as DbRoleApplicationRow[]).map(mapRow);
  }

  if (rpcError && rpcError.code !== "PGRST202" && __DEV__) {
    console.warn("[roleApplicationsService] admin RPC fallback:", rpcError.message);
  }

  const { data, error } = await supabase
    .from("role_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") {
      throw new Error(
        "Applications table is missing. Run Supabase migration 033_role_applications.sql."
      );
    }
    console.error("[roleApplicationsService] fetch all:", error.message);
    throw new Error(error.message);
  }

  return ((data ?? []) as DbRoleApplicationRow[]).map(mapRow);
}

async function createPractitionerFromApplication(
  userId: string,
  form: Record<string, string>
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not configured");

  const { error } = await supabase.from("practitioners").insert({
    profile_id: userId,
    name: form.fullName || "Practitioner",
    category: form.category || "Healings",
    subcategory: form.sessionTypes || "",
    bio: form.bio || "",
    experience: form.experience || "",
    certifications: parseCertifications(form.certifications || ""),
    rating: 5,
    review_count: 0,
    price_per_session: parsePriceFromRange(form.priceRange || ""),
    approval_status: "Approved",
    is_verified: false,
    featured: false,
    is_active: true,
  });

  if (error) {
    console.error("[roleApplicationsService] create practitioner:", error.message);
    throw new Error(error.message);
  }
}

async function createSellerFromApplication(
  userId: string,
  form: Record<string, string>
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not configured");

  const { data: existing } = await supabase
    .from("sellers")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (existing) return;

  const { error } = await supabase.from("sellers").insert({
    profile_id: userId,
    store_name: form.brandName || form.fullName || "Store",
    description: form.description || "",
    philosophy: "",
    storefront_settings: { onboarding_complete: false },
    is_active: true,
    is_verified: false,
  });

  if (error) {
    console.error("[roleApplicationsService] create seller:", error.message);
    throw new Error(error.message);
  }
}

export async function approveRoleApplication(
  applicationId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();
  if (!adminUser) return { ok: false, error: "Not signed in" };

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "approve_role_application_transaction",
    {
      p_application_id: applicationId,
      p_admin_id: adminUser.id,
    }
  );

  if (!rpcError && rpcResult && typeof rpcResult === "object") {
    const payload = rpcResult as { ok?: boolean; error?: string };
    if (payload.ok) {
      const { data: approvedRow } = await supabase
        .from("role_applications")
        .select("*")
        .eq("id", applicationId)
        .maybeSingle();
      if (approvedRow) {
        const application = mapRow(approvedRow as DbRoleApplicationRow);
        const {
          data: { session },
        } = await supabase.auth.getSession();
        await sendRoleApprovalNotifications(application, session?.access_token);
      }
      return { ok: true };
    }
    if (payload.error) return { ok: false, error: payload.error };
  }

  if (rpcError && rpcError.code !== "PGRST202") {
    console.warn("[roleApplicationsService] RPC fallback:", rpcError.message);
  }

  const { data: row, error: fetchError } = await supabase
    .from("role_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();

  if (fetchError || !row) {
    return { ok: false, error: fetchError?.message ?? "Application not found" };
  }

  const application = mapRow(row as DbRoleApplicationRow);
  if (application.status !== "Pending") {
    return { ok: false, error: "Application is no longer pending" };
  }

  try {
    if (application.targetRole === "Practitioner") {
      await createPractitionerFromApplication(application.userId, application.formData);
    } else {
      await createSellerFromApplication(application.userId, application.formData);
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not provision role account",
    };
  }

  const roleResult = await updateProfile(application.userId, {
    role: application.targetRole,
    full_name: application.formData.fullName || undefined,
    phone: application.formData.phone || undefined,
  });
  if (roleResult.error) {
    return { ok: false, error: roleResult.error };
  }

  const { error: updateError } = await supabase
    .from("role_applications")
    .update({
      status: "Approved",
      progress_stage: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUser.id,
    })
    .eq("id", applicationId)
    .eq("status", "Pending");

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  await sendRoleApprovalNotifications(application, session?.access_token);

  return { ok: true };
}

export async function rejectRoleApplication(
  applicationId: string,
  rejectionReason: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();
  if (!adminUser) return { ok: false, error: "Not signed in" };

  const { error } = await supabase
    .from("role_applications")
    .update({
      status: "Rejected",
      progress_stage: "rejected",
      rejection_reason: rejectionReason.trim() || "Application not approved at this time.",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUser.id,
    })
    .eq("id", applicationId)
    .eq("status", "Pending");

  if (error) {
    return { ok: false, error: error.message };
  }

  const { data: row } = await supabase
    .from("role_applications")
    .select("user_id, target_role")
    .eq("id", applicationId)
    .maybeSingle();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token && row) {
    const application = row as { user_id: string; target_role: string };
    const emailTemplate =
      application.target_role === "Practitioner" ? "practitioner_rejected" : "seller_rejected";
    void notifyUserHook(session.access_token, {
      userId: application.user_id,
      event: "application_rejected",
      message: `Your ${application.target_role.toLowerCase()} application was not approved. View the reason and reapply from Application Status.`,
      linkRoute: "ApplicationStatus",
      emailVars: { reason: rejectionReason.trim() || "Application not approved at this time." },
      emailTemplate,
    });
  }

  return { ok: true };
}

export async function updateApplicationProgressStage(
  applicationId: string,
  progressStage: ApplicationProgressStage
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase
    .from("role_applications")
    .update({ progress_stage: progressStage })
    .eq("id", applicationId);
  return !error;
}

export function applicationDisplayName(formData: Record<string, string>): string {
  return formData.fullName?.trim() || formData.brandName?.trim() || "Applicant";
}

export function applicationDisplaySubtitle(app: RoleApplication): string {
  if (app.targetRole === "Seller") {
    return app.formData.brandName?.trim() || app.formData.category?.trim() || "Seller application";
  }
  return app.formData.category?.trim() || "Practitioner application";
}
