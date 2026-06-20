import type { AddPaymentMethodInput, PaymentMethod } from "@/data/paymentMethods";
import { getSupabase } from "@/lib/supabase";

export type DbPaymentMethodRow = {
  id: string;
  user_id: string;
  provider: string;
  provider_token_id: string;
  brand: string;
  last4: string;
  exp_month: number | null;
  exp_year: number | null;
  expiry_label: string;
  is_default: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function mapRow(row: DbPaymentMethodRow): PaymentMethod {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    providerTokenId: row.provider_token_id,
    brand: row.brand,
    last4: row.last4,
    expiryLabel: row.expiry_label,
    expMonth: row.exp_month,
    expYear: row.exp_year,
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

export function paymentMethodToCardView(method: PaymentMethod): {
  id: string;
  type: string;
  lastFour: string;
  expires: string;
  isDefault: boolean;
} {
  return {
    id: method.id,
    type: method.brand,
    lastFour: method.last4,
    expires: method.expiryLabel,
    isDefault: method.isDefault,
  };
}

function parseExpiry(expiryLabel: string): { expMonth: number | null; expYear: number | null } {
  const match = expiryLabel.trim().match(/^(\d{1,2})\s*\/\s*(\d{2,4})$/);
  if (!match) return { expMonth: null, expYear: null };
  const expMonth = Number.parseInt(match[1], 10);
  let expYear = Number.parseInt(match[2], 10);
  if (expYear < 100) expYear += 2000;
  if (expMonth < 1 || expMonth > 12) return { expMonth: null, expYear: null };
  return { expMonth, expYear };
}

function createTokenReference(): string {
  return `tok_saved_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function fetchMyPaymentMethods(): Promise<PaymentMethod[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[paymentMethodsService] fetch:", error.message);
    throw new Error(error.message);
  }

  return ((data ?? []) as DbPaymentMethodRow[]).map(mapRow);
}

export async function addPaymentMethod(
  input: AddPaymentMethodInput
): Promise<PaymentMethod | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const last4 = input.last4.replace(/\D/g, "").slice(-4);
  if (last4.length !== 4) return null;

  const { expMonth, expYear } = parseExpiry(input.expiryLabel);
  const providerTokenId = input.providerTokenId?.trim() || createTokenReference();

  const { data: existing } = await supabase
    .from("payment_methods")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  const isFirst = !existing?.length;
  const isDefault = input.setAsDefault ?? isFirst;

  if (isDefault) {
    await supabase
      .from("payment_methods")
      .update({ is_default: false })
      .eq("user_id", user.id);
  }

  const { data, error } = await supabase
    .from("payment_methods")
    .insert({
      user_id: user.id,
      provider: input.provider?.trim() || "razorpay",
      provider_token_id: providerTokenId,
      brand: input.brand.trim(),
      last4,
      exp_month: expMonth,
      exp_year: expYear,
      expiry_label: input.expiryLabel.trim(),
      is_default: isDefault,
    })
    .select()
    .single();

  if (error) {
    console.error("[paymentMethodsService] add:", error.message);
    return null;
  }

  return mapRow(data as DbPaymentMethodRow);
}

export async function removePaymentMethod(methodId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: removed, error } = await supabase
    .from("payment_methods")
    .delete()
    .eq("id", methodId)
    .eq("user_id", user.id)
    .select("id, is_default")
    .maybeSingle();

  if (error) {
    console.error("[paymentMethodsService] remove:", error.message);
    return false;
  }

  if (removed?.is_default) {
    const { data: next } = await supabase
      .from("payment_methods")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (next?.id) {
      await setDefaultPaymentMethod(next.id);
    }
  }

  return true;
}

export async function setDefaultPaymentMethod(methodId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error: clearError } = await supabase
    .from("payment_methods")
    .update({ is_default: false })
    .eq("user_id", user.id);

  if (clearError) {
    console.error("[paymentMethodsService] clear default:", clearError.message);
    return false;
  }

  const { error } = await supabase
    .from("payment_methods")
    .update({ is_default: true })
    .eq("id", methodId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[paymentMethodsService] set default:", error.message);
    return false;
  }
  return true;
}
