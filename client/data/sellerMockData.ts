export interface SellerProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  status: "Active" | "Low Stock" | "Out of Stock";
  views?: number;
  saves?: number;
  cartAdds?: number;
  purchases?: number;
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
    views: 342,
    saves: 58,
    cartAdds: 41,
    purchases: 28,
  },
  {
    id: "sel-2",
    name: "Evil Eye Protection Bracelet",
    description: "Woven with intention and featuring a traditional Nazar bead, this bracelet serves as a gentle guardian against negative energies.",
    price: 1850,
    category: "Spiritual Manifestation & Protection",
    stock: 3,
    status: "Low Stock",
    views: 210,
    saves: 34,
    cartAdds: 22,
    purchases: 19,
  },
  {
    id: "sel-3",
    name: "Organic Rose Face Serum",
    description: "A lightweight serum blending rosehip oil, vitamin E, and aloe vera to nourish and restore your skin's natural radiance.",
    price: 3499,
    category: "Mindful Radiance",
    stock: 15,
    status: "Active",
    views: 488,
    saves: 92,
    cartAdds: 67,
    purchases: 44,
  },
  {
    id: "sel-4",
    name: "Green Superfood Blend",
    description: "A nutrient-dense powder of spirulina, moringa, and wheatgrass to support your daily wellness and natural vitality.",
    price: 3200,
    category: "Conscious Nutrition",
    stock: 0,
    status: "Out of Stock",
    views: 156,
    saves: 29,
    cartAdds: 14,
    purchases: 12,
  },
  {
    id: "sel-5",
    name: "Copper Meditation Pyramid",
    description: "A handcrafted copper pyramid designed to focus energy during meditation and create a sacred space in your home.",
    price: 8999,
    category: "Spirit & Space",
    stock: 8,
    status: "Active",
    views: 621,
    saves: 118,
    cartAdds: 73,
    purchases: 31,
  },
  {
    id: "sel-6",
    name: "Complete Puja Kit",
    description: "A thoughtfully assembled kit with incense, diyas, kumkum, and sacred accessories for your daily prayer ritual.",
    price: 4500,
    category: "Sacred Rituals",
    stock: 12,
    status: "Active",
    views: 295,
    saves: 47,
    cartAdds: 38,
    purchases: 26,
  },
  {
    id: "sel-7",
    name: "Eco Cork Yoga Mat",
    description: "A sustainably made cork and natural rubber yoga mat with excellent grip, antimicrobial properties, and a grounding feel.",
    price: 6499,
    category: "Daily Vitality",
    stock: 5,
    status: "Low Stock",
    views: 374,
    saves: 88,
    cartAdds: 55,
    purchases: 23,
  },
  {
    id: "sel-8",
    name: "Turmeric Glow Mask",
    description: "An Ayurvedic-inspired face mask combining turmeric, sandalwood, and honey for a gentle, brightening ritual.",
    price: 1999,
    category: "Mindful Radiance",
    stock: 20,
    status: "Active",
    views: 532,
    saves: 104,
    cartAdds: 79,
    purchases: 52,
  },
];

export const sellerStats = {
  totalProducts: 8,
  activeCategories: 6,
  lowStockItems: 2,
  revenue: 156800,
  totalSales: 235,
  ordersThisWeek: 18,
  pendingOrders: 5,
  storeRating: 4.7,
  walletBalance: 42350,
  pendingPayout: 12800,
};

export type OrderStatus = "Pending" | "Packed" | "Shipped" | "Delivered" | "Cancelled";
export type PaymentStatus = "Paid" | "Pending" | "Refunded";

export interface SellerOrder {
  id: string;
  orderId: string;
  customerName: string;
  productName: string;
  productCategory: string;
  price: number;
  qty: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  date: string;
}

