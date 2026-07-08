import { getSupabase } from "@/lib/supabase";

export type SellerProvisionErrorCode =
  | "not_configured"
  | "not_authenticated"
  | "not_seller"
  | "rpc_missing"
  | "profile_not_found"
  | "provision_failed"
  | "lookup_failed";

export type EnsureSellerProfileResult =
  | { ok: true; sellerId: string; created: boolean }
  | { ok: false; code: SellerProvisionErrorCode; error: string };

let lastProvisionError: Extract<EnsureSellerProfileResult, { ok: false }> | null = null;

function provisionErrorMessage(code: SellerProvisionErrorCode): string {
  switch (code) {
    case "not_configured":
      return "Supabase is not configured. Seller profile cannot be initialized.";
    case "not_authenticated":
      return "Sign in to initialize your seller profile.";
    case "not_seller":
      return "Your account is not approved as a Seller yet.";
    case "rpc_missing":
      return (
        "Seller profile setup is not available yet. Apply migration " +
        "055_ensure_seller_profile.sql to your Supabase project and reload the app."
      );
    case "profile_not_found":
      return "Your user profile was not found. Try signing out and back in.";
    case "lookup_failed":
      return "Could not look up your seller profile.";
    default:
      return "Could not initialize your seller profile. Try again or contact support.";
  }
}

function classifyRpcError(message: string): SellerProvisionErrorCode {
  const lower = message.toLowerCase();
  if (
    lower.includes("could not find the function") ||
    lower.includes("schema cache") ||
    lower.includes("pgrst202")
  ) {
    return "rpc_missing";
  }
  if (lower.includes("not_authenticated")) return "not_authenticated";
  if (lower.includes("not_seller")) return "not_seller";
  if (lower.includes("profile_not_found")) return "profile_not_found";
  return "provision_failed";
}

export function peekLastSellerProvisionError(): EnsureSellerProfileResult | null {
  return lastProvisionError;
}

async function lookupSellerId(profileId: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("sellers")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    lastProvisionError = {
      ok: false,
      code: "lookup_failed",
      error: provisionErrorMessage("lookup_failed"),
    };
    console.warn("[sellerId] resolve:", error.message);
    return null;
  }

  return (data as { id: string } | null)?.id ?? null;
}

export async function canSelfProvisionSellerProfile(profileId?: string | null): Promise<boolean> {
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
    console.warn("[sellerId] role lookup:", profileError.message);
    return false;
  }
  if ((profile as { role?: string } | null)?.role === "Seller") {
    return true;
  }

  const { data: approvedApp, error: appError } = await supabase
    .from("role_applications")
    .select("id")
    .eq("user_id", profileId)
    .eq("target_role", "Seller")
    .eq("status", "Approved")
    .limit(1)
    .maybeSingle();
  if (appError) {
    console.warn("[sellerId] approved app lookup:", appError.message);
    return false;
  }
  return Boolean(approvedApp);
}

export async function ensureSellerProfile(): Promise<EnsureSellerProfileResult> {
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

  const existing = await lookupSellerId(user.id);
  if (existing) {
    lastProvisionError = null;
    return { ok: true, sellerId: existing, created: false };
  }

  const mayProvision = await canSelfProvisionSellerProfile(user.id);
  if (!mayProvision) {
    const result = {
      ok: false as const,
      code: "not_seller" as const,
      error: provisionErrorMessage("not_seller"),
    };
    lastProvisionError = result;
    return result;
  }

  const { data, error } = await supabase.rpc("ensure_seller_profile");
  if (error) {
    const code = classifyRpcError(error.message);
    const result = {
      ok: false as const,
      code,
      error: provisionErrorMessage(code),
    };
    lastProvisionError = result;
    if (code !== "not_seller") {
      console.error("[sellerId] ensure profile:", error.message);
    }
    return result;
  }

  const sellerId = (data as string | null) ?? null;
  if (!sellerId) {
    const result = {
      ok: false as const,
      code: "provision_failed" as const,
      error: provisionErrorMessage("provision_failed"),
    };
    lastProvisionError = result;
    return result;
  }

  lastProvisionError = null;
  return { ok: true, sellerId, created: true };
}

export async function resolveSellerIdByProfileId(
  profileId: string
): Promise<string | null> {
  const resolved = await lookupSellerId(profileId);
  if (resolved) {
    return resolved;
  }

  const mayProvision = await canSelfProvisionSellerProfile(profileId);
  if (mayProvision) {
    const ensured = await ensureSellerProfile();
    if (ensured.ok) {
      return ensured.sellerId;
    }
  }

  return await lookupSellerId(profileId);
}

export async function fetchSellerProductIds(sellerId: string): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("seller_id", sellerId);

  if (error) {
    console.error("[sellerId] product ids:", error.message);
    return [];
  }

  return (data ?? []).map((row) => (row as { id: string }).id);
}
