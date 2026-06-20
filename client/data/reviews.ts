/** Review types (Supabase-backed). */

export type ReviewStatus = "Approved" | "Pending" | "Flagged";
export type ReviewTargetType = "practitioner" | "product" | "event";

export interface Review {
  id: string;
  userId: string | null;
  userName: string;
  userInitial: string;
  practitionerName: string;
  practitionerId: string | null;
  productId: string | null;
  targetType: ReviewTargetType;
  serviceLabel: string;
  bookingId: string | null;
  orderId: string | null;
  rating: number;
  body: string;
  status: ReviewStatus;
  sellerReply: string;
  createdAt: string;
}

/** My Reviews list row (existing UI shape + status). */
export interface MyReviewView {
  id: string;
  practitionerName: string;
  serviceType: string;
  rating: number;
  text: string;
  date: string;
  status: ReviewStatus;
}

export interface SubmitReviewInput {
  targetType: ReviewTargetType;
  practitionerId?: string;
  practitionerName: string;
  productId?: string;
  serviceLabel?: string;
  bookingId?: string;
  orderId?: string;
  rating: number;
  body: string;
}

export interface PractitionerReviewStats {
  avgRating: number;
  reviewCount: number;
}

export interface ProductReviewStats {
  avgRating: number;
  reviewCount: number;
}
