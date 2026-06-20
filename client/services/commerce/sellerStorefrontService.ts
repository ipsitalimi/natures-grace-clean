import { getSupabase } from "@/lib/supabase";
import { resolveSellerIdByProfileId } from "@/services/commerce/sellerId";

export type StorefrontSettings = {
  accent_color: string;
  banner_theme_index: number;
  featured_product_ids: string[];
  onboarding_complete?: boolean;
};

export type SellerStorefront = {
  sellerId: string;
  storeName: string;
  description: string;
  philosophy: string;
  settings: StorefrontSettings;
};

const DEFAULT_SETTINGS: StorefrontSettings = {
  accent_color: "#013220",
  banner_theme_index: 0,
  featured_product_ids: [],
  onboarding_complete: false,
};

type DbSellerRow = {
  id: string;
  store_name: string;
  description: string | null;
  philosophy: string | null;
  storefront_settings: unknown;
};

function parseSettings(raw: unknown): StorefrontSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_SETTINGS };
  }
  const o = raw as Record<string, unknown>;
  const ids = o.featured_product_ids;
  return {
    accent_color:
      typeof o.accent_color === "string" && o.accent_color.trim()
        ? o.accent_color.trim()
        : DEFAULT_SETTINGS.accent_color,
    banner_theme_index:
      typeof o.banner_theme_index === "number" && Number.isFinite(o.banner_theme_index)
        ? Math.max(0, Math.min(3, Math.floor(o.banner_theme_index)))
        : DEFAULT_SETTINGS.banner_theme_index,
    featured_product_ids: Array.isArray(ids)
      ? ids.filter((id): id is string => typeof id === "string" && id.length > 0)
      : [],
    onboarding_complete: o.onboarding_complete === true,
  };
}

export function isSellerOnboardingComplete(settings: StorefrontSettings): boolean {
  return settings.onboarding_complete === true;
}

function rowToStorefront(row: DbSellerRow): SellerStorefront {
  return {
    sellerId: row.id,
    storeName: row.store_name?.trim() ?? "",
    description: row.description?.trim() ?? "",
    philosophy: row.philosophy?.trim() ?? "",
    settings: parseSettings(row.storefront_settings),
  };
}

export async function fetchSellerStorefrontByProfileId(
  profileId: string
): Promise<{ ok: true; storefront: SellerStorefront } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const sellerId = await resolveSellerIdByProfileId(profileId);
  if (!sellerId) return { ok: false, error: "Seller profile not found." };

  const { data, error } = await supabase
    .from("sellers")
    .select("id, store_name, description, philosophy, storefront_settings")
    .eq("id", sellerId)
    .maybeSingle();

  if (error) {
    console.error("[sellerStorefrontService] fetch:", error.message);
    return { ok: false, error: error.message };
  }
  if (!data) return { ok: false, error: "Seller record not found." };

  return { ok: true, storefront: rowToStorefront(data as DbSellerRow) };
}

export type UpdateSellerStorefrontInput = {
  storeName: string;
  description: string;
  philosophy: string;
  settings: StorefrontSettings;
};

export async function updateSellerStorefrontByProfileId(
  profileId: string,
  input: UpdateSellerStorefrontInput
): Promise<{ ok: true; storefront: SellerStorefront } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const sellerId = await resolveSellerIdByProfileId(profileId);
  if (!sellerId) return { ok: false, error: "Seller profile not found." };

  const { data, error } = await supabase
    .from("sellers")
    .update({
      store_name: input.storeName.trim(),
      description: input.description.trim(),
      philosophy: input.philosophy.trim(),
      storefront_settings: {
        accent_color: input.settings.accent_color,
        banner_theme_index: input.settings.banner_theme_index,
        featured_product_ids: input.settings.featured_product_ids,
        onboarding_complete: input.settings.onboarding_complete === true,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", sellerId)
    .select("id, store_name, description, philosophy, storefront_settings")
    .single();

  if (error || !data) {
    console.error("[sellerStorefrontService] update:", error?.message);
    return { ok: false, error: error?.message ?? "Could not save storefront." };
  }

  return { ok: true, storefront: rowToStorefront(data as DbSellerRow) };
}
