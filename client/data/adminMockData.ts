export interface AdminUser {
  id: string;
  name: string;
  email: string;
  status: "Active" | "Inactive" | "Suspended";
  role: "User" | "Practitioner" | "Seller" | "Admin";
  joinedDate: string;
  phone: string;
  sessionsCount: number;
}

export interface AdminSession {
  id: string;
  userName: string;
  practitionerName: string;
  service: string;
  date: string;
  time: string;
  status: "Upcoming" | "Completed" | "Cancelled";
  duration: string;
}

export interface AdminActivity {
  id: string;
  type: "booking" | "user" | "review" | "event" | "store";
  description: string;
  timeAgo: string;
}

export interface AdminPractitioner {
  id: string;
  name: string;
  category: string;
  experience: string;
  certifications: string[];
  rating: number;
  price: number;
  enabled: boolean;
  photo: string | null;
}

export interface AdminProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

export interface AdminEvent {
  id: string;
  title: string;
  date: string;
  mode: string;
  price: string;
  status: "Active" | "Draft" | "Ended";
}

export interface AdminDiscussion {
  id: string;
  title: string;
  author: string;
  repliesCount: number;
  flagged: boolean;
  date: string;
}

export interface AdminResource {
  id: string;
  title: string;
  type: "Article" | "Audio Session" | "Practice";
  duration?: string;
  date: string;
}

export const adminStats = {
  totalUsers: 1248,
  practitioners: 14,
  bookings: 386,
  products: 18,
  communityPosts: 52,
};

export const adminUsers: AdminUser[] = [
  { id: "u1", name: "Priya Sharma", email: "priya.sharma@email.com", status: "Active", role: "User", joinedDate: "Jan 12, 2025", phone: "+91 98765 43210", sessionsCount: 8 },
  { id: "u2", name: "Arjun Mehta", email: "arjun.mehta@email.com", status: "Active", role: "Practitioner", joinedDate: "Feb 3, 2025", phone: "+91 87654 32109", sessionsCount: 5 },
  { id: "u3", name: "Meera Joshi", email: "meera.joshi@email.com", status: "Inactive", role: "User", joinedDate: "Mar 18, 2025", phone: "+91 76543 21098", sessionsCount: 2 },
  { id: "u4", name: "Vikram Singh", email: "vikram.singh@email.com", status: "Active", role: "Seller", joinedDate: "Apr 7, 2025", phone: "+91 65432 10987", sessionsCount: 12 },
  { id: "u5", name: "Ananya Desai", email: "ananya.desai@email.com", status: "Suspended", role: "User", joinedDate: "May 22, 2025", phone: "+91 54321 09876", sessionsCount: 0 },
  { id: "u6", name: "Rohit Kumar", email: "rohit.kumar@email.com", status: "Active", role: "Admin", joinedDate: "Jun 14, 2025", phone: "+91 43210 98765", sessionsCount: 3 },
  { id: "u7", name: "Kavita Nair", email: "kavita.nair@email.com", status: "Active", role: "Practitioner", joinedDate: "Jul 9, 2025", phone: "+91 32109 87654", sessionsCount: 7 },
  { id: "u8", name: "Deepak Gupta", email: "deepak.gupta@email.com", status: "Inactive", role: "User", joinedDate: "Aug 1, 2025", phone: "+91 21098 76543", sessionsCount: 1 },
];

export const adminSessions: AdminSession[] = [
  { id: "s1", userName: "Priya Sharma", practitionerName: "Dr. Neelam Parwani", service: "Reiki Healing", date: "Feb 18, 2026", time: "10:00 AM", status: "Upcoming", duration: "45 mins" },
  { id: "s2", userName: "Vikram Singh", practitionerName: "Anita Deshmukh", service: "Marriage Counseling", date: "Feb 18, 2026", time: "2:00 PM", status: "Upcoming", duration: "30 mins" },
  { id: "s3", userName: "Kavita Nair", practitionerName: "Swami Premananda", service: "Meditation Session", date: "Feb 19, 2026", time: "8:00 AM", status: "Upcoming", duration: "30 mins" },
  { id: "s4", userName: "Arjun Mehta", practitionerName: "Dr. Ramesh Iyer", service: "Acupuncture", date: "Feb 19, 2026", time: "11:00 AM", status: "Upcoming", duration: "45 mins" },
  { id: "s5", userName: "Rohit Kumar", practitionerName: "Sunita Rao", service: "Yoga Therapy", date: "Feb 20, 2026", time: "6:00 AM", status: "Upcoming", duration: "15 mins" },
];

