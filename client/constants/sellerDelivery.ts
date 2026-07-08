export type DeliveryTierId = "standard" | "express" | "overnight";

export type DeliveryTierConfig = {
  enabled: boolean;
  minDays: number;
  maxDays: number;
  price: number;
};

export type SellerDeliverySettings = {
  standard: DeliveryTierConfig;
  express: DeliveryTierConfig;
  overnight: DeliveryTierConfig;
};

export type SellerDeliveryOption = {
  id: DeliveryTierId;
  label: string;
  duration: string;
  price: number;
};

export const DEFAULT_SELLER_DELIVERY_SETTINGS: SellerDeliverySettings = {
  standard: { enabled: true, minDays: 5, maxDays: 7, price: 0 },
  express: { enabled: false, minDays: 2, maxDays: 3, price: 99 },
  overnight: { enabled: false, minDays: 1, maxDays: 1, price: 199 },
};

const TIER_LABELS: Record<DeliveryTierId, string> = {
  standard: "Standard Delivery",
  express: "Express Delivery",
  overnight: "Overnight Delivery",
};

function clampDays(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(30, Math.floor(n)));
}

function clampPrice(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n * 100) / 100);
}

function parseTier(
  raw: unknown,
  fallback: DeliveryTierConfig,
  forceEnabled?: boolean
): DeliveryTierConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...fallback, enabled: forceEnabled ?? fallback.enabled };
  }
  const o = raw as Record<string, unknown>;
  return {
    enabled: forceEnabled ?? o.enabled === true,
    minDays: clampDays(o.minDays ?? o.min_days, fallback.minDays),
    maxDays: clampDays(o.maxDays ?? o.max_days, fallback.maxDays),
    price: clampPrice(o.price, fallback.price),
  };
}

export function parseSellerDeliverySettings(raw: unknown): SellerDeliverySettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_SELLER_DELIVERY_SETTINGS };
  }
  const o = raw as Record<string, unknown>;
  const standard = parseTier(o.standard, DEFAULT_SELLER_DELIVERY_SETTINGS.standard, true);
  const express = parseTier(o.express, DEFAULT_SELLER_DELIVERY_SETTINGS.express);
  const overnight = parseTier(o.overnight, DEFAULT_SELLER_DELIVERY_SETTINGS.overnight);
  if (standard.maxDays < standard.minDays) {
    standard.maxDays = standard.minDays;
  }
  if (express.maxDays < express.minDays) {
    express.maxDays = express.minDays;
  }
  return { standard, express, overnight };
}

export function formatDeliveryDuration(tier: DeliveryTierConfig, id: DeliveryTierId): string {
  if (id === "overnight" || (tier.minDays === 1 && tier.maxDays === 1)) {
    return "Next business day";
  }
  if (tier.minDays === tier.maxDays) {
    return `${tier.minDays} business day${tier.minDays === 1 ? "" : "s"}`;
  }
  return `${tier.minDays}-${tier.maxDays} business days`;
}

export function getEnabledSellerDeliveryOptions(
  settings: SellerDeliverySettings
): SellerDeliveryOption[] {
  const tiers: DeliveryTierId[] = ["standard", "express", "overnight"];
  return tiers
    .filter((id) => settings[id].enabled)
    .map((id) => {
      const tier = settings[id];
      return {
        id,
        label: TIER_LABELS[id],
        duration: formatDeliveryDuration(tier, id),
        price: tier.price,
      };
    });
}

export function deliveryFeeForSellerOption(
  settings: SellerDeliverySettings,
  optionId: string
): number {
  const id = optionId as DeliveryTierId;
  if (id === "standard" || id === "express" || id === "overnight") {
    return settings[id].enabled ? settings[id].price : 0;
  }
  return 0;
}

export function sellerDeliveryLabel(
  settings: SellerDeliverySettings,
  optionId: string
): string {
  const option = getEnabledSellerDeliveryOptions(settings).find((o) => o.id === optionId);
  if (!option) return "Standard Delivery";
  return `${option.label} (${option.duration})`;
}
