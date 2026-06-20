import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  MyReviewView,
  PractitionerReviewStats,
  ProductReviewStats,
  Review,
  SubmitReviewInput,
} from "@/data/reviews";
import type { SellerReviewView, SellerStoreReviewStats } from "@/data/sellerReviews";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import * as reviewsService from "@/services/content/reviewsService";

const EMPTY_SELLER_STATS: SellerStoreReviewStats = {
  avgRating: 0,
  reviewCount: 0,
  positiveCount: 0,
  neutralCount: 0,
  negativeCount: 0,
};

interface ReviewsContextType {
  myReviews: Review[];
  myReviewViews: MyReviewView[];
  reviewsLoading: boolean;
  reviewsError: string | null;
  refreshMyReviews: () => Promise<void>;
  submitReview: (input: SubmitReviewInput) => Promise<Review | null>;
  updateMyReview: (
    reviewId: string,
    patch: { rating?: number; body?: string }
  ) => Promise<boolean>;
  deleteMyReview: (reviewId: string) => Promise<boolean>;
  getReviewForBooking: (bookingId: string) => Promise<Review | null>;
  getMyReviewForProduct: (productId: string) => Promise<Review | null>;
  getPractitionerStats: (practitionerId: string) => Promise<PractitionerReviewStats>;
  getApprovedPractitionerReviews: (practitionerId: string) => Promise<Review[]>;
  getProductReviewStats: (productId: string) => Promise<ProductReviewStats>;
  getApprovedProductReviews: (productId: string) => Promise<Review[]>;
  sellerReviews: SellerReviewView[];
  sellerStoreStats: SellerStoreReviewStats;
  sellerReviewsLoading: boolean;
  sellerReviewsError: string | null;
  refreshSellerReviews: () => Promise<void>;
  saveSellerReply: (reviewId: string, reply: string) => Promise<boolean>;
}

