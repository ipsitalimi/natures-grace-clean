import type {
  MyReviewView,
  PractitionerReviewStats,
  ProductReviewStats,
  Review,
  ReviewStatus,
  SubmitReviewInput,
} from "@/data/reviews";
import type { SellerReviewView, SellerStoreReviewStats } from "@/data/sellerReviews";
import { ratingToSentiment } from "@/data/sellerReviews";
import type { ModeratedReview } from "@/context/PlatformConfigContext";
import { fetchSellerProductIds, resolveSellerIdByProfileId } from "@/services/commerce/sellerId";
import { getSupabase } from "@/lib/supabase";
import { reviewRowToModerated, type DbReviewRow } from "@/services/content/types";

export type DbReviewRowFull = DbReviewRow & {
  user_id: string | null;
  practitioner_id: string | null;
  target_type: Review["targetType"];
  product_id: string | null;
  service_label: string;
  booking_id: string | null;
  order_id: string | null;
  seller_reply: string;
  updated_at: string;
};

function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function mapRow(row: DbReviewRowFull): Review {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userInitial: row.user_initial,
    practitionerName: row.practitioner_name,
    practitionerId: row.practitioner_id ?? null,
    productId: row.product_id ?? null,
    targetType: row.target_type ?? "practitioner",
    serviceLabel: row.service_label ?? "",
    bookingId: row.booking_id ?? null,
    orderId: row.order_id ?? null,
    rating: row.rating,
    body: row.body,
    status: row.status as Review["status"],
    sellerReply: row.seller_reply ?? "",
    createdAt: row.created_at,
  };
}

export function reviewToMyView(review: Review): MyReviewView {
  const isProduct = review.targetType === "product";
  return {
    id: review.id,
    practitionerName: isProduct
      ? review.practitionerName || review.serviceLabel
      : review.practitionerName,
    serviceType: isProduct
      ? review.serviceLabel || "Product"
      : review.serviceLabel || review.targetType,
    rating: review.rating,
    text: review.body,
    date: formatReviewDate(review.createdAt),
    status: review.status,
  };
}

export function reviewToSellerView(
  review: Review,
  productName?: string
): SellerReviewView {
  return {
    id: review.id,
    customerName: review.userName,
    rating: review.rating,
    comment: review.body,
    productName: productName ?? review.practitionerName ?? review.serviceLabel,
    productId: review.productId,
    date: formatReviewDate(review.createdAt),
    sellerReply: review.sellerReply || undefined,
    sentiment: ratingToSentiment(review.rating),
    status: review.status,
  };
}

function buildSellerStoreStats(reviews: Review[]): SellerStoreReviewStats {
  const approved = reviews.filter((r) => r.status === "Approved");
  const ratings = approved.map((r) => r.rating);
  const reviewCount = ratings.length;
  const avgRating =
    reviewCount > 0 ? ratings.reduce((s, n) => s + n, 0) / reviewCount : 0;
  return {
    avgRating,
    reviewCount,
    positiveCount: approved.filter((r) => ratingToSentiment(r.rating) === "positive").length,
    neutralCount: approved.filter((r) => ratingToSentiment(r.rating) === "neutral").length,
    negativeCount: approved.filter((r) => ratingToSentiment(r.rating) === "negative").length,
  };
}

export async function fetchReviews(): Promise<ModeratedReview[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[reviewsService] fetch:", error.message);
    throw new Error(error.message);
  }
  return ((data ?? []) as DbReviewRow[]).map(reviewRowToModerated);
}

export async function fetchMyReviews(): Promise<Review[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[reviewsService] fetch mine:", error.message);
    throw new Error(error.message);
  }

  return ((data ?? []) as DbReviewRowFull[]).map(mapRow);
}

export async function fetchApprovedProductReviews(
  productId: string,
  limit = 20
): Promise<Review[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("target_type", "product")
    .eq("status", "Approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[reviewsService] fetch product:", error.message);
    return [];
  }

  return ((data ?? []) as DbReviewRowFull[]).map(mapRow);
}

export async function getProductReviewStats(
  productId: string
): Promise<ProductReviewStats> {
  const approved = await fetchApprovedProductReviews(productId, 500);
  const ratings = approved.map((r) => r.rating);
  const reviewCount = ratings.length;
  const avgRating =
    reviewCount > 0 ? ratings.reduce((s, n) => s + n, 0) / reviewCount : 0;
  return { avgRating, reviewCount };
}

export async function fetchSellerProductReviews(
  profileId: string
): Promise<{ reviews: SellerReviewView[]; stats: SellerStoreReviewStats }> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      reviews: [],
      stats: {
        avgRating: 0,
        reviewCount: 0,
        positiveCount: 0,
        neutralCount: 0,
        negativeCount: 0,
      },
    };
  }

  const sellerId = await resolveSellerIdByProfileId(profileId);
  if (!sellerId) {
    return {
      reviews: [],
      stats: {
        avgRating: 0,
        reviewCount: 0,
        positiveCount: 0,
        neutralCount: 0,
        negativeCount: 0,
      },
    };
  }

  const productIds = await fetchSellerProductIds(sellerId);
  if (productIds.length === 0) {
    return {
      reviews: [],
      stats: {
        avgRating: 0,
        reviewCount: 0,
        positiveCount: 0,
        neutralCount: 0,
        negativeCount: 0,
      },
    };
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .in("id", productIds);
  const nameById = new Map<string, string>();
  for (const p of products ?? []) {
    nameById.set((p as { id: string }).id, (p as { name: string }).name);
  }

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("target_type", "product")
    .in("product_id", productIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[reviewsService] fetch seller reviews:", error.message);
    throw new Error(error.message);
  }

  const mapped = ((data ?? []) as DbReviewRowFull[]).map(mapRow);
  const views = mapped.map((r) =>
    reviewToSellerView(r, nameById.get(r.productId ?? "") ?? r.practitionerName)
  );
  return { reviews: views, stats: buildSellerStoreStats(mapped) };
}