export const sellerOrders: SellerOrder[] = [
  { id: "ord-1", orderId: "#NG-7823", customerName: "Ananya Mehta", productName: "Turmeric Glow Mask", productCategory: "Mindful Radiance", price: 1999, qty: 2, status: "Pending", paymentStatus: "Paid", date: "10 May 2026" },
  { id: "ord-2", orderId: "#NG-7819", customerName: "Rohan Desai", productName: "Switchword Energy Circle", productCategory: "Spiritual", price: 2499, qty: 1, status: "Pending", paymentStatus: "Paid", date: "10 May 2026" },
  { id: "ord-3", orderId: "#NG-7815", customerName: "Preethi Nair", productName: "Complete Puja Kit", productCategory: "Sacred Rituals", price: 4500, qty: 1, status: "Pending", paymentStatus: "Paid", date: "9 May 2026" },
  { id: "ord-4", orderId: "#NG-7811", customerName: "Vivek Sharma", productName: "Eco Cork Yoga Mat", productCategory: "Daily Vitality", price: 6499, qty: 1, status: "Pending", paymentStatus: "Pending", date: "9 May 2026" },
  { id: "ord-5", orderId: "#NG-7804", customerName: "Divya Krishnan", productName: "Copper Meditation Pyramid", productCategory: "Spirit & Space", price: 8999, qty: 1, status: "Pending", paymentStatus: "Paid", date: "8 May 2026" },
  { id: "ord-6", orderId: "#NG-7799", customerName: "Meera Iyer", productName: "Organic Rose Face Serum", productCategory: "Mindful Radiance", price: 3499, qty: 1, status: "Packed", paymentStatus: "Paid", date: "8 May 2026" },
  { id: "ord-7", orderId: "#NG-7795", customerName: "Arjun Pillai", productName: "Evil Eye Protection Bracelet", productCategory: "Spiritual", price: 1850, qty: 2, status: "Packed", paymentStatus: "Paid", date: "7 May 2026" },
  { id: "ord-8", orderId: "#NG-7790", customerName: "Kavitha Rao", productName: "Turmeric Glow Mask", productCategory: "Mindful Radiance", price: 1999, qty: 1, status: "Packed", paymentStatus: "Paid", date: "7 May 2026" },
  { id: "ord-9", orderId: "#NG-7783", customerName: "Suresh Kumar", productName: "Complete Puja Kit", productCategory: "Sacred Rituals", price: 4500, qty: 2, status: "Shipped", paymentStatus: "Paid", date: "6 May 2026" },
  { id: "ord-10", orderId: "#NG-7778", customerName: "Lakshmi Bhat", productName: "Eco Cork Yoga Mat", productCategory: "Daily Vitality", price: 6499, qty: 1, status: "Shipped", paymentStatus: "Paid", date: "5 May 2026" },
  { id: "ord-11", orderId: "#NG-7771", customerName: "Rahul Menon", productName: "Copper Meditation Pyramid", productCategory: "Spirit & Space", price: 8999, qty: 1, status: "Shipped", paymentStatus: "Paid", date: "4 May 2026" },
  { id: "ord-12", orderId: "#NG-7765", customerName: "Sneha Patil", productName: "Organic Rose Face Serum", productCategory: "Mindful Radiance", price: 3499, qty: 2, status: "Delivered", paymentStatus: "Paid", date: "3 May 2026" },
  { id: "ord-13", orderId: "#NG-7760", customerName: "Kiran Shetty", productName: "Switchword Energy Circle", productCategory: "Spiritual", price: 2499, qty: 1, status: "Delivered", paymentStatus: "Paid", date: "2 May 2026" },
  { id: "ord-14", orderId: "#NG-7752", customerName: "Pooja Agarwal", productName: "Turmeric Glow Mask", productCategory: "Mindful Radiance", price: 1999, qty: 3, status: "Delivered", paymentStatus: "Paid", date: "1 May 2026" },
  { id: "ord-15", orderId: "#NG-7744", customerName: "Nitesh Gupta", productName: "Green Superfood Blend", productCategory: "Nutrition", price: 3200, qty: 1, status: "Cancelled", paymentStatus: "Refunded", date: "29 Apr 2026" },
  { id: "ord-16", orderId: "#NG-7739", customerName: "Asha Thomas", productName: "Evil Eye Protection Bracelet", productCategory: "Spiritual", price: 1850, qty: 1, status: "Cancelled", paymentStatus: "Refunded", date: "28 Apr 2026" },
];