export const adminActivities: AdminActivity[] = [
  { id: "a1", type: "booking", description: "Priya Sharma booked a Reiki session", timeAgo: "10 minutes ago" },
  { id: "a2", type: "user", description: "New user Rohit Kumar registered", timeAgo: "25 minutes ago" },
  { id: "a3", type: "review", description: "Vikram Singh left a 5-star review", timeAgo: "1 hour ago" },
  { id: "a4", type: "event", description: "Har Ghar Dhyan event updated", timeAgo: "2 hours ago" },
  { id: "a5", type: "store", description: "Switchword Energy Circle restocked", timeAgo: "3 hours ago" },
  { id: "a6", type: "booking", description: "Meera Joshi cancelled her session", timeAgo: "4 hours ago" },
  { id: "a7", type: "user", description: "Kavita Nair updated her profile", timeAgo: "5 hours ago" },
  { id: "a8", type: "review", description: "Arjun Mehta left a 4-star review", timeAgo: "6 hours ago" },
];

export const adminPractitioners: AdminPractitioner[] = [
  { id: "p1", name: "Dr. Neelam Parwani", category: "Healings", experience: "11 years", certifications: ["Reiki Master", "Pranic Healing"], rating: 4.9, price: 1500, enabled: true, photo: null },
  { id: "p2", name: "Anita Deshmukh", category: "Counseling", experience: "8 years", certifications: ["Licensed Counselor", "CBT Specialist"], rating: 4.7, price: 1200, enabled: true, photo: null },
  { id: "p3", name: "Swami Premananda", category: "Spiritual Guidance", experience: "15 years", certifications: ["Vedanta Studies", "Meditation Teacher"], rating: 4.8, price: 1000, enabled: true, photo: null },
  { id: "p4", name: "Dr. Ramesh Iyer", category: "Therapies", experience: "12 years", certifications: ["Acupuncture", "Traditional Chinese Medicine"], rating: 4.6, price: 1800, enabled: true, photo: null },
  { id: "p5", name: "Sunita Rao", category: "Therapies", experience: "6 years", certifications: ["Yoga Therapy", "Ayurveda"], rating: 4.5, price: 900, enabled: true, photo: null },
  { id: "p6", name: "Ravi Krishnan", category: "Financial Guidance", experience: "10 years", certifications: ["Certified Financial Planner"], rating: 4.4, price: 2000, enabled: true, photo: null },
  { id: "p7", name: "Dr. Pooja Malhotra", category: "Nutrition & Diet", experience: "9 years", certifications: ["Clinical Nutritionist", "Dietetics"], rating: 4.7, price: 1100, enabled: false, photo: null },
  { id: "p8", name: "Arun Kapoor", category: "Healings", experience: "7 years", certifications: ["Crystal Healing", "Sound Therapy"], rating: 4.3, price: 800, enabled: true, photo: null },
];

