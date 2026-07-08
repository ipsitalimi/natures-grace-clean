import { getSupabase } from "@/lib/supabase";
import {
  DEFAULT_SELLER_DELIVERY_SETTINGS,
  parseSellerDeliverySettings,
  type SellerDeliverySettings,
} from "@/constants/sellerDelivery";
import { isMissingColumnError } from "@/lib/supabaseSchemaErrors";
import { peekLastSellerProvisionError, resolveSellerIdByProfileId } from "@/services/commerce/sellerId";

type DbSellerDeliveryRow = {
  id: string;
  store_name: string;
  delivery_settings?: unknown;
};

export type SellerDeliveryProfile = {
  sellerId: string;
  storeName: string;
  settings: SellerDeliverySettings;
};

function rowToProfile(row: DbSellerDeliveryRow): SellerDeliveryProfile {
  return {
    sellerId: row.id,
    storeName: row.store_name?.trim() || "Seller",
    settings: parseSellerDeliverySettings(row.delivery_settings),
  };
}

function defaultProfile(sellerId: string, storeName = "Seller"): SellerDeliveryProfile {
  return {
    sellerId,
    storeName,
    settings: { ...DEFAULT_SELLER_DELIVERY_SETTINGS },
  };
}

async function fetchSellerRowsByIds(
  sellerIds: string[]
): Promise<{ rows: DbSellerDeliveryRow[]; deliveryColumnAvailable: boolean }> {
  const supabase = getSupabase();
  if (!supabase) return { rows: [], deliveryColumnAvailable: false };

  const withDelivery = await supabase
    .from("sellers")
    .select("id, store_name, delivery_settings")
    .in("id", sellerIds)
    .eq("is_active", true);

  if (!withDelivery.error) {
    return {
      rows: (withDelivery.data ?? []) as DbSellerDeliveryRow[],
      deliveryColumnAvailable: true,
    };
  }

  if (!isMissingColumnError(withDelivery.error.message, "delivery_settings")) {
    console.error("[sellerDeliveryService] fetch batch:", withDelivery.error.message);
    return { rows: [], deliveryColumnAvailable: false };
  }

  const basic = await supabase
    .from("sellers")
    .select("id, store_name")
    .in("id", sellerIds)
    .eq("is_active", true);

  if (basic.error) {
    console.error("[sellerDeliveryService] fetch batch (fallback):", basic.error.message);
    return { rows: [], deliveryColumnAvailable: false };
  }

  return {
    rows: ((basic.data ?? []) as DbSellerDeliveryRow[]).map((row) => ({
      ...row,
      delivery_settings: {},
    })),
    deliveryColumnAvailable: false,
  };
}

export async function fetchSellerDeliveryBySellerId(
  sellerId: string
): Promise<SellerDeliveryProfile | null> {
  const { rows } = await fetchSellerRowsByIds([sellerId]);
  if (rows.length === 0) return defaultProfile(sellerId);
  return rowToProfile(rows[0]);
}

export async function fetchSellerDeliveryBySellerIds(
  sellerIds: string[]
): Promise<Record<string, SellerDeliveryProfile>> {
  const unique = [...new Set(sellerIds.filter(Boolean))];
  if (unique.length === 0) return {};

  const { rows } = await fetchSellerRowsByIds(unique);
  const out: Record<string, SellerDeliveryProfile> = {};
  for (const row of rows) {
    out[row.id] = rowToProfile(row);
  }
  for (const sellerId of unique) {
    if (!out[sellerId]) {
      out[sellerId] = defaultProfile(sellerId);
    }
  }
  return out;
}

export async function fetchSellerDeliveryByProfileId(
  profileId: string
): Promise<{ ok: true; profile: SellerDeliveryProfile } | { ok: false; error: string }> {
  const sellerId = await resolveSellerIdByProfileId(profileId);
  if (!sellerId) {
    const provision = peekLastSellerProvisionError();
    return { ok: false, error: provision?.ok === false ? provision.error : "Seller profile not found." };
  }

  const profile = await fetchSellerDeliveryBySellerId(sellerId);
  if (!profile) {
    return { ok: false, error: "Could not load delivery settings." };
  }
  return { ok: true, profile };
}

export async function updateSellerDeliveryByProfileId(
  profileId: string,
  settings: SellerDeliverySettings
): Promise<{ ok: true; profile: SellerDeliveryProfile } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const sellerId = await resolveSellerIdByProfileId(profileId);
  if (!sellerId) {
    const provision = peekLastSellerProvisionError();
    return { ok: false, error: provision?.ok === false ? provision.error : "Seller profile not found." };
  }

  const normalized = parseSellerDeliverySettings(settings);
  normalized.standard.enabled = true;

  const { data, error } = await supabase
    .from("sellers")
    .update({
      delivery_settings: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sellerId)
    .select("id, store_name, delivery_settings")
    .single();

  if (error && isMissingColumnError(error.message, "delivery_settings")) {
    return {
      ok: false,
      error:
        "Delivery settings are not available yet. Run migration 057_seller_delivery_settings.sql in Supabase.",
    };
  }

  if (error || !data) {
    console.error("[sellerDeliveryService] update:", error?.message);
    return { ok: false, error: error?.message ?? "Could not save delivery settings." };
  }

  return { ok: true, profile: rowToProfile(data as DbSellerDeliveryRow) };
}

export function defaultDeliverySettingsForNewSeller(): SellerDeliverySettings {
  return { ...DEFAULT_SELLER_DELIVERY_SETTINGS };
}
