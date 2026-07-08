import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, Animated, TextInput, ActivityIndicator, Alert } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ScreenHeader } from "@/components/layout";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import ProductImageView from "@/components/ProductImageView";
import { useDataContext } from "@/context/DataContext";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useReviews } from "@/context/ReviewsContext";
import { useFavorites } from "@/context/FavoritesContext";
import type { Review } from "@/data/reviews";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";
import {
  getEnabledSellerDeliveryOptions,
  type SellerDeliveryOption,
} from "@/constants/sellerDelivery";
import { fetchSellerDeliveryBySellerId } from "@/services/commerce/sellerDeliveryService";
import { formatInr } from "@/lib/formatCurrency";

type StoreParamList = {
  StoreProductDetail: { productId: string };
  Cart: undefined;
};

export default function StoreProductDetailScreen() {
  const { scrollPaddingBottom, bottom } = useLayoutInsets(Spacing.xl);
  const navigation = useNavigation<NativeStackNavigationProp<StoreParamList>>();
  const route = useRoute<RouteProp<StoreParamList, "StoreProductDetail">>();
  const { productId } = route.params;
  const { storeCategories } = useDataContext();
  const { addItem, getItemCount } = useCart();
  const { session } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const {
    submitReview,
    refreshMyReviews,
    getProductReviewStats,
    getApprovedProductReviews,
    getMyReviewForProduct,
  } = useReviews();
  const product = storeCategories.flatMap((c) => c.products).find((p) => p.id === productId);
  const cartCount = getItemCount();

  const [showToast, setShowToast] = useState(false);
  const [toastOpacity] = useState(new Animated.Value(0));
  const [productStats, setProductStats] = useState<{ avgRating: number; reviewCount: number } | null>(
    null
  );
  const [approvedReviews, setApprovedReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(isSupabaseConfigured());
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [myReviewLoading, setMyReviewLoading] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [sellerDeliveryOptions, setSellerDeliveryOptions] = useState<SellerDeliveryOption[]>([]);
  const [sellerStoreName, setSellerStoreName] = useState<string | null>(null);

  const favorited = product ? isFavorite("product", productId) : false;

  const handleToggleFavorite = async () => {
    if (!product || !isSupabaseConfigured() || !session?.user) return;
    setFavoriteBusy(true);
    await toggleFavorite({
      itemType: "product",
      itemId: productId,
      itemDbId: product.id,
      displayName: product.name,
      displaySubtitle: product.category,
    });
    setFavoriteBusy(false);
  };

  useEffect(() => {
    if (!product || !isSupabaseConfigured()) {
      setReviewsLoading(false);
      return;
    }
    let cancelled = false;
    setReviewsLoading(true);
    Promise.all([
      getProductReviewStats(productId),
      getApprovedProductReviews(productId),
    ])
      .then(([stats, reviews]) => {
        if (!cancelled) {
          setProductStats(stats);
          setApprovedReviews(reviews);
        }
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, product, getProductReviewStats, getApprovedProductReviews]);

  useEffect(() => {
    if (!product || !isSupabaseConfigured() || !session?.user) {
      setExistingReview(null);
      return;
    }
    let cancelled = false;
    setMyReviewLoading(true);
    getMyReviewForProduct(productId)
      .then((row) => {
        if (!cancelled) {
          setExistingReview(row);
          if (row) {
            setRating(row.rating);
            setReviewText(row.body);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setMyReviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, product, session?.user?.id, getMyReviewForProduct]);

  useEffect(() => {
    if (!product?.sellerId) {
      setSellerDeliveryOptions([]);
      setSellerStoreName(null);
      return;
    }
    let cancelled = false;
    void fetchSellerDeliveryBySellerId(product.sellerId).then((profile) => {
      if (cancelled) return;
      if (!profile) {
        setSellerDeliveryOptions([]);
        setSellerStoreName(null);
        return;
      }
      setSellerStoreName(profile.storeName);
      setSellerDeliveryOptions(getEnabledSellerDeliveryOptions(profile.settings));
    });
    return () => {
      cancelled = true;
    };
  }, [product?.sellerId]);

  const handleSubmitProductReview = async () => {
    if (!product) return;
    if (!reviewText.trim()) {
      setReviewError("Please write a short review.");
      return;
    }
    if (!session?.user) {
      setReviewError("Sign in to submit a review.");
      return;
    }
    setSubmittingReview(true);
    setReviewError(null);
    try {
      const created = await submitReview({
        targetType: "product",
        productId: product.id,
        practitionerName: product.name,
        serviceLabel: product.category,
        rating,
        body: reviewText,
      });
      if (!created) {
        setReviewError("Could not submit review.");
      } else {
        setExistingReview(created);
        setReviewSubmitted(true);
        await refreshMyReviews();
        const [stats, reviews] = await Promise.all([
          getProductReviewStats(productId),
          getApprovedProductReviews(productId),
        ]);
        setProductStats(stats);
        setApprovedReviews(reviews);
      }
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Could not submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    if (!session?.user) {
      Alert.alert("Sign in required", "Please sign in to add items to your cart.");
      return;
    }
    const added = await addItem(productId, {
      name: product.name,
      category: product.category,
      price: product.price,
    });
    if (!added) {
      return;
    }
    setShowToast(true);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowToast(false));
  };

  if (!product) {
    return (
      <View style={styles.container}>
        <ScreenHeader variant="back" showNotifications={false} />
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>Product not found</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        variant="back"
        showNotifications={false}
        rightAction={
          <View style={styles.headerActions}>
            <Pressable
              style={styles.headerIconButton}
              onPress={() => void handleToggleFavorite()}
              disabled={favoriteBusy}
              testID="button-toggle-favorite"
            >
              {favoriteBusy ? (
                <ActivityIndicator size="small" color={Colors.light.accent} />
              ) : (
                <Feather
                  name="heart"
                  size={22}
                  color={favorited ? "#D4534A" : Colors.light.accent}
                />
              )}
            </Pressable>
            <Pressable
              style={styles.headerIconButton}
              onPress={() => navigation.navigate("Cart")}
              testID="button-detail-cart"
            >
              <Feather name="shopping-cart" size={22} color={Colors.light.accent} />
              {cartCount > 0 ? (
                <View style={styles.cartBadge}>
                  <ThemedText style={styles.cartBadgeText}>{cartCount > 9 ? "9+" : cartCount}</ThemedText>
                </View>
              ) : null}
            </Pressable>
          </View>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imagePlaceholder}>
          <ProductImageView
            product={product}
            containerStyle={styles.productImage}
            imageStyle={styles.productImage}
            iconSize={40}
          />
        </View>

        <View style={styles.detailSection}>
          <ThemedText style={styles.categoryLabel}>{product.category}</ThemedText>
          <ThemedText style={styles.productName}>{product.name}</ThemedText>
          <ThemedText style={styles.productPrice}>
            {formatInr(product.price)}
          </ThemedText>

          <View style={styles.divider} />

          <ThemedText style={styles.sectionTitle}>About this product</ThemedText>
          <ThemedText style={styles.productDescription}>
            {product.description}
          </ThemedText>

          {sellerDeliveryOptions.length > 0 ? (
            <>
              <View style={styles.divider} />
              <ThemedText style={styles.sectionTitle}>Delivery options</ThemedText>
              {sellerStoreName ? (
                <ThemedText style={styles.deliverySellerNote}>
                  Fulfilled by {sellerStoreName}
                </ThemedText>
              ) : null}
              {sellerDeliveryOptions.map((option) => (
                <View key={option.id} style={styles.deliveryRow}>
                  <ThemedText style={styles.deliveryRowLabel}>{option.label}</ThemedText>
                  <ThemedText style={styles.deliveryRowMeta}>
                    {option.duration} · {option.price <= 0 ? "Free" : formatInr(option.price)}
                  </ThemedText>
                </View>
              ))}
            </>
          ) : null}

          <View style={styles.divider} />

          <ThemedText style={styles.sectionTitle}>Reviews</ThemedText>
          {reviewsLoading ? (
            <ActivityIndicator color={Colors.light.accent} style={styles.reviewSpinner} />
          ) : productStats && productStats.reviewCount > 0 ? (
            <ThemedText style={styles.reviewSummary}>
              {productStats.avgRating.toFixed(1)} ★ · {productStats.reviewCount} review
              {productStats.reviewCount === 1 ? "" : "s"}
            </ThemedText>
          ) : (
            <ThemedText style={styles.reviewEmpty}>No reviews yet.</ThemedText>
          )}

          {approvedReviews.map((r) => (
            <View key={r.id} style={styles.reviewItem}>
              <View style={styles.reviewItemHeader}>
                <ThemedText style={styles.reviewAuthor}>{r.userName}</ThemedText>
                <ThemedText style={styles.reviewStars}>
                  {"★".repeat(r.rating)}
                  {"☆".repeat(5 - r.rating)}
                </ThemedText>
              </View>
              <ThemedText style={styles.reviewBody}>{r.body}</ThemedText>
            </View>
          ))}

          {isSupabaseConfigured() && session?.user ? (
            <View style={styles.reviewForm}>
              <ThemedText style={styles.reviewFormTitle}>Your review</ThemedText>
              {myReviewLoading ? (
                <ActivityIndicator color={Colors.light.accent} />
              ) : existingReview || reviewSubmitted ? (
                <>
                  <ThemedText style={styles.reviewStatus}>
                    {existingReview?.status === "Approved"
                      ? "Published"
                      : `Submitted — ${existingReview?.status ?? "Pending"} moderation`}
                  </ThemedText>
                  <ThemedText style={styles.reviewBodyDisplay}>{reviewText}</ThemedText>
                </>
              ) : (
                <>
                  <View style={styles.starPicker}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Pressable key={n} onPress={() => setRating(n)} testID={`button-product-star-${n}`}>
                        <Feather
                          name="star"
                          size={22}
                          color={n <= rating ? "#E5A93B" : Colors.light.backgroundTertiary}
                        />
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    style={styles.reviewInput}
                    value={reviewText}
                    onChangeText={setReviewText}
                    placeholder="Share your experience with this product..."
                    placeholderTextColor={Colors.light.textSecondary}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    testID="input-product-review"
                  />
                  {reviewError ? (
                    <ThemedText style={styles.reviewError}>{reviewError}</ThemedText>
                  ) : null}
                  <Pressable
                    style={[styles.submitReviewBtn, submittingReview && styles.submitReviewDisabled]}
                    onPress={handleSubmitProductReview}
                    disabled={submittingReview}
                    testID="button-submit-product-review"
                  >
                    {submittingReview ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <ThemedText style={styles.submitReviewText}>Submit Review</ThemedText>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          ) : isSupabaseConfigured() ? (
            <ThemedText style={styles.reviewSignIn}>Sign in to leave a review.</ThemedText>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.addToCartButton,
              pressed && styles.addToCartButtonPressed,
            ]}
            onPress={handleAddToCart}
            testID="button-add-to-cart"
          >
            <Feather name="shopping-cart" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <ThemedText style={styles.addToCartText}>Add to Cart</ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      {showToast ? (
        <Animated.View style={[styles.toast, { opacity: toastOpacity, bottom: bottom + Spacing.lg }]}>
          <Feather name="check-circle" size={18} color="#FFFFFF" />
          <ThemedText style={styles.toastText}>Added to cart</ThemedText>
          <Pressable onPress={() => navigation.navigate("Cart")} testID="button-toast-view-cart">
            <ThemedText style={styles.toastLink}>View Cart</ThemedText>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconButton: {
    padding: 8,
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: 2,
    right: 0,
    backgroundColor: "#D94F4F",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },
  imagePlaceholder: {
    height: 260,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  imageInnerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.accent,
    opacity: 0.1,
  },
  detailSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  productName: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    flexShrink: 1,
  },
  productPrice: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.light.accent,
    marginBottom: Spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.divider,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  productDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.light.textSecondary,
  },
  deliverySellerNote: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
  },
  deliveryRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
  },
  deliveryRowLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  deliveryRowMeta: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  reviewSpinner: {
    marginVertical: Spacing.md,
  },
  reviewSummary: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.accent,
    marginBottom: Spacing.md,
  },
  reviewEmpty: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
  },
  reviewItem: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
  },
  reviewItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  reviewAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  reviewStars: {
    fontSize: 12,
    color: "#E5A93B",
  },
  reviewBody: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textSecondary,
  },
  reviewForm: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  reviewFormTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
  reviewStatus: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  reviewBodyDisplay: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.text,
  },
  starPicker: {
    flexDirection: "row",
    gap: 8,
    marginVertical: Spacing.sm,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: Colors.light.divider,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: 15,
    color: Colors.light.text,
    minHeight: 100,
  },
  reviewError: {
    fontSize: 13,
    color: "#D94F4F",
  },
  reviewSignIn: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: Spacing.md,
  },
  submitReviewBtn: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  submitReviewDisabled: {
    opacity: 0.7,
  },
  submitReviewText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  addToCartButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: Spacing.xl,
  },
  addToCartButtonPressed: {
    opacity: 0.85,
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  toast: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.light.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  toastLink: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    textDecorationLine: "underline",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
});
