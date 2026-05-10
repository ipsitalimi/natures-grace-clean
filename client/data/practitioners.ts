import { ImageSourcePropType } from "react-native";
import { Colors } from "@/constants/theme";

import drNeelamPhoto from "../../assets/images/neelam.jpg";

export { drNeelamPhoto as drNeelamLocalPhoto };

export interface Practitioner {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  photo: string;
  localPhoto?: ImageSourcePropType;
  bio: string;
  experience: string;
  certifications: string[];
  rating: number;
  reviewCount: number;
  pricePerSession: number;
  availability: string;
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

const healingsPractitioners: Practitioner[] = [
  {
    id: "h1",
    name: "Dr. Neelam Parwani",
    category: "Healings",
    subcategory: "Reiki Healing",
    photo: "",
    localPhoto: drNeelamPhoto,
    bio: "Reiki Grand Master and TEDx Speaker with over 20 years of experience in energy healing and spiritual transformation.",
    experience: "20+ years in Reiki and Energy Healing",
    certifications: ["Reiki Grand Master", "Certified Pranic Healer", "TEDx Speaker"],
    rating: 4.9,
    reviewCount: 342,
    pricePerSession: 2500,
    availability: "Mon-Sat",
  },
  {
    id: "h2",
    name: "Ananya Sharma",
    category: "Healings",
    subcategory: "Chakra Healing",
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face",
    bio: "Chakra healing specialist focused on restoring balance and inner peace through ancient techniques.",
    experience: "12 years in Chakra Healing",
    certifications: ["Certified Chakra Healer", "Yoga Alliance Certified"],
    rating: 4.8,
    reviewCount: 189,
    pricePerSession: 1800,
    availability: "Tue-Sun",
  },
  {
    id: "h3",
    name: "Vikram Mehta",
    category: "Healings",
    subcategory: "Energy and Chakra Balancing",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
    bio: "Energy balancing practitioner combining traditional wisdom with modern wellness approaches.",
    experience: "8 years in Energy Therapy",
    certifications: ["Energy Healing Practitioner", "Meditation Teacher"],
    rating: 4.7,
    reviewCount: 156,
    pricePerSession: 1500,
    availability: "Wed-Mon",
  },
  {
    id: "h4",
    name: "Priya Desai",
    category: "Healings",
    subcategory: "Mindful Meditation",
    photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face",
    bio: "Mindfulness and meditation guide using sound therapy and guided practices to promote deep relaxation and mental clarity.",
    experience: "10 years in Meditation & Mindfulness",
    certifications: ["Certified Mindfulness Teacher", "Sound Healing Certified"],
    rating: 4.8,
    reviewCount: 203,
    pricePerSession: 2000,
    availability: "Mon-Fri",
  },
  {
    id: "h5",
    name: "Ritu Agarwal",
    category: "Healings",
    subcategory: "Animals & Birds Healing",
    photo: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=200&h=200&fit=crop&crop=face",
    bio: "Dedicated animal Reiki healer specializing in energy healing for pets, strays, and birds with compassionate care.",
    experience: "6 years in Animal Healing",
    certifications: ["Animal Reiki Practitioner", "Certified Pet Healer"],
    rating: 4.7,
    reviewCount: 98,
    pricePerSession: 1200,
    availability: "Mon-Sat",
  },
];

const counselingPractitioners: Practitioner[] = [
  {
    id: "c1",
    name: "Dr. Meera Kapoor",
    category: "Counseling",
    subcategory: "Trauma Counseling",
    photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face",
    bio: "Licensed clinical psychologist specializing in trauma recovery and PTSD with a gentle, evidence-based approach.",
    experience: "15 years in Clinical Psychology",
    certifications: ["PhD Psychology", "Licensed Clinical Psychologist", "CBT Certified"],
    rating: 4.9,
    reviewCount: 412,
    pricePerSession: 3000,
    availability: "Mon-Sat",
  },
  {
    id: "c2",
    name: "Arjun Nair",
    category: "Counseling",
    subcategory: "Relationship Counseling",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
    bio: "Relationship counselor helping individuals and couples build healthier connections and communication.",
    experience: "11 years in Relationship Counseling",
    certifications: ["Certified Relationship Counselor", "EFT Practitioner"],
    rating: 4.7,
    reviewCount: 178,
    pricePerSession: 2200,
    availability: "Tue-Sun",
  },
  {
    id: "c3",
    name: "Shalini Gupta",
    category: "Counseling",
    subcategory: "Grief & Depression Counseling",
    photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
    bio: "Grief and depression counselor providing compassionate support during difficult life transitions.",
    experience: "9 years in Grief Counseling",
    certifications: ["Grief Counseling Certified", "Trauma-Informed Care"],
    rating: 4.8,
    reviewCount: 145,
    pricePerSession: 1800,
    availability: "Mon-Fri",
  },
  {
    id: "c4",
    name: "Neha Joshi",
    category: "Counseling",
    subcategory: "Teen and Parents Counseling",
    photo: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=200&h=200&fit=crop&crop=face",
    bio: "Child and adolescent psychologist helping teens and parents navigate communication challenges and emotional growth.",
    experience: "10 years in Child & Adolescent Psychology",
    certifications: ["Child Psychology Specialist", "Family Therapy Certified"],
    rating: 4.8,
    reviewCount: 167,
    pricePerSession: 2500,
    availability: "Mon-Sat",
  },
  {
    id: "c6",
    name: "Raghav Menon",
    category: "Counseling",
    subcategory: "Personal Counseling",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
    bio: "Personal growth counselor helping individuals find clarity, confidence, and purpose through supportive guidance.",
    experience: "8 years in Personal Development Counseling",
    certifications: ["Life Coach Certified", "NLP Practitioner"],
    rating: 4.7,
    reviewCount: 112,
    pricePerSession: 2000,
    availability: "Mon-Fri",
  },
];

const therapiesPractitioners: Practitioner[] = [
  {
    id: "t1",
    name: "Dr. Rajesh Iyer",
    category: "Therapies",
    subcategory: "Naturopathy",
    photo: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face",
    bio: "Naturopathy physician focusing on holistic wellness through natural remedies and lifestyle modifications.",
    experience: "18 years in Naturopathy",
    certifications: ["BNYS Degree", "Certified Naturopath", "Ayurveda Specialist"],
    rating: 4.9,
    reviewCount: 289,
    pricePerSession: 2800,
    availability: "Mon-Sat",
  },
  {
    id: "t3",
    name: "Suresh Menon",
    category: "Therapies",
    subcategory: "Su-Jok Therapy",
    photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=face",
    bio: "Su-Jok therapist trained in Korean acupressure healing techniques for pain relief and wellness.",
    experience: "14 years in Su-Jok Therapy",
    certifications: ["Su-Jok Master", "Acupressure Practitioner"],
    rating: 4.8,
    reviewCount: 267,
    pricePerSession: 1600,
    availability: "Tue-Sat",
  },
  {
    id: "t6",
    name: "Tanvi Kulkarni",
    category: "Therapies",
    subcategory: "Hypnotherapy",
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face",
    bio: "Clinical hypnotherapist helping clients overcome fears, habits, and emotional blocks through guided hypnosis.",
    experience: "9 years in Hypnotherapy",
    certifications: ["Certified Clinical Hypnotherapist", "NLP Master"],
    rating: 4.7,
    reviewCount: 156,
    pricePerSession: 2500,
    availability: "Tue-Sun",
  },
  {
    id: "t8",
    name: "Acharya Ramesh",
    category: "Therapies",
    subcategory: "Yoga",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
    bio: "Yoga master and Pranayam expert with deep knowledge of traditional Hatha and Ashtanga yoga practices.",
    experience: "20 years in Yoga & Pranayam",
    certifications: ["Yoga Acharya", "E-RYT 500", "Pranayam Master"],
    rating: 4.9,
    reviewCount: 345,
    pricePerSession: 1800,
    availability: "Daily",
  },
  {
    id: "t9",
    name: "Dr. Sunita Verma",
    category: "Therapies",
    subcategory: "Neo Natal Peg Yoga",
    photo: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=200&h=200&fit=crop&crop=face",
    bio: "Prenatal and postnatal yoga specialist supporting expectant and new mothers through gentle movement and breathwork.",
    experience: "10 years in Prenatal Yoga",
    certifications: ["Prenatal Yoga Certified", "Postnatal Recovery Specialist"],
    rating: 4.8,
    reviewCount: 167,
    pricePerSession: 2000,
    availability: "Mon-Sat",
  },
];

const spiritualGuidancePractitioners: Practitioner[] = [
  {
    id: "s1",
    name: "Mystic Anand",
    category: "Spiritual Guidance",
    subcategory: "Tarot Card Reading",
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face",
    bio: "Intuitive tarot reader and spiritual guide helping seekers find clarity and direction in life.",
    experience: "16 years in Tarot and Intuitive Reading",
    certifications: ["Certified Tarot Master", "Intuitive Counselor"],
    rating: 4.9,
    reviewCount: 456,
    pricePerSession: 2000,
    availability: "Daily",
  },
  {
    id: "s2",
    name: "Shanti Devi",
    category: "Spiritual Guidance",
    subcategory: "Astrology",
    photo: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop&crop=face",
    bio: "Astrology and numerology expert providing insights into life patterns and cosmic guidance.",
    experience: "22 years in Vedic Astrology",
    certifications: ["Jyotish Acharya", "Numerology Expert"],
    rating: 4.8,
    reviewCount: 378,
    pricePerSession: 2500,
    availability: "Mon-Sat",
  },
  {
    id: "s4",
    name: "Pandit Suraj Kumar",
    category: "Spiritual Guidance",
    subcategory: "Numerology",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
    bio: "Numerology expert helping individuals understand their life path numbers and align with their cosmic purpose.",
    experience: "15 years in Numerology",
    certifications: ["Certified Numerologist", "Vedic Mathematics"],
    rating: 4.7,
    reviewCount: 234,
    pricePerSession: 1500,
    availability: "Mon-Sat",
  },
];

const financialGuidancePractitioners: Practitioner[] = [
  {
    id: "f1",
    name: "Arun Krishnan",
    category: "Financial Guidance",
    subcategory: "Mutual Fund Investments",
    photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=face",
    bio: "Certified financial planner helping individuals achieve financial peace through mindful money management and long-term planning.",
    experience: "15 years in Financial Planning",
    certifications: ["Certified Financial Planner (CFP)", "Chartered Wealth Manager"],
    rating: 4.9,
    reviewCount: 287,
    pricePerSession: 3500,
    availability: "Mon-Sat",
  },
  {
    id: "f2",
    name: "Divya Sharma",
    category: "Financial Guidance",
    subcategory: "Life & Health Insurance",
    photo: "https://images.unsplash.com/photo-1598550874175-4d0ef436c909?w=200&h=200&fit=crop&crop=face",
    bio: "Insurance advisor specializing in life and health insurance planning to protect families and secure futures.",
    experience: "10 years in Insurance Advisory",
    certifications: ["IRDA Licensed Advisor", "Insurance Planning Specialist"],
    rating: 4.8,
    reviewCount: 198,
    pricePerSession: 2500,
    availability: "Tue-Sun",
  },
  {
    id: "f3",
    name: "Rajan Verma",
    category: "Financial Guidance",
    subcategory: "Savings and Fix Deposits",
    photo: "https://images.unsplash.com/photo-1556157382-97eda2d62296?w=200&h=200&fit=crop&crop=face",
    bio: "Savings and fixed deposit specialist guiding individuals toward secure and disciplined financial growth.",
    experience: "18 years in Banking & Savings",
    certifications: ["Banking Finance Specialist", "SEBI Registered Advisor"],
    rating: 4.7,
    reviewCount: 234,
    pricePerSession: 3000,
    availability: "Mon-Fri",
  },
  {
    id: "f4",
    name: "Nisha Patel",
    category: "Financial Guidance",
    subcategory: "Mutual Fund Investments",
    photo: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop&crop=face",
    bio: "Holistic financial advisor integrating life goals with mutual fund planning for balanced prosperity.",
    experience: "12 years in Holistic Financial Planning",
    certifications: ["Certified Life Planner", "Financial Wellness Specialist"],
    rating: 4.8,
    reviewCount: 167,
    pricePerSession: 2800,
    availability: "Wed-Mon",
  },
];

const nutritionPractitioners: Practitioner[] = [
  {
    id: "n1",
    name: "Dr. Kavita Deshmukh",
    category: "Diet & Nutrition",
    subcategory: "Diet Counseling & Calories Management",
    photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face",
    bio: "Certified dietitian and nutritionist helping clients achieve health goals through personalized diet plans and calorie management.",
    experience: "14 years in Clinical Nutrition",
    certifications: ["MSc Clinical Nutrition", "Certified Dietitian"],
    rating: 4.9,
    reviewCount: 267,
    pricePerSession: 2000,
    availability: "Mon-Sat",
  },
  {
    id: "n2",
    name: "Sneha Kulkarni",
    category: "Diet & Nutrition",
    subcategory: "Food Balancing and Weight Management",
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face",
    bio: "Weight management specialist focusing on balanced nutrition and sustainable lifestyle changes for healthy weight goals.",
    experience: "9 years in Weight Management",
    certifications: ["Certified Weight Management Specialist", "Sports Nutrition"],
    rating: 4.8,
    reviewCount: 189,
    pricePerSession: 1800,
    availability: "Tue-Sun",
  },
  {
    id: "n3",
    name: "Dr. Amit Saxena",
    category: "Diet & Nutrition",
    subcategory: "Special Health Centric Diet Plans",
    photo: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face",
    bio: "Therapeutic nutrition expert creating specialized diet plans for diabetes, heart health, PCOS, thyroid, and other health conditions.",
    experience: "16 years in Therapeutic Nutrition",
    certifications: ["PhD Nutrition Science", "Diabetes Educator"],
    rating: 4.9,
    reviewCount: 312,
    pricePerSession: 2500,
    availability: "Mon-Fri",
  },
  {
    id: "n4",
    name: "Ritika Agarwal",
    category: "Diet & Nutrition",
    subcategory: "Obesity & Lethargy Counseling",
    photo: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=200&h=200&fit=crop&crop=face",
    bio: "Obesity and lifestyle counselor helping individuals overcome lethargy and build energetic, healthy routines.",
    experience: "8 years in Obesity Counseling",
    certifications: ["Certified Obesity Specialist", "Lifestyle Medicine"],
    rating: 4.7,
    reviewCount: 145,
    pricePerSession: 1500,
    availability: "Mon-Sat",
  },
];

const CATEGORY_DISPLAY_ORDER = [
  "healings",
  "spiritual_guidance",
  "spiritual-guidance",
  "counseling",
  "therapies",
  "animal-healing",
  "diet_nutrition",
  "nutrition-diet",
  "financial_guidance",
  "financial-guidance",
];

export const categories: Category[] = [
  {
    id: "healings",
    name: "Healings",
    subtitle: "Healing & Energy Balancing",
    description: "Experience the gentle power of energy healing. Our practitioners use Reiki, Chakra balancing, and more to restore harmony to your mind, body, and spirit.",
    subcategories: [
      { id: "reiki-healing", name: "Reiki Healing", icon: "sun" },
      { id: "chakra-healing", name: "Chakra Healing", icon: "target" },
      { id: "mindful-meditation", name: "Mindful Meditation", icon: "eye" },
      { id: "energy-chakra-balancing", name: "Energy and Chakra Balancing", icon: "zap" },
      { id: "sound-healing", name: "Sound Healing", icon: "music" },
    ],
    practitioners: healingsPractitioners,
  },
  {
    id: "spiritual-guidance",
    name: "Spiritual Guidance",
    subtitle: "Intuitive Insights",
    description: "Seek wisdom and clarity on your spiritual path. Our guides offer intuitive readings, astrology, and more to illuminate your journey.",
    subcategories: [
      { id: "tarot-card-reading", name: "Tarot Card Reading", icon: "layers" },
      { id: "astrology", name: "Astrology", icon: "star" },
      { id: "numerology", name: "Numerology", icon: "hash" },
      { id: "vastu", name: "Vastu", icon: "home" },
      { id: "akashic-readings", name: "Akashic Readings", icon: "book-open" },
      { id: "signature-analysis", name: "Signature Analysis", icon: "edit-3" },
    ],
    practitioners: spiritualGuidancePractitioners,
  },
  {
    id: "counseling",
    name: "Counseling",
    subtitle: "Emotional & Mental Support",
    description: "Find a safe space to share your thoughts and feelings. Our compassionate counselors provide emotional support and guidance through life's challenges.",
    subcategories: [
      { id: "relationship-counseling", name: "Relationship Counseling", icon: "heart" },
      { id: "personal-counseling", name: "Personal Counseling", icon: "user" },
      { id: "grief-depression-counseling", name: "Grief & Depression Counseling", icon: "cloud-rain" },
      { id: "garbsanskar-counseling", name: "Garbsanskar", icon: "sunrise" },
      { id: "trauma-counseling", name: "Trauma Counseling", icon: "shield" },
      { id: "teen-parents-counseling", name: "Teen and Parents Counseling", icon: "users" },
      { id: "fertility-pregnancy-counseling", name: "Fertility and Pregnancy Counseling", icon: "feather" },
    ],
    practitioners: counselingPractitioners,
  },
  {
    id: "therapies",
    name: "Therapies",
    subtitle: "Holistic Treatments",
    description: "Discover holistic treatments that nurture your whole being. From naturopathy to yoga, our therapists offer natural paths to wellness.",
    subcategories: [
      { id: "su-jok-therapy", name: "Su-Jok Therapy", icon: "target" },
      { id: "naturopathy", name: "Naturopathy", icon: "sun" },
      { id: "hypnotherapy", name: "Hypnotherapy", icon: "eye" },
      { id: "yoga-pranayam", name: "Yoga", icon: "activity" },
      { id: "neo-natal-pregnancy-yoga", name: "Neo Natal Peg Yoga", icon: "heart" },
      { id: "garbsanskar-therapy", name: "Garbsanskar", icon: "sunrise" },
      { id: "homeopathy", name: "Homeopathy", icon: "droplet" },
      { id: "ayurveda", name: "Ayurveda", icon: "feather" },
      { id: "aromatherapy", name: "Aroma Therapy", icon: "wind" },
    ],
    practitioners: therapiesPractitioners,
  },
  {
    id: "financial-guidance",
    name: "Financial Guidance",
    subtitle: "Mindful Money Management",
    description: "Find peace in your financial journey. Our advisors offer mindful money management, planning guidance, and support to help you build a secure future.",
    subcategories: [
      { id: "savings-fix-deposits", name: "Savings and Fix Deposits", icon: "lock" },
      { id: "mutual-fund-investments", name: "Mutual Fund Investments", icon: "trending-up" },
      { id: "life-health-insurance", name: "Life & Health Insurance", icon: "shield" },
    ],
    practitioners: financialGuidancePractitioners,
  },
  {
    id: "nutrition-diet",
    name: "Diet & Nutrition",
    subtitle: "Balanced Wholesome Meals",
    description: "Nourish your body with expert guidance on balanced nutrition. Our specialists create personalized plans for your unique health needs.",
    subcategories: [
      { id: "diet-counseling-calories", name: "Diet Counseling & Calories Management", icon: "clipboard" },
      { id: "food-balancing-weight", name: "Food Balancing and Weight Management", icon: "activity" },
      { id: "special-health-diet", name: "Special Health Centric Diet Plans", icon: "heart" },
      { id: "obesity-lethargy", name: "Obesity & Lethargy Counseling", icon: "zap" },
    ],
    practitioners: nutritionPractitioners,
  },
  {
    id: "animal-healing",
    name: "Animal Healing",
    subtitle: "Healing for Our Animal Companions",
    description: "Extend the gift of healing to the animals in your life. Our specialists offer energy healing, Reiki, and holistic therapies for pets and animals.",
    subcategories: [
      { id: "animal-energy-healing", name: "Animal / Birds Energy Healing", icon: "zap" },
      { id: "pet-wellness", name: "Pet Wellness Guidance", icon: "heart" },
    ],
    practitioners: [],
  },
];

export function getCategoryById(categoryId: string): Category | undefined {
  return categories.find((cat) => cat.id === categoryId);
}

export function getPractitionerById(practitionerId: string): Practitioner | undefined {
  for (const category of categories) {
    const practitioner = category.practitioners.find((p) => p.id === practitionerId);
    if (practitioner) return practitioner;
  }
  return undefined;
}

export function getAllPractitioners(): Practitioner[] {
  return categories.flatMap((cat) => cat.practitioners);
}
