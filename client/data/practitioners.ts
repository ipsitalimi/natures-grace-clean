import { ImageSourcePropType } from "react-native";

import drNeelamPhoto from "../../assets/images/neelam.jpg";

export { drNeelamPhoto as drNeelamLocalPhoto };

export type PractitionerApprovalStatus = "Approved" | "Pending" | "Rejected";

export type PractitionerSpecialty = {
  category: string;
  subcategory: string;
};

export interface Practitioner {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  /** Approved (category, subcategory) pairs — drives Wellness listing and session offerings. */
  specialties?: PractitionerSpecialty[];
  photo: string;
  localPhoto?: ImageSourcePropType;
  bio: string;
  experience: string;
  certifications: string[];
  rating: number;
  reviewCount: number;
  pricePerSession: number;
  availability: string;
  approvalStatus?: PractitionerApprovalStatus;
  isVerified?: boolean;
  featured?: boolean;
}

export interface Subcategory {
  id: string;
  name: string;
  icon: string;
}

export interface Category {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  subcategories: Subcategory[];
  practitioners: Practitioner[];
}

/** Category taxonomy for grouping live practitioners from Supabase. */
export const categories: Category[] = [
  {
    id: "healings",
    name: "Healings",
    subtitle: "Healing & Energy Balancing",
    description:
      "Experience the gentle power of energy healing. Our practitioners use Reiki, Chakra balancing, and more to restore harmony to your mind, body, and spirit.",
    subcategories: [
      { id: "reiki-healing", name: "Reiki Healing", icon: "sun" },
      { id: "chakra-healing", name: "Chakra Healing", icon: "target" },
      { id: "mindful-meditation", name: "Mindful Meditation", icon: "eye" },
      { id: "energy-chakra-balancing", name: "Energy and Chakra Balancing", icon: "zap" },
      { id: "sound-healing", name: "Sound Healing", icon: "music" },
    ],
    practitioners: [],
  },
  {
    id: "spiritual-guidance",
    name: "Spiritual Guidance",
    subtitle: "Intuitive Insights",
    description:
      "Seek wisdom and clarity on your spiritual path. Our guides offer intuitive readings, astrology, and more to illuminate your journey.",
    subcategories: [
      { id: "tarot-card-reading", name: "Tarot Card Reading", icon: "layers" },
      { id: "astrology", name: "Astrology", icon: "star" },
      { id: "numerology", name: "Numerology", icon: "hash" },
      { id: "vastu", name: "Vastu", icon: "home" },
      { id: "akashic-readings", name: "Akashic Readings", icon: "book-open" },
      { id: "signature-analysis", name: "Signature Analysis", icon: "edit-3" },
    ],
    practitioners: [],
  },
  {
    id: "counseling",
    name: "Counseling",
    subtitle: "Emotional & Mental Support",
    description:
      "Find a safe space to share your thoughts and feelings. Our compassionate counselors provide emotional support and guidance through life's challenges.",
    subcategories: [
      { id: "relationship-counseling", name: "Relationship Counseling", icon: "heart" },
      { id: "personal-counseling", name: "Personal Counseling", icon: "user" },
      { id: "grief-depression-counseling", name: "Grief & Depression Counseling", icon: "cloud-rain" },
      { id: "garbsanskar-counseling", name: "Garbsanskar", icon: "sunrise" },
      { id: "trauma-counseling", name: "Trauma Counseling", icon: "shield" },
      { id: "teen-parents-counseling", name: "Teen and Parents Counseling", icon: "users" },
      { id: "fertility-pregnancy-counseling", name: "Fertility and Pregnancy Counseling", icon: "feather" },
    ],
    practitioners: [],
  },
  {
    id: "therapies",
    name: "Therapies",
    subtitle: "Holistic Treatments",
    description:
      "Discover holistic treatments that nurture your whole being. From naturopathy to yoga, our therapists offer natural paths to wellness.",
    subcategories: [
      { id: "su-jok-therapy", name: "Su-Jok Therapy", icon: "target" },
      { id: "naturopathy", name: "Naturopathy", icon: "sun" },
      { id: "hypnotherapy", name: "Hypnotherapy", icon: "eye" },
      { id: "yoga-pranayam", name: "Yoga", icon: "activity" },
      { id: "neo-natal-pregnancy-yoga", name: "Neo Natal Peg Yoga", icon: "sunrise" },
      { id: "garbsanskar-therapy", name: "Garbsanskar", icon: "sunrise" },
      { id: "homeopathy", name: "Homeopathy", icon: "droplet" },
      { id: "ayurveda", name: "Ayurveda", icon: "feather" },
      { id: "aromatherapy", name: "Aroma Therapy", icon: "wind" },
    ],
    practitioners: [],
  },
  {
    id: "financial-guidance",
    name: "Financial Guidance",
    subtitle: "Mindful Money Management",
    description:
      "Find peace in your financial journey. Our advisors offer mindful money management, planning guidance, and support to help you build a secure future.",
    subcategories: [
      { id: "savings-fix-deposits", name: "Savings and Fix Deposits", icon: "lock" },
      { id: "mutual-fund-investments", name: "Mutual Fund Investments", icon: "trending-up" },
      { id: "life-health-insurance", name: "Life & Health Insurance", icon: "shield" },
    ],
    practitioners: [],
  },
  {
    id: "nutrition-diet",
    name: "Diet & Nutrition",
    subtitle: "Balanced Wholesome Meals",
    description:
      "Nourish your body with expert guidance on balanced nutrition. Our specialists create personalized plans for your unique health needs.",
    subcategories: [
      { id: "diet-counseling-calories", name: "Diet Counseling & Calories Management", icon: "clipboard" },
      { id: "food-balancing-weight", name: "Food Balancing and Weight Management", icon: "activity" },
      { id: "special-health-diet", name: "Special Health Centric Diet Plans", icon: "heart" },
      { id: "obesity-lethargy", name: "Obesity & Lethargy Counseling", icon: "zap" },
    ],
    practitioners: [],
  },
  {
    id: "animal-healing",
    name: "Animal Healing",
    subtitle: "Healing for Our Animal Companions",
    description:
      "Extend the gift of healing to the animals in your life. Our specialists offer energy healing, Reiki, and holistic therapies for pets and animals.",
    subcategories: [
      { id: "animal-energy-healing", name: "Animal / Birds Energy Healing", icon: "zap" },
      { id: "pet-wellness", name: "Pet Wellness Guidance", icon: "heart" },
    ],
    practitioners: [],
  },
];

export function normalizeCategoryKey(value: string): string {
  return value.toLowerCase().trim().replace(/_/g, "-").replace(/\s+/g, "-");
}

/** Match a practitioner `category` value to a template (by id or display name). */
export function findCategoryTemplate(
  templates: Category[],
  practitionerCategory: string
): Category | undefined {
  const key = normalizeCategoryKey(practitionerCategory);
  return templates.find((c) => {
    const idKey = normalizeCategoryKey(c.id);
    const nameKey = normalizeCategoryKey(c.name);
    return idKey === key || nameKey === key;
  });
}

export function getCategoryById(categoryId: string): Category | undefined {
  const key = normalizeCategoryKey(categoryId);
  return categories.find(
    (cat) => normalizeCategoryKey(cat.id) === key || normalizeCategoryKey(cat.name) === key
  );
}

export function getCategoryNames(): string[] {
  return categories.map((c) => c.name);
}

export function getSubcategoryNamesForCategory(categoryName: string): string[] {
  const cat = categories.find((c) => c.name === categoryName);
  return cat?.subcategories.map((s) => s.name) ?? [];
}

export function emptyCategoryTemplates(): Category[] {
  return categories.map((c) => ({ ...c, practitioners: [] }));
}