export interface SellerReview {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  productName: string;
  date: string;
  sellerReply?: string;
  sentiment: "positive" | "neutral" | "negative";
}

export const sellerReviews: SellerReview[] = [
  { id: "rev-1", customerName: "Ananya M.", rating: 5, comment: "The Turmeric Glow Mask is absolutely divine. My skin has never felt so soft and radiant. Will definitely order again!", productName: "Turmeric Glow Mask", date: "8 May 2026", sentiment: "positive", sellerReply: "Thank you so much, Ananya! Wishing you continued radiance." },
  { id: "rev-2", customerName: "Rohan D.", rating: 5, comment: "The Switchword Energy Circle arrived beautifully packaged. The craftsmanship is exceptional. Highly recommend.", productName: "Switchword Energy Circle", date: "7 May 2026", sentiment: "positive" },
  { id: "rev-3", customerName: "Meera I.", rating: 4, comment: "The Rose Face Serum is lovely but I wish the bottle was a bit larger for the price. Scent and texture are perfect.", productName: "Organic Rose Face Serum", date: "5 May 2026", sentiment: "positive" },
  { id: "rev-4", customerName: "Kavitha R.", rating: 5, comment: "Perfect puja kit! Everything was thoughtfully selected. The incense fragrance is so calming.", productName: "Complete Puja Kit", date: "3 May 2026", sentiment: "positive" },
  { id: "rev-5", customerName: "Suresh K.", rating: 3, comment: "The yoga mat is good but slightly thinner than I expected. Grip is excellent though.", productName: "Eco Cork Yoga Mat", date: "1 May 2026", sentiment: "neutral" },
  { id: "rev-6", customerName: "Preethi N.", rating: 5, comment: "The Copper Meditation Pyramid has transformed my meditation practice. Such a beautiful and powerful piece.", productName: "Copper Meditation Pyramid", date: "28 Apr 2026", sentiment: "positive" },
  { id: "rev-7", customerName: "Nitesh G.", rating: 2, comment: "Disappointed with the Superfood Blend. The texture was clumpy and not easy to mix. Expected better quality.", productName: "Green Superfood Blend", date: "25 Apr 2026", sentiment: "negative", sellerReply: "We are so sorry for your experience, Nitesh. We have reached out to resolve this for you." },
];

export interface SellerPromo {
  id: string;
  code: string;
  type: "Percentage" | "Fixed";
  value: number;
  usageCount: number;
  usageLimit: number;
  expiry: string;
  status: "Active" | "Expired" | "Paused";
  description: string;
}

export const sellerPromos: SellerPromo[] = [
  { id: "promo-1", code: "GLOW20", type: "Percentage", value: 20, usageCount: 38, usageLimit: 100, expiry: "31 May 2026", status: "Active", description: "20% off skincare products" },
  { id: "promo-2", code: "SACRED500", type: "Fixed", value: 500, usageCount: 14, usageLimit: 50, expiry: "20 May 2026", status: "Active", description: "Rs. 500 off on rituals & spiritual items" },
  { id: "promo-3", code: "WELLNESS15", type: "Percentage", value: 15, usageCount: 50, usageLimit: 50, expiry: "10 May 2026", status: "Expired", description: "Wellness week special — 15% off" },
  { id: "promo-4", code: "YOGI10", type: "Percentage", value: 10, usageCount: 7, usageLimit: 30, expiry: "15 Jun 2026", status: "Paused", description: "10% off yoga & vitality products" },
];

export interface WalletTransaction {
  id: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  date: string;
}