export const adminProducts: AdminProduct[] = [
  { id: "sp-1", name: "Switchword Energy Circle", description: "Handcrafted energy circle with powerful switchwords", price: 24.99, category: "Spiritual Manifestation" },
  { id: "sp-2", name: "Evil Eye Protection Bracelet", description: "Traditional Nazar bead bracelet for protection", price: 18.50, category: "Spiritual Manifestation" },
  { id: "mr-1", name: "Herbal Glow Serum", description: "Lightweight botanical face serum", price: 32.00, category: "Mindful Radiance" },
  { id: "mr-2", name: "Rose Petal Toner", description: "Hydrating toner with organic rose extract", price: 19.99, category: "Mindful Radiance" },
  { id: "cn-1", name: "Golden Turmeric Latte Mix", description: "Warming anti-inflammatory blend", price: 14.99, category: "Conscious Nutrition" },
  { id: "ss-1", name: "White Sage Smudge Bundle", description: "Ethically harvested cleansing bundle", price: 12.00, category: "Spirit & Space" },
  { id: "sr-1", name: "Puja Thali Set", description: "Complete handcrafted worship set", price: 45.00, category: "Sacred Rituals" },
  { id: "dv-1", name: "Ashwagandha Capsules", description: "Organic adaptogenic supplement", price: 28.00, category: "Daily Vitality" },
];

export const adminEvents: AdminEvent[] = [
  { id: "e1", title: "Har Ghar Dhyan", date: "7 Days Every Month", mode: "Online", price: "Rs. 199/month", status: "Active" },
  { id: "e2", title: "Listening Ear (Suno - Sunao)", date: "Once a Month", mode: "In Person", price: "Rs. 199/month", status: "Active" },
  { id: "e3", title: "New Moon Meditation Circle", date: "Monthly", mode: "Online", price: "Free", status: "Draft" },
];

export const adminDiscussions: AdminDiscussion[] = [
  { id: "d1", title: "Daily Wellness Discussion", author: "Admin", repliesCount: 5, flagged: false, date: "Today" },
  { id: "d2", title: "Share Your Gratitude", author: "Priya Sharma", repliesCount: 12, flagged: false, date: "Yesterday" },
  { id: "d3", title: "Meditation Tips for Beginners", author: "Arjun Mehta", repliesCount: 8, flagged: true, date: "2 days ago" },
  { id: "d4", title: "Healing Journey Stories", author: "Kavita Nair", repliesCount: 3, flagged: false, date: "3 days ago" },
];

export const adminResources: AdminResource[] = [
  { id: "r1", title: "Understanding Energy Balance", type: "Article", date: "Jan 15, 2026" },
  { id: "r2", title: "Journaling as Reflection", type: "Article", date: "Jan 20, 2026" },
  { id: "r3", title: "Breathing for Calm", type: "Article", date: "Feb 1, 2026" },
  { id: "r4", title: "5-minute Grounding", type: "Audio Session", duration: "5 min", date: "Jan 10, 2026" },
  { id: "r5", title: "Evening Reset", type: "Audio Session", duration: "10 min", date: "Jan 18, 2026" },
  { id: "r6", title: "Body Awareness", type: "Audio Session", duration: "8 min", date: "Feb 5, 2026" },
  { id: "r7", title: "Morning Intention", type: "Practice", date: "Jan 8, 2026" },
  { id: "r8", title: "Gratitude Pause", type: "Practice", date: "Jan 25, 2026" },
  { id: "r9", title: "Gentle Breathing", type: "Practice", date: "Feb 3, 2026" },
];

export const userSessionHistory: AdminSession[] = [
  { id: "us1", userName: "Priya Sharma", practitionerName: "Dr. Neelam Parwani", service: "Reiki Healing", date: "Jan 5, 2026", time: "10:00 AM", status: "Completed", duration: "45 mins" },
  { id: "us2", userName: "Priya Sharma", practitionerName: "Swami Premananda", service: "Meditation", date: "Jan 12, 2026", time: "8:00 AM", status: "Completed", duration: "30 mins" },
  { id: "us3", userName: "Priya Sharma", practitionerName: "Dr. Neelam Parwani", service: "Pranic Healing", date: "Feb 2, 2026", time: "11:00 AM", status: "Completed", duration: "45 mins" },
  { id: "us4", userName: "Priya Sharma", practitionerName: "Anita Deshmukh", service: "Life Counseling", date: "Feb 18, 2026", time: "2:00 PM", status: "Upcoming", duration: "30 mins" },
];
