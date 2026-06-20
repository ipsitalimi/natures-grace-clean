import type {
  DbBookingRow,
  PractitionerDashboard,
  PractitionerHomeReview,
  PractitionerWalletSnapshot,
  WeeklySessionPoint,
} from "@/data/practitionerBookings";
import { getSupabase } from "@/lib/supabase";
import { resolvePractitionerId, fetchPractitionerProfile } from "@/services/content/practitionerId";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function computeWeeklySessions(bookings: DbBookingRow[]): WeeklySessionPoint[] {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const counts = [0, 0, 0, 0, 0, 0, 0];

  for (const b of bookings) {
    if (b.booking_status === "Cancelled") continue;
    const at = b.completed_at ? new Date(b.completed_at) : new Date(b.created_at);
    if (at < weekStart || at > now) continue;
    const dayIdx = Math.floor((startOfDay(at).getTime() - weekStart.getTime()) / 86400000);
    if (dayIdx >= 0 && dayIdx < 7) {
      counts[dayIdx] += 1;
    }
  }

  return counts.map((amount, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return { day: DAY_LABELS[d.getDay()], amount };
  });
}

function sumEarningsInMonth(
  bookings: DbBookingRow[],
  month: number,
  year: number
): number {
  return bookings
    .filter((b) => {
      if (b.payment_status !== "Paid") return false;
      const at = b.completed_at ? new Date(b.completed_at) : new Date(b.created_at);
      return at.getMonth() === month && at.getFullYear() === year;
    })
    .reduce((s, b) => s + Number(b.amount), 0);
}

export function computeMonthlyEarnings(bookings: DbBookingRow[]): {
  thisMonth: number;
  growthPct: number;
} {
  const now = new Date();
  const thisMonth = sumEarningsInMonth(bookings, now.getMonth(), now.getFullYear());
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = sumEarningsInMonth(bookings, prev.getMonth(), prev.getFullYear());
  const growthPct = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
  return { thisMonth, growthPct };
}

function countClientsBookedToday(bookings: DbBookingRow[]): number {
  const today = new Date();
  return bookings.filter((b) => {
    if (b.booking_status === "Cancelled") return false;
    const created = new Date(b.created_at);
    return isSameDay(created, today);
  }).length;
}

export async function fetchPractitionerReviews(
  practitionerId: string | null,
  practitionerName: string
): Promise<PractitionerHomeReview[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase
    .from("reviews")
    .select("*")
    .eq("status", "Approved")
    .order("created_at", { ascending: false })
    .limit(10);

  if (practitionerId) {
    query = query.eq("practitioner_id", practitionerId);
  } else if (practitionerName) {
    query = query.eq("practitioner_name", practitionerName);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[practitionerDashboard] reviews:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as {
      id: string;
      user_name: string;
      practitioner_name: string;
      rating: number;
      body: string;
      created_at: string;
    };
    return {
      id: r.id,
      userName: r.user_name,
      service: r.practitioner_name,
      rating: Number(r.rating),
      text: r.body,
      date: new Date(r.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    };
  });
}

export async function buildDashboard(
  bookings: DbBookingRow[],
  snapshot: PractitionerWalletSnapshot,
  profileId?: string | null
): Promise<PractitionerDashboard> {
  const practitionerId = await resolvePractitionerId(profileId);
  const profile = await fetchPractitionerProfile(profileId);
  const name = profile?.name ?? "";

  const reviews = await fetchPractitionerReviews(practitionerId, name);
  const { thisMonth, growthPct } = computeMonthlyEarnings(bookings);

  let avgRating = profile?.rating ?? 0;
  let reviewCount = profile?.reviewCount ?? 0;

  if (reviews.length > 0) {
    avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }
  reviewCount = Math.max(reviewCount, reviews.length);

  const monthlyFromWallet = snapshot.transactions
    .filter((t) => t.category === "booking_earning" || t.category === "earning_release")
    .reduce((s, t) => s + (t.type === "credit" ? t.amount : 0), 0);

  return {
    weeklySessions: computeWeeklySessions(bookings),
    monthlyEarnings: thisMonth > 0 ? thisMonth : monthlyFromWallet,
    monthlyGrowthPct: growthPct,
    avgRating: Math.round(avgRating * 10) / 10,
    reviewCount,
    reviews,
    clientsBookedToday: countClientsBookedToday(bookings),
  };
}
