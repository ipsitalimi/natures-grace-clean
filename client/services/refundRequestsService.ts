import { getSupabase } from "@/lib/supabase";

export type RefundRequestStatus = "pending" | "in_review" | "approved" | "rejected";

export interface RefundRequest {
  id: string;
  userId: string;
  orderId: string | null;
  bookingId: string | null;
  reason: string;
  description: string;
  imageUrls: string[];
  status: RefundRequestStatus;
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

type DbRow = {
  id: string;
  user_id: string;
  order_id: string | null;
  booking_id: string | null;
  reason: string;
  description: string;
  image_urls: string[];
  status: RefundRequestStatus;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
};

function mapRow(row: DbRow): RefundRequest {
  return {
    id: row.id,
    userId: row.user_id,
    orderId: row.order_id,
    bookingId: row.booking_id,
    reason: row.reason,
    description: row.description,
    imageUrls: row.image_urls ?? [],
    status: row.status,
    adminNotes: row.admin_notes,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

export async function submitRefundRequest(input: {
  orderId?: string;
  bookingId?: string;
  reason: string;
  description: string;
  imageUrls?: string[];
}): Promise<RefundRequest | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("refund_requests")
    .insert({
      user_id: user.id,
      order_id: input.orderId ?? null,
      booking_id: input.bookingId ?? null,
      reason: input.reason,
      description: input.description,
      image_urls: input.imageUrls ?? [],
    })
    .select()
    .single();

  if (error) {
    console.error("[refundRequestsService]", error.message);
    throw new Error(error.message);
  }
  return mapRow(data as DbRow);
}

export async function fetchRefundRequestForBooking(
  bookingId: string
): Promise<RefundRequest | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("refund_requests")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data as DbRow);
}

export async function fetchMyRefundRequests(): Promise<RefundRequest[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("refund_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as DbRow[]).map(mapRow);
}