export const walletTransactions: WalletTransaction[] = [
  { id: "txn-1", description: "Order #NG-7765 - Rose Serum x2", amount: 6998, type: "credit", date: "3 May 2026" },
  { id: "txn-2", description: "Order #NG-7760 - Switchword Circle", amount: 2499, type: "credit", date: "2 May 2026" },
  { id: "txn-3", description: "Payout to Bank Account", amount: 18000, type: "debit", date: "1 May 2026" },
  { id: "txn-4", description: "Order #NG-7752 - Glow Mask x3", amount: 5997, type: "credit", date: "1 May 2026" },
  { id: "txn-5", description: "Refund #NG-7744 - Superfood Blend", amount: 3200, type: "debit", date: "29 Apr 2026" },
  { id: "txn-6", description: "Order #NG-7739 cancelled - Bracelet", amount: 1850, type: "debit", date: "28 Apr 2026" },
  { id: "txn-7", description: "Order #NG-7720 - Meditation Pyramid", amount: 8999, type: "credit", date: "27 Apr 2026" },
  { id: "txn-8", description: "Order #NG-7715 - Puja Kit", amount: 4500, type: "credit", date: "26 Apr 2026" },
];

export const weeklyRevenueData = [
  { day: "Mon", amount: 12400 },
  { day: "Tue", amount: 8200 },
  { day: "Wed", amount: 18600 },
  { day: "Thu", amount: 9800 },
  { day: "Fri", amount: 22100 },
  { day: "Sat", amount: 31500 },
  { day: "Sun", amount: 15200 },
];

export const monthlyRevenueData = [
  { month: "Jan", amount: 82000 },
  { month: "Feb", amount: 95000 },
  { month: "Mar", amount: 118000 },
  { month: "Apr", amount: 104000 },
  { month: "May", amount: 156800 },
];

export const categoryPerformance = [
  { category: "Mindful Radiance", sales: 96, revenue: 52400, color: "#E8A0B5" },
  { category: "Spiritual", sales: 47, revenue: 41200, color: "#7B68EE" },
  { category: "Spirit & Space", sales: 31, revenue: 27900, color: "#6CB4D9" },
  { category: "Sacred Rituals", sales: 26, revenue: 19800, color: "#D4943A" },
  { category: "Daily Vitality", sales: 23, revenue: 11700, color: "#7BC47F" },
  { category: "Nutrition", sales: 12, revenue: 3800, color: "#4A9A5B" },
];

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
    case "Spiritual Manifestation & Protection": return "Spiritual";
    case "Mindful Radiance": return "Beauty";
    case "Conscious Nutrition": return "Nutrition";
    case "Spirit & Space": return "Space";
    case "Sacred Rituals": return "Rituals";
    case "Daily Vitality": return "Vitality";
    default: return category;
  }
}

export function getStockColor(status: SellerProduct["status"]): { bg: string; text: string } {
  switch (status) {
    case "Active": return { bg: "rgba(1, 50, 32, 0.1)", text: "#013220" };
    case "Low Stock": return { bg: "rgba(212, 148, 58, 0.12)", text: "#B8860B" };
    case "Out of Stock": return { bg: "rgba(139, 58, 58, 0.1)", text: "#8B3A3A" };
  }
}

export function getOrderStatusColor(status: OrderStatus): { bg: string; text: string } {
  switch (status) {
    case "Pending": return { bg: "rgba(212, 148, 58, 0.12)", text: "#B8860B" };
    case "Packed": return { bg: "rgba(108, 180, 217, 0.15)", text: "#2B6CB0" };
    case "Shipped": return { bg: "rgba(123, 196, 127, 0.15)", text: "#276749" };
    case "Delivered": return { bg: "rgba(1, 50, 32, 0.1)", text: "#013220" };
    case "Cancelled": return { bg: "rgba(139, 58, 58, 0.1)", text: "#8B3A3A" };
  }
}

export function getPaymentStatusColor(status: PaymentStatus): { bg: string; text: string } {
  switch (status) {
    case "Paid": return { bg: "rgba(1, 50, 32, 0.1)", text: "#013220" };
    case "Pending": return { bg: "rgba(212, 148, 58, 0.12)", text: "#B8860B" };
    case "Refunded": return { bg: "rgba(139, 58, 58, 0.1)", text: "#8B3A3A" };
  }
}