const ReviewsContext = createContext<ReviewsContextType | null>(null);

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const { session, profile, loading: authLoading, isConfigured: authConfigured } = useAuth();
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(isSupabaseConfigured());
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const [sellerReviews, setSellerReviews] = useState<SellerReviewView[]>([]);
  const [sellerStoreStats, setSellerStoreStats] =
    useState<SellerStoreReviewStats>(EMPTY_SELLER_STATS);
  const [sellerReviewsLoading, setSellerReviewsLoading] = useState(false);
  const [sellerReviewsError, setSellerReviewsError] = useState<string | null>(null);

  const refreshMyReviews = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setMyReviews([]);
      setReviewsLoading(false);
      setReviewsError(null);
      return;
    }

    if (!session?.user) {
      setMyReviews([]);
      setReviewsLoading(false);
      setReviewsError(null);
      return;
    }

    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const rows = await reviewsService.fetchMyReviews();
      setMyReviews(rows);
    } catch (err) {
      setReviewsError(
        err instanceof Error ? err.message : "Could not load your reviews"
      );
      setMyReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [session?.user?.id]);

  const refreshSellerReviews = useCallback(async () => {
    if (!isSupabaseConfigured() || !session?.user) {
      setSellerReviews([]);
      setSellerStoreStats(EMPTY_SELLER_STATS);
      setSellerReviewsLoading(false);
      setSellerReviewsError(null);
      return;
    }

    if (profile?.role !== "Seller") {
      setSellerReviews([]);
      setSellerStoreStats(EMPTY_SELLER_STATS);
      setSellerReviewsLoading(false);
      setSellerReviewsError(null);
      return;
    }

    setSellerReviewsLoading(true);
    setSellerReviewsError(null);
    try {
      const { reviews, stats } = await reviewsService.fetchSellerProductReviews(
        session.user.id
      );
      setSellerReviews(reviews);
      setSellerStoreStats(stats);
    } catch (err) {
      setSellerReviewsError(
        err instanceof Error ? err.message : "Could not load store reviews"
      );
      setSellerReviews([]);
      setSellerStoreStats(EMPTY_SELLER_STATS);
    } finally {
      setSellerReviewsLoading(false);
    }
  }, [session?.user?.id, profile?.role]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      refreshMyReviews();
      return;
    }
    if (authConfigured && authLoading) return;
    refreshMyReviews();
  }, [refreshMyReviews, authConfigured, authLoading, session?.user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      refreshSellerReviews();
      return;
    }
    if (authConfigured && authLoading) return;
    refreshSellerReviews();
  }, [refreshSellerReviews, authConfigured, authLoading, session?.user?.id, profile?.role]);

  const myReviewViews = useMemo(
    () => myReviews.map(reviewsService.reviewToMyView),
    [myReviews]
  );

  const submitReview = useCallback(
    async (input: SubmitReviewInput) => {
      if (!isSupabaseConfigured() || !session?.user) return null;
      const created = await reviewsService.submitReview(input, {
        fullName: profile?.full_name,
        email: profile?.email ?? session.user.email ?? undefined,
      });
      if (created) {
        setMyReviews((prev) => [created, ...prev]);
        if (input.targetType === "product" && profile?.role === "Seller") {
          await refreshSellerReviews();
        }
      }
      return created;
    },
    [session?.user, profile?.full_name, profile?.email, profile?.role, refreshSellerReviews]
  );

  const updateMyReview = useCallback(
    async (reviewId: string, patch: { rating?: number; body?: string }) => {
      if (!isSupabaseConfigured()) return false;
      const ok = await reviewsService.updateMyReview(reviewId, patch);
      if (ok) {
        setMyReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId
              ? {
                  ...r,
                  rating: patch.rating ?? r.rating,
                  body: patch.body ?? r.body,
                }
              : r
          )
        );
      }
      return ok;
    },
    []
  );

  const deleteMyReview = useCallback(async (reviewId: string) => {
    if (!isSupabaseConfigured()) return false;
    const ok = await reviewsService.deleteMyReview(reviewId);
    if (ok) {
      setMyReviews((prev) => prev.filter((r) => r.id !== reviewId));
    }
    return ok;
  }, []);

  const getReviewForBooking = useCallback(async (bookingId: string) => {
    return reviewsService.fetchReviewByBooking(bookingId);
  }, []);

  const getMyReviewForProduct = useCallback(async (productId: string) => {
    return reviewsService.fetchMyReviewForProduct(productId);
  }, []);

  const getPractitionerStats = useCallback(async (practitionerId: string) => {
    return reviewsService.getPractitionerReviewStats(practitionerId);
  }, []);

  const getApprovedPractitionerReviews = useCallback(async (practitionerId: string) => {
    return reviewsService.fetchApprovedPractitionerReviews(practitionerId);
  }, []);

  const getProductReviewStats = useCallback(async (productId: string) => {
    return reviewsService.getProductReviewStats(productId);
  }, []);

  const getApprovedProductReviews = useCallback(async (productId: string) => {
    return reviewsService.fetchApprovedProductReviews(productId);
  }, []);

  const saveSellerReply = useCallback(
    async (reviewId: string, reply: string) => {
      if (!isSupabaseConfigured()) return false;
      const ok = await reviewsService.saveSellerReply(reviewId, reply);
      if (ok) {
        setSellerReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId ? { ...r, sellerReply: reply.trim() } : r
          )
        );
      }
      return ok;
    },
    []
  );

  return (
    <ReviewsContext.Provider
      value={{
        myReviews,
        myReviewViews,
        reviewsLoading,
        reviewsError,
        refreshMyReviews,
        submitReview,
        updateMyReview,
        deleteMyReview,
        getReviewForBooking,
        getMyReviewForProduct,
        getPractitionerStats,
        getApprovedPractitionerReviews,
        getProductReviewStats,
        getApprovedProductReviews,
        sellerReviews,
        sellerStoreStats,
        sellerReviewsLoading,
        sellerReviewsError,
        refreshSellerReviews,
        saveSellerReply,
      }}
    >
      {children}
    </ReviewsContext.Provider>
  );
}

export function useReviews() {
  const ctx = useContext(ReviewsContext);
  if (!ctx) {
    throw new Error("useReviews must be used within ReviewsProvider");
  }
  return ctx;
}
