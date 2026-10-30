import { getSupabase } from "@/lib/supabase";
import { formatRelativeTime, type DbActivityLogRow } from "@/services/platform/activityLogService";

export type AdminActivityCategory = "all" | "logins" | "orders" | "bookings" | "other";

export type AdminActivityItem = {
  id: string;
  category: Exclude<AdminActivityCategory, "all">;
  title: string;
  subtitle?: string;
  createdAt: string;
  timeAgo?: string;
};

function localDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayLocalDayKey(): string {
  return localDayKey(new Date().toISOString());
}

function isLoginish(row: Pick<DbActivityLogRow, "action_type" | "description">): boolean {
  const desc = (row.description ?? "").toLowerCase();
  if (row.action_type === ("login" as DbActivityLogRow["action_type"])) return true;
  return desc.includes("signed in") || desc.includes("sign in") || desc.includes("logged in");
}

function formatInr(amount: number): string {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

function dayBoundsIso(day: string): { start: string; end: string } {
  // Local calendar day → ISO bounds for DB range filters
  const [y, m, d] = day.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Federated admin activity feed: logins + orders + bookings + other audit rows.
 */
export async function fetchAdminActivityFeed(options?: {
  limit?: number;
  day?: string;
}): Promise<AdminActivityItem[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const limit = options?.limit ?? 100;
  const day = options?.day;
  const bounds = day ? dayBoundsIso(day) : null;
  // Over-fetch each source so day filtering still yields enough rows
  const perSource = Math.max(limit, 50);

  let activityQuery = supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(perSource);

  let ordersQuery = supabase
    .from("orders")
    .select("id, order_number, status, total, customer_name, created_at")
    .order("created_at", { ascending: false })
    .limit(perSource);

  let bookingsQuery = supabase
    .from("practitioner_bookings")
    .select(
      "id, booking_number, service_name, session_date, session_time, client_name, booking_status, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(perSource);

  if (bounds) {
    activityQuery = activityQuery.gte("created_at", bounds.start).lte("created_at", bounds.end);
    ordersQuery = ordersQuery.gte("created_at", bounds.start).lte("created_at", bounds.end);
    bookingsQuery = bookingsQuery.gte("created_at", bounds.start).lte("created_at", bounds.end);
  }

  const [activityRes, ordersRes, bookingsRes] = await Promise.all([
    activityQuery,
    ordersQuery,
    bookingsQuery,
  ]);

  if (activityRes.error) {
    console.error("[adminActivityFeed] activity_log:", activityRes.error.message);
  }
  if (ordersRes.error) {
    console.error("[adminActivityFeed] orders:", ordersRes.error.message);
  }
  if (bookingsRes.error) {
    console.error("[adminActivityFeed] bookings:", bookingsRes.error.message);
  }

  const items: AdminActivityItem[] = [];

  for (const row of (activityRes.data ?? []) as DbActivityLogRow[]) {
    const login = isLoginish(row);
    items.push({
      id: `log-${row.id}`,
      category: login ? "logins" : "other",
      title: row.description,
      subtitle: row.actor_name ? `by ${row.actor_name}` : undefined,
      createdAt: row.created_at,
      timeAgo: formatRelativeTime(row.created_at),
    });
  }

  for (const row of (ordersRes.data ?? []) as {
    id: string;
    order_number: string;
    status: string;
    total: number;
    customer_name: string | null;
    created_at: string;
  }[]) {
    items.push({
      id: `order-${row.id}`,
      category: "orders",
      title: `Order ${row.order_number} — ${row.status} — ${formatInr(row.total)}`,
      subtitle: row.customer_name ? row.customer_name : undefined,
      createdAt: row.created_at,
      timeAgo: formatRelativeTime(row.created_at),
    });
  }

  for (const row of (bookingsRes.data ?? []) as {
    id: string;
    booking_number: string;
    service_name: string;
    session_date: string;
    session_time: string | null;
    client_name: string | null;
    booking_status: string;
    created_at: string;
  }[]) {
    const sessionLabel = row.session_time
      ? `${row.session_date} ${row.session_time}`
      : row.session_date;
    items.push({
      id: `booking-${row.id}`,
      category: "bookings",
      title: `Booking ${row.booking_number}: ${row.service_name} on ${sessionLabel}`,
      subtitle: row.client_name
        ? `${row.client_name} · ${row.booking_status}`
        : row.booking_status,
      createdAt: row.created_at,
      timeAgo: formatRelativeTime(row.created_at),
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (day) {
    const filtered = items.filter((item) => localDayKey(item.createdAt) === day);
    return filtered.slice(0, limit);
  }

  return items.slice(0, limit);
}

export function filterAdminActivityFeed(
  items: AdminActivityItem[],
  category: AdminActivityCategory
): AdminActivityItem[] {
  if (category === "all") return items;
  return items.filter((item) => item.category === category);
}