export async function saveSellerReply(
  reviewId: string,
  reply: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("reviews")
    .update({ seller_reply: reply.trim() })
    .eq("id", reviewId);

  if (error) {
    console.error("[reviewsService] seller reply:", error.message);
    return false;
  }
  return true;
}

export async function fetchApprovedPractitionerReviews(
  practitionerId: string,
  limit = 10
): Promise<Review[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("practitioner_id", practitionerId)
    .eq("status", "Approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[reviewsService] fetch practitioner:", error.message);
    return [];
  }

  return ((data ?? []) as DbReviewRowFull[]).map(mapRow);
}

export async function fetchMyReviewForProduct(productId: string): Promise<Review | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("target_type", "product")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[reviewsService] fetch my product review:", error.message);
    return null;
  }

  return data ? mapRow(data as DbReviewRowFull) : null;
}

export async function fetchReviewByBooking(bookingId: string): Promise<Review | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[reviewsService] fetch by booking:", error.message);
    return null;
  }

  return data ? mapRow(data as DbReviewRowFull) : null;
}

export async function getPractitionerReviewStats(
  practitionerId: string
): Promise<PractitionerReviewStats> {
  const supabase = getSupabase();
  if (!supabase) return { avgRating: 0, reviewCount: 0 };

  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("practitioner_id", practitionerId)
    .eq("status", "Approved");

  if (error) {
    console.error("[reviewsService] stats:", error.message);
    return { avgRating: 0, reviewCount: 0 };
  }

  const ratings = (data ?? []).map((r) => (r as { rating: number }).rating);
  const reviewCount = ratings.length;
  const avgRating =
    reviewCount > 0 ? ratings.reduce((s, n) => s + n, 0) / reviewCount : 0;
  return { avgRating, reviewCount };
}

export async function syncPractitionerReviewAggregate(
  practitionerId: string
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !practitionerId) return;

  const stats = await getPractitionerReviewStats(practitionerId);
  await supabase
    .from("practitioners")
    .update({
      rating: Math.round(stats.avgRating * 10) / 10,
      review_count: stats.reviewCount,
    })
    .eq("id", practitionerId);
}

function displayNameFromProfile(
  fullName: string | undefined,
  email: string | undefined
): { userName: string; userInitial: string } {
  const userName = fullName?.trim() || email?.split("@")[0] || "User";
  const userInitial = userName.charAt(0).toUpperCase() || "U";
  return { userName, userInitial };
}

export async function submitReview(
  input: SubmitReviewInput,
  author?: { fullName?: string; email?: string }
): Promise<Review | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { userName, userInitial } = displayNameFromProfile(
    author?.fullName ?? (user.user_metadata?.full_name as string) ?? undefined,
    author?.email ?? user.email
  );

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      user_id: user.id,
      user_name: userName,
      user_initial: userInitial,
      practitioner_name: input.practitionerName.trim(),
      practitioner_id: input.practitionerId ?? null,
      target_type: input.targetType,
      product_id: input.productId ?? null,
      service_label: input.serviceLabel?.trim() ?? "",
      booking_id: input.bookingId ?? null,
      order_id: input.orderId ?? null,
      rating: input.rating,
      body: input.body.trim(),
      status: "Pending",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        input.targetType === "product"
          ? "You already submitted a review for this order."
          : "You already submitted a review for this session."
      );
    }
    console.error("[reviewsService] submit:", error.message);
    return null;
  }

  return mapRow(data as DbReviewRowFull);
}

export async function updateMyReview(
  reviewId: string,
  patch: { rating?: number; body?: string }
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const updates: Record<string, unknown> = {};
  if (patch.rating !== undefined) updates.rating = patch.rating;
  if (patch.body !== undefined) updates.body = patch.body.trim();

  const { error } = await supabase
    .from("reviews")
    .update(updates)
    .eq("id", reviewId)
    .eq("user_id", user.id)
    .eq("status", "Pending");

  if (error) {
    console.error("[reviewsService] update mine:", error.message);
    return false;
  }
  return true;
}

export async function deleteMyReview(reviewId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: row } = await supabase
    .from("reviews")
    .select("practitioner_id, status")
    .eq("id", reviewId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[reviewsService] delete mine:", error.message);
    return false;
  }

  const practitionerId = (row as { practitioner_id?: string } | null)?.practitioner_id;
  if (practitionerId && (row as { status?: string })?.status === "Approved") {
    await syncPractitionerReviewAggregate(practitionerId);
  }
  return true;
}

export async function updateReviewStatus(
  id: string,
  status: ReviewStatus
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data: row } = await supabase
    .from("reviews")
    .select("practitioner_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("reviews").update({ status }).eq("id", id);
  if (error) {
    console.error("[reviewsService] update status:", error.message);
    throw new Error(error.message);
  }

  const practitionerId = (row as { practitioner_id?: string } | null)?.practitioner_id;
  if (practitionerId) {
    await syncPractitionerReviewAggregate(practitionerId);
  }
}

export async function countReviews(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}
