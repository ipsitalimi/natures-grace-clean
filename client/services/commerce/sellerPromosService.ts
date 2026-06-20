import { getSupabase } from "@/lib/supabase";
import { formatInr } from "@/lib/formatCurrency";
import type { SellerPromo } from "@/data/sellerMockData";

export type SellerPromoKind = "standard" | "flash_sale" | "bundle";

export type SellerPromoRow = {
  id: string;
  seller_id: string;
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order: number | null;
  usage_count: number;
  usage_limit: number | null;
  starts_at: string | null;
  expires_at: string | null;
  status: "Active" | "Paused" | "Expired";
  promo_kind: SellerPromoKind;
  metadata: Record<string, unknown>;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "No expiry";
  return formatDate(expiresAt);
}

function isNotStarted(startsAt: string | null): boolean {
  if (!startsAt) return false;
  const st = new Date(startsAt);
  return !Number.isNaN(st.getTime()) && st.getTime() > Date.now();
}

function isLapsed(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const ex = new Date(expiresAt);
  return !Number.isNaN(ex.getTime()) && ex.getTime() < Date.now();
}

/** Display status: date-lapsed Active promos show as Expired; scheduled show as Paused. */
export function toSellerPromoDisplay(
  row: SellerPromoRow
): SellerPromo & {
  dbStatus: SellerPromoRow["status"];
  promoKind: SellerPromoKind;
  startsAt: string | null;
  expiresAtIso: string | null;
} {
  const lapsed = isLapsed(row.expires_at);
  const notStarted = isNotStarted(row.starts_at);
  let status: SellerPromo["status"] = row.status === "Paused" ? "Paused" : row.status === "Expired" ? "Expired" : "Active";
  if (row.status === "Active" && lapsed) {
    status = "Expired";
  } else if (row.status === "Active" && notStarted) {
    status = "Paused";
  }
  return {
    id: row.id,
    code: row.code,
    type: row.discount_type === "percentage" ? "Percentage" : "Fixed",
    value: Number(row.discount_value),
    usageCount: row.usage_count,
    usageLimit: row.usage_limit,
    expiry: formatExpiry(row.expires_at),
    status,
    description: row.description?.trim() || `${row.code} offer`,
    dbStatus: row.status,
    promoKind: row.promo_kind ?? "standard",
    startsAt: row.starts_at,
    expiresAtIso: row.expires_at,
  };
}

export type CreateSellerPromoInput = {
  sellerId: string;
  code: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrder?: number | null;
  usageLimit?: number | null;
  startsAtIso?: string | null;
  expiresAtIso?: string | null;
  promoKind?: SellerPromoKind;
  metadata?: Record<string, unknown>;
};

export function generateCampaignCode(prefix: string): string {
  return `${prefix}${Date.now().toString(36).slice(-6).toUpperCase()}`;
}

export async function listSellerPromos(sellerId: string): Promise<{ ok: true; rows: SellerPromoRow[] } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("seller_promos")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[sellerPromosService] list:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, rows: (data ?? []) as SellerPromoRow[] };
}

export async function createSellerPromo(input: CreateSellerPromoInput): Promise<{ ok: true; row: SellerPromoRow } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const code = input.code.trim().toUpperCase();
  if (!code) return { ok: false, error: "Code is required" };

  const { data, error } = await supabase
    .from("seller_promos")
    .insert({
      seller_id: input.sellerId,
      code,
      description: input.description?.trim() || "",
      discount_type: input.discountType,
      discount_value: input.discountValue,
      min_order: input.minOrder ?? null,
      usage_limit: input.usageLimit ?? null,
      starts_at: input.startsAtIso ?? null,
      expires_at: input.expiresAtIso ?? null,
      promo_kind: input.promoKind ?? "standard",
      metadata: input.metadata ?? {},
      status: "Active",
    })
    .select()
    .single();

  if (error) {
    console.error("[sellerPromosService] create:", error.message);
    return { ok: false, error: error.code === "23505" ? "That code already exists for your store." : error.message };
  }
  return { ok: true, row: data as SellerPromoRow };
}

export async function updateSellerPromo(
  id: string,
  patch: Partial<
    Pick<
      SellerPromoRow,
      | "description"
      | "status"
      | "usage_limit"
      | "starts_at"
      | "expires_at"
      | "discount_value"
      | "discount_type"
      | "min_order"
      | "metadata"
    >
  >
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { error } = await supabase.from("seller_promos").update(patch).eq("id", id);
  if (error) {
    console.error("[sellerPromosService] update:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function deleteSellerPromo(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { error } = await supabase.from("seller_promos").delete().eq("id", id);
  if (error) {
    console.error("[sellerPromosService] delete:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export type CartPromoValidation =
  | {
      ok: true;
      promo: SellerPromoRow;
      discountAmount: number;
    }
  | { ok: false; error: string };

/** Load a promo row by id (re-validate cart totals). */
export async function fetchSellerPromoById(promoId: string): Promise<SellerPromoRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from("seller_promos").select("*").eq("id", promoId).maybeSingle();
  if (error || !data) return null;
  return data as SellerPromoRow;
}

function computeDiscountAmount(subtotal: number, row: SellerPromoRow): number {
  if (row.discount_type === "percentage") {
    return Math.min(subtotal, Math.round((subtotal * Number(row.discount_value)) / 100));
  }
  return Math.min(subtotal, Number(row.discount_value));
}

/** Validate promo applies to subtotal (call after resolving row by code + seller). */
export function validatePromoForSubtotal(subtotal: number, row: SellerPromoRow): { ok: true; discountAmount: number } | { ok: false; error: string } {
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

export async function fetchProductSellerIds(productIds: string[]): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase || productIds.length === 0) return [];
  const { data, error } = await supabase.from("products").select("seller_id").in("id", productIds);
  if (error || !data) return [];
  const set = new Set<string>();
  for (const r of data as { seller_id: string | null }[]) {
    if (r.seller_id) set.add(r.seller_id);
  }
  return [...set];
}

/**
 * Find an active promo by code for checkout (RLS: only rows visible as active + not expired + under limit).
 */
export async function fetchActivePromoForSellerByCode(
  sellerId: string,
  rawCode: string
): Promise<{ ok: true; row: SellerPromoRow } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a promo code." };

  const { data, error } = await supabase
    .from("seller_promos")
    .select("*")
    .eq("seller_id", sellerId)
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("[sellerPromosService] fetch by code:", error.message);
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "Invalid or unavailable promo code." };
  }
  return { ok: true, row: data as SellerPromoRow };
}

export function validatePromoRowForCart(subtotal: number, row: SellerPromoRow): CartPromoValidation {
  const base = validatePromoForSubtotal(subtotal, row);
  if (!base.ok) return base;
  return { ok: true, promo: row, discountAmount: base.discountAmount };
}
