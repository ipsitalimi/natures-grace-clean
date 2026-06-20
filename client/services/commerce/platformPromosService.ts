import { getSupabase } from "@/lib/supabase";
import { formatInr } from "@/lib/formatCurrency";

/** Admin Promo Codes UI row (derived from `platform_promo_codes`). */
export type AdminPromoDisplay = {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrder: number | null;
  usedCount: number;
  usageLimit: number | null;
  validFrom: string;
  validUntil: string;
  /** Stored in Postgres */
  dbStatus: "Active" | "Paused" | "Expired";
  /** Badge (includes scheduling / expiry-derived state). */
  displayStatus: "Active" | "Paused" | "Expired";
  /** Pause/activate allowed */
  canToggle: boolean;
};

export type PlatformPromoRow = {
  id: string;
  code: string;
  title: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order: number | null;
  usage_count: number;
  usage_limit: number | null;
  starts_at: string | null;
  expires_at: string | null;
  status: "Active" | "Paused" | "Expired";
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function computeDiscountAmount(subtotal: number, row: PlatformPromoRow): number {
  if (row.discount_type === "percentage") {
    return Math.min(subtotal, Math.round((subtotal * Number(row.discount_value)) / 100));
  }
  return Math.min(subtotal, Number(row.discount_value));
}

/** Display + card fields for Admin Promo Codes UI */
export function rowToAdminPromoCode(row: PlatformPromoRow): AdminPromoDisplay {
  const now = Date.now();
  const lapsed =
    !!row.expires_at &&
    !Number.isNaN(new Date(row.expires_at).getTime()) &&
    new Date(row.expires_at).getTime() < now;
  const notStarted =
    !!row.starts_at &&
    !Number.isNaN(new Date(row.starts_at).getTime()) &&
    new Date(row.starts_at).getTime() > now;

  let displayStatus: AdminPromoDisplay["displayStatus"];
  if (row.status === "Expired" || lapsed) {
    displayStatus = "Expired";
  } else if (row.status === "Paused" || notStarted) {
    displayStatus = "Paused";
  } else {
    displayStatus = "Active";
  }

  const canToggle =
    row.status !== "Expired" && !lapsed && !notStarted && (row.status === "Active" || row.status === "Paused");

  return {
    id: row.id,
    code: row.code,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    minOrder: row.min_order != null ? Number(row.min_order) : null,
    usedCount: row.usage_count,
    usageLimit: row.usage_limit,
    validFrom: fmtDate(row.starts_at),
    validUntil: row.expires_at ? fmtDate(row.expires_at) : "No end date",
    dbStatus: row.status,
    displayStatus,
    canToggle,
  };
}

export function validatePlatformPromoForSubtotal(
  subtotal: number,
  row: PlatformPromoRow
): { ok: true; discountAmount: number } | { ok: false; error: string } {
  if (row.status !== "Active") {
    return { ok: false, error: "This promo is not active." };
  }
  if (row.starts_at) {
    const st = new Date(row.starts_at);
    if (!Number.isNaN(st.getTime()) && st.getTime() > Date.now()) {
      return { ok: false, error: "This promo is not valid yet." };
    }
  }
  if (row.expires_at) {
    const ex = new Date(row.expires_at);
    if (!Number.isNaN(ex.getTime()) && ex.getTime() < Date.now()) {
      return { ok: false, error: "This promo has expired." };
    }
  }
  if (row.usage_limit != null && row.usage_count >= row.usage_limit) {
    return { ok: false, error: "This promo has reached its usage limit." };
  }
  if (row.min_order != null && subtotal < Number(row.min_order)) {
    return {
      ok: false,
      error: `Minimum order of ${formatInr(Number(row.min_order))} required for this promo.`,
    };
  }
  const discountAmount = computeDiscountAmount(subtotal, row);
  if (discountAmount <= 0) return { ok: false, error: "No discount applies to this order." };
  return { ok: true, discountAmount };
}

export type PlatformCartPromoValidation =
  | { ok: true; promo: PlatformPromoRow; discountAmount: number }
  | { ok: false; error: string };

export function validatePlatformPromoRowForCart(
  subtotal: number,
  row: PlatformPromoRow
): PlatformCartPromoValidation {
  const base = validatePlatformPromoForSubtotal(subtotal, row);
  if (!base.ok) return base;
  return { ok: true, promo: row, discountAmount: base.discountAmount };
}

export async function fetchPlatformPromoById(promoId: string): Promise<PlatformPromoRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from("platform_promo_codes").select("*").eq("id", promoId).maybeSingle();
  if (error || !data) return null;
  return data as PlatformPromoRow;
}

export async function fetchActivePlatformPromoByCode(
  rawCode: string
): Promise<{ ok: true; row: PlatformPromoRow } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a promo code." };

  const { data, error } = await supabase.from("platform_promo_codes").select("*").eq("code", code).maybeSingle();

  if (error) {
    console.error("[platformPromosService] fetch by code:", error.message);
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "Invalid or unavailable promo code." };
  }
  return { ok: true, row: data as PlatformPromoRow };
}

export async function listPlatformPromoCodes(): Promise<
  { ok: true; rows: PlatformPromoRow[] } | { ok: false; error: string }
> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("platform_promo_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[platformPromosService] list:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, rows: (data ?? []) as PlatformPromoRow[] };
}

export type CreatePlatformPromoInput = {
  code: string;
  title?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrder?: number | null;
  usageLimit?: number | null;
  startsAtIso?: string | null;
  expiresAtIso?: string | null;
};

export async function createPlatformPromoCode(
  input: CreatePlatformPromoInput
): Promise<{ ok: true; row: PlatformPromoRow } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const code = input.code.trim().toUpperCase();
  if (!code) return { ok: false, error: "Code is required" };

  const { data, error } = await supabase
    .from("platform_promo_codes")
    .insert({
      code,
      title: input.title?.trim() || code,
      discount_type: input.discountType,
      discount_value: input.discountValue,
      min_order: input.minOrder ?? null,
      usage_limit: input.usageLimit ?? null,
      starts_at: input.startsAtIso ?? null,
      expires_at: input.expiresAtIso ?? null,
      status: "Active",
    })
    .select()
    .single();

  if (error) {
    console.error("[platformPromosService] create:", error.message);
    return { ok: false, error: error.code === "23505" ? "That code already exists." : error.message };
  }
  return { ok: true, row: data as PlatformPromoRow };
}

export async function updatePlatformPromoCode(
  id: string,
  patch: Partial<
    Pick<
      PlatformPromoRow,
      "title" | "status" | "usage_limit" | "expires_at" | "starts_at" | "discount_value" | "discount_type" | "min_order"
    >
  >
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { error } = await supabase.from("platform_promo_codes").update(patch).eq("id", id);

  if (error) {
    console.error("[platformPromosService] update:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function deletePlatformPromoCode(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { error } = await supabase.from("platform_promo_codes").delete().eq("id", id);

  if (error) {
    console.error("[platformPromosService] delete:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
