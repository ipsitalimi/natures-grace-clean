import { ImageSourcePropType } from "react-native";

export const productImages: Record<string, ImageSourcePropType> = {
  "sp-1": require("../../assets/images/store/sp-1.png"),
  "sp-2": require("../../assets/images/store/sp-2.png"),
  "sp-3": require("../../assets/images/store/sp-3.png"),
  "mr-1": require("../../assets/images/store/mr-1.png"),
  "mr-2": require("../../assets/images/store/mr-2.png"),
  "mr-3": require("../../assets/images/store/mr-3.png"),
  "cn-1": require("../../assets/images/store/cn-1.png"),
  "cn-2": require("../../assets/images/store/cn-2.png"),
  "cn-3": require("../../assets/images/store/cn-3.png"),
  "ss-1": require("../../assets/images/store/ss-1.png"),
  "ss-2": require("../../assets/images/store/ss-2.png"),
  "ss-3": require("../../assets/images/store/ss-3.png"),
  "sr-1": require("../../assets/images/store/sr-1.png"),
  "sr-2": require("../../assets/images/store/sr-2.png"),
  "sr-3": require("../../assets/images/store/sr-3.png"),
  "dv-1": require("../../assets/images/store/dv-1.png"),
  "dv-2": require("../../assets/images/store/dv-2.png"),
  "dv-3": require("../../assets/images/store/dv-3.png"),
};

export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

export interface StoreCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  products: StoreProduct[];
}

export const storeCategories: StoreCategory[] = [
  {
    id: "spiritual-manifestation",
    name: "Spiritual Manifestation & Protection",
    description: "Tools for intention setting and energetic shielding",
    icon: "star",
    products: [
      {
        id: "sp-1",
        name: "Switchword Energy Circle",
        description:
          "A handcrafted energy circle infused with powerful switchwords to amplify your intentions and manifest abundance in daily life.",
        price: 24.99,
        category: "Spiritual Manifestation & Protection",
      },
      {
        id: "sp-2",
        name: "Evil Eye Protection Bracelet",
        description:
          "Woven with intention and featuring a traditional Nazar bead, this bracelet serves as a gentle guardian against negative energies.",
        price: 18.5,
        category: "Spiritual Manifestation & Protection",
      },
      {
        id: "sp-3",
        name: "Manifestation Journal",
        description:
          "A guided journal with daily prompts, gratitude pages, and affirmation spaces to help you align with your highest intentions.",
        price: 22.0,
        category: "Spiritual Manifestation & Protection",
      },
    ],
  },
  {
    id: "mindful-radiance",
    name: "Mindful Radiance",
    description: "Clean beauty rooted in nature and self-care",
    icon: "sun",
    products: [
      {
        id: "mr-1",
        name: "Organic Rose Face Serum",
        description:
          "A lightweight serum blending rosehip oil, vitamin E, and aloe vera to nourish and restore your skin's natural radiance.",
        price: 34.99,
        category: "Mindful Radiance",
      },
      {
        id: "mr-2",
        name: "Turmeric Glow Mask",
        description:
          "An Ayurvedic-inspired face mask combining turmeric, sandalwood, and honey for a gentle, brightening ritual.",
        price: 19.99,
        category: "Mindful Radiance",
      },
      {
        id: "mr-3",
        name: "Lavender Body Oil",
        description:
          "Cold-pressed lavender and jojoba oil blend for calming self-massage, designed to ease tension and soften the skin.",
        price: 28.0,
        category: "Mindful Radiance",
      },
    ],
  },
  {
    id: "conscious-nutrition",
    name: "Conscious Nutrition",
    description: "Wholesome supplements and mindful nourishment",
    icon: "heart",
    products: [
      {
        id: "cn-1",
        name: "Green Superfood Blend",
        description:
          "A nutrient-dense powder of spirulina, moringa, and wheatgrass to support your daily wellness and natural vitality.",
        price: 32.0,
        category: "Conscious Nutrition",
      },
      {
        id: "cn-2",
        name: "Adaptogen Chai Mix",
        description:
          "A warming blend of ashwagandha, reishi, and traditional chai spices to promote calm focus and inner balance.",
        price: 26.5,
        category: "Conscious Nutrition",
      },
      {
        id: "cn-3",
        name: "Golden Milk Turmeric Latte",
        description:
          "A soothing blend of turmeric, black pepper, and coconut milk powder for a nourishing evening ritual.",
        price: 21.99,
        category: "Conscious Nutrition",
      },
    ],
  },
  {
    id: "spirit-space",
    name: "Spirit & Space",
    description: "Sacred objects to elevate your environment",
    icon: "home",
    products: [
      {
        id: "ss-1",
        name: "Copper Meditation Pyramid",
        description:
          "A handcrafted copper pyramid designed to focus energy during meditation and create a sacred space in your home.",
        price: 89.99,
        category: "Spirit & Space",
      },
      {
        id: "ss-2",
        name: "Himalayan Salt Lamp",
        description:
          "A natural Himalayan salt crystal lamp that emits a warm amber glow, purifying the air and calming the senses.",
        price: 42.0,
        category: "Spirit & Space",
      },
      {
        id: "ss-3",
        name: "Palo Santo & Sage Bundle",
        description:
          "Ethically sourced palo santo sticks paired with white sage for cleansing your space and inviting positive energy.",
        price: 16.99,
        category: "Spirit & Space",
      },
    ],
  },
  {
    id: "sacred-rituals",
    name: "Sacred Rituals",
    description: "Traditional tools for daily spiritual practice",
    icon: "zap",
    products: [
      {
        id: "sr-1",
        name: "Complete Puja Kit",
        description:
          "A thoughtfully assembled kit with incense, diyas, kumkum, and sacred accessories for your daily prayer ritual.",
        price: 45.0,
        category: "Sacred Rituals",
      },
      {
        id: "sr-2",
        name: "Crystal Singing Bowl",
        description:
          "A pure quartz singing bowl tuned to the heart chakra, producing resonant tones for sound healing and meditation.",
        price: 78.0,
        category: "Sacred Rituals",
      },
      {
        id: "sr-3",
        name: "Sandalwood Mala Beads",
        description:
          "108 hand-knotted sandalwood beads for japa meditation, carrying the gentle fragrance of sacred sandalwood.",
        price: 29.99,
        category: "Sacred Rituals",
      },
    ],
  },
  {
    id: "daily-vitality",
    name: "Daily Vitality",
    description: "Essentials for an active and balanced lifestyle",
    icon: "activity",
    products: [
      {
        id: "dv-1",
        name: "Eco Cork Yoga Mat",
        description:
          "A sustainably made cork and natural rubber yoga mat with excellent grip, antimicrobial properties, and a grounding feel.",
        price: 64.99,
        category: "Daily Vitality",
      },
      {
        id: "dv-2",
        name: "Healing Crystal Set",
        description:
          "A curated set of seven chakra crystals including amethyst, rose quartz, and citrine, each cleansed and charged.",
        price: 38.0,
        category: "Daily Vitality",
      },
      {
        id: "dv-3",
        name: "Bamboo Water Bottle",
        description:
          "A double-walled insulated bottle wrapped in natural bamboo, keeping your water pure and your practice sustainable.",
        price: 27.5,
        category: "Daily Vitality",
      },
    ],
  },
];

export function getCategoryById(categoryId: string): StoreCategory | undefined {
  return storeCategories.find((c) => c.id === categoryId);
}

export function getProductById(productId: string): StoreProduct | undefined {
  for (const category of storeCategories) {
    const product = category.products.find((p) => p.id === productId);
    if (product) return product;
  }
  return undefined;
}
