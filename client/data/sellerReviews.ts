/** Seller-facing product review display types (maps to `reviews` table). */

export type SellerReviewSentiment = "positive" | "neutral" | "negative";

export interface SellerReviewView {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  productName: string;
  productId: string | null;
  date: string;
  sellerReply?: string;
  sentiment: SellerReviewSentiment;
  status: "Approved" | "Pending" | "Flagged";
}

export interface SellerStoreReviewStats {
  avgRating: number;
  reviewCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
}

export function ratingToSentiment(rating: number): SellerReviewSentiment {
  if (rating >= 4) return "positive";
  if (rating === 3) return "neutral";
  return "negative";
}
