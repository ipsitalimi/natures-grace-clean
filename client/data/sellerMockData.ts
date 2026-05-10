export interface SellerProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  status: "Active" | "Low Stock" | "Out of Stock";
}

export const sellerProducts: SellerProduct[] = [
  {
    id: "sel-1",
    name: "Switchword Energy Circle",
    description: "A handcrafted energy circle infused with powerful switchwords to amplify your intentions and manifest abundance in daily life.",
    price: 2499,
    category: "Spiritual Manifestation & Protection",
    stock: 24,
    status: "Active",
  },
  {
    id: "sel-2",
    name: "Evil Eye Protection Bracelet",
    description: "Woven with intention and featuring a traditional Nazar bead, this bracelet serves as a gentle guardian against negative energies.",
    price: 1850,
    category: "Spiritual Manifestation & Protection",
    stock: 3,
    status: "Low Stock",
  },
  {
    id: "sel-3",
    name: "Organic Rose Face Serum",
    description: "A lightweight serum blending rosehip oil, vitamin E, and aloe vera to nourish and restore your skin's natural radiance.",
    price: 3499,
    category: "Mindful Radiance",
    stock: 15,
    status: "Active",
  },
  {
    id: "sel-4",
    name: "Green Superfood Blend",
    description: "A nutrient-dense powder of spirulina, moringa, and wheatgrass to support your daily wellness and natural vitality.",
    price: 3200,
    category: "Conscious Nutrition",
    stock: 0,
    status: "Out of Stock",
  },
  {
    id: "sel-5",
    name: "Copper Meditation Pyramid",
    description: "A handcrafted copper pyramid designed to focus energy during meditation and create a sacred space in your home.",
    price: 8999,
    category: "Spirit & Space",
    stock: 8,
    status: "Active",
  },
  {
    id: "sel-6",
    name: "Complete Puja Kit",
    description: "A thoughtfully assembled kit with incense, diyas, kumkum, and sacred accessories for your daily prayer ritual.",
    price: 4500,
    category: "Sacred Rituals",
    stock: 12,
    status: "Active",
  },
  {
    id: "sel-7",
    name: "Eco Cork Yoga Mat",
    description: "A sustainably made cork and natural rubber yoga mat with excellent grip, antimicrobial properties, and a grounding feel.",
    price: 6499,
    category: "Daily Vitality",
    stock: 5,
    status: "Low Stock",
  },
  {
    id: "sel-8",
    name: "Turmeric Glow Mask",
    description: "An Ayurvedic-inspired face mask combining turmeric, sandalwood, and honey for a gentle, brightening ritual.",
    price: 1999,
    category: "Mindful Radiance",
    stock: 20,
    status: "Active",
  },
];

export const sellerStats = {
  totalProducts: 8,
  activeCategories: 6,
  lowStockItems: 2,
  revenue: 156800,
};

export const SELLER_CATEGORIES = [
  "Spiritual Manifestation & Protection",
  "Mindful Radiance",
  "Conscious Nutrition",
  "Spirit & Space",
  "Sacred Rituals",
  "Daily Vitality",
];

export function getCategoryShortName(category: string): string {
  switch (category) {
    case "Spiritual Manifestation & Protection":
      return "Spiritual";
    case "Mindful Radiance":
      return "Beauty";
    case "Conscious Nutrition":
      return "Nutrition";
    case "Spirit & Space":
      return "Space";
    case "Sacred Rituals":
      return "Rituals";
    case "Daily Vitality":
      return "Vitality";
    default:
      return category;
  }
}

export function getStockColor(status: SellerProduct["status"]): { bg: string; text: string } {
  switch (status) {
    case "Active":
      return { bg: "rgba(1, 50, 32, 0.1)", text: "#013220" };
    case "Low Stock":
      return { bg: "rgba(212, 148, 58, 0.12)", text: "#B8860B" };
    case "Out of Stock":
      return { bg: "rgba(139, 58, 58, 0.1)", text: "#8B3A3A" };
  }
}
