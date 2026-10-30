import type { StoreCategory } from "@/data/storeProducts";

/** Store taxonomy — categories stay visible even when empty (mirrors practitioner templates). */
export const storeCategoryTemplates: StoreCategory[] = [
  {
    id: "spiritual-manifestation",
    name: "Spiritual Manifestation & Protection",
    description:
      "Crystals, malas, and ritual tools to support intention-setting, protection, and spiritual practice.",
    icon: "star",
    products: [],
  },
  {
    id: "mindful-radiance",
    name: "Mindful Radiance",
    description:
      "Clean beauty and self-care essentials for radiant skin, hair, and mindful daily rituals.",
    icon: "sun",
    products: [],
  },
  {
    id: "conscious-nutrition",
    name: "Conscious Nutrition",
    description:
      "Wholesome foods, supplements, and pantry staples aligned with conscious, nourishing living.",
    icon: "heart",
    products: [],
  },
  {
    id: "festive-gifting",
    name: "Festive Gifting",
    description:
      "Thoughtful gifts and festive collections for celebrations and meaningful occasions.",
    icon: "gift",
    products: [],
  },
  {
    id: "sacred-rituals",
    name: "Sacred Rituals",
    description:
      "Incense, candles, and ceremonial items for daily rituals and sacred moments.",
    icon: "zap",
    products: [],
  },
  {
    id: "daily-vitality",
    name: "Daily Vitality",
    description:
      "Wellness essentials for energy, balance, and vitality in everyday life.",
    icon: "activity",
    products: [],
  },
  {
    id: "pets-products",
    name: "Pets Products",
    description:
      "Mindful products for pets — wellness, care, and everyday companion essentials.",
    icon: "heart",
    products: [],
  },
];

export function normalizeStoreCategoryKey(value: string): string {
  return value.toLowerCase().trim().replace(/_/g, "-").replace(/\s+/g, "-").replace(/&/g, "and");
}

/** Legacy seller category names/ids mapped to current templates. */
const STORE_CATEGORY_ALIASES: Record<string, string> = {
  "spirit-space": "festive-gifting",
  "spirit-and-space": "festive-gifting",
};

export function findStoreCategoryTemplate(
  templates: StoreCategory[],
  productCategory: string
): StoreCategory | undefined {
  const key = normalizeStoreCategoryKey(productCategory);
  const aliased = STORE_CATEGORY_ALIASES[key] ?? key;
  return templates.find((c) => {
    const idKey = normalizeStoreCategoryKey(c.id);
    const nameKey = normalizeStoreCategoryKey(c.name);
    return idKey === aliased || nameKey === aliased || idKey === key || nameKey === key;
  });
}

export function getStoreCategoryById(categoryId: string): StoreCategory | undefined {
  const key = normalizeStoreCategoryKey(categoryId);
  return storeCategoryTemplates.find(
    (cat) =>
      normalizeStoreCategoryKey(cat.id) === key || normalizeStoreCategoryKey(cat.name) === key
  );
}

export function emptyStoreCategories(): StoreCategory[] {
  return storeCategoryTemplates.map((c) => ({ ...c, products: [] }));
}

export function getStoreCategoryNames(): string[] {
  return storeCategoryTemplates.map((c) => c.name);
}
