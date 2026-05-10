import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { sellerReviews, sellerStats, type SellerReview } from "@/data/sellerMockData";

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather
          key={s}
          name="star"
          size={size}
          color={s <= rating ? "#D4943A" : `${Colors.light.textMuted}40`}
        />
      ))}
    </View>
  );
}

function ReviewCard({ review }: { review: SellerReview }) {
  const [replyVisible, setReplyVisible] = useState(false);
  const [replyText, setReplyText] = useState(review.sellerReply ?? "");
  const [replySaved, setReplySaved] = useState(!!review.sellerReply);

  const sentimentColor =
    review.sentiment === "positive"
      ? "#4A5A2B"
      : review.sentiment === "neutral"
      ? "#B8860B"
      : "#8B3A3A";

  const handleSaveReply = () => {
    if (!replyText.trim()) return;
    setReplySaved(true);
    setReplyVisible(false);
  };

  return (
    <View style={styles.reviewCard} testID={`review-card-${review.id}`}>
      <View style={styles.reviewTopRow}>
        <View style={styles.reviewerAvatar}>
          <ThemedText style={styles.reviewerInitial}>
            {review.customerName[0]}
          </ThemedText>
        </View>
        <View style={styles.reviewerInfo}>
          <ThemedText style={styles.reviewerName}>{review.customerName}</ThemedText>
          <ThemedText style={styles.reviewProduct}>{review.productName}</ThemedText>
        </View>
        <View style={styles.reviewRight}>
          <StarRating rating={review.rating} />
          <ThemedText style={styles.reviewDate}>{review.date}</ThemedText>
        </View>
      </View>

      <ThemedText style={styles.reviewComment}>{review.comment}</ThemedText>

      <View style={[styles.sentimentBadge, { backgroundColor: `${sentimentColor}12` }]}>
        <View style={[styles.sentimentDot, { backgroundColor: sentimentColor }]} />
        <ThemedText style={[styles.sentimentText, { color: sentimentColor }]}>
          {review.sentiment.charAt(0).toUpperCase() + review.sentiment.slice(1)}
        </ThemedText>
      </View>

      {replySaved ? (
        <View style={styles.replyBubble}>
          <ThemedText style={styles.replyLabel}>Your Reply</ThemedText>
          <ThemedText style={styles.replyText}>{replyText}</ThemedText>
          <Pressable onPress={() => { setReplySaved(false); setReplyVisible(true); }}>
            <ThemedText style={styles.editReplyLink}>Edit reply</ThemedText>
          </Pressable>
        </View>
      ) : null}

      {!replySaved ? (
        <Pressable
          style={styles.replyBtn}
          onPress={() => setReplyVisible(!replyVisible)}
          testID={`button-reply-${review.id}`}
        >
          <Feather name="message-circle" size={14} color={Colors.light.accent} />
          <ThemedText style={styles.replyBtnText}>
            {replyVisible ? "Cancel" : "Reply to review"}
          </ThemedText>
        </Pressable>
      ) : null}

      {replyVisible ? (
        <View style={styles.replyInput}>
          <TextInput
            style={styles.replyTextInput}
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Write a thoughtful reply..."
            placeholderTextColor={Colors.light.textMuted}
            multiline
            numberOfLines={2}
            testID={`input-reply-${review.id}`}
          />
          <Pressable
            style={styles.sendReplyBtn}
            onPress={handleSaveReply}
            testID={`button-send-reply-${review.id}`}
          >
            <ThemedText style={styles.sendReplyText}>Send Reply</ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function SellerReviewsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const totalReviews = sellerReviews.length;
  const positiveCount = sellerReviews.filter((r) => r.sentiment === "positive").length;
  const neutralCount = sellerReviews.filter((r) => r.sentiment === "neutral").length;
  const negativeCount = sellerReviews.filter((r) => r.sentiment === "negative").length;
  const avgRating = sellerReviews.reduce((s, r) => s + r.rating, 0) / totalReviews;

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: sellerReviews.filter((r) => r.rating === star).length,
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Reviews & Ratings</ThemedText>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.ratingOverview}>
          <View style={styles.ratingCenter}>
            <ThemedText style={styles.ratingBig}>{avgRating.toFixed(1)}</ThemedText>
            <StarRating rating={Math.round(avgRating)} size={18} />
            <ThemedText style={styles.ratingCount}>{totalReviews} reviews</ThemedText>
          </View>

          <View style={styles.ratingBars}>
            {ratingCounts.map(({ star, count }) => (
              <View key={star} style={styles.ratingBarRow}>
                <ThemedText style={styles.ratingBarLabel}>{star}</ThemedText>
                <Feather name="star" size={10} color="#D4943A" />
                <View style={styles.ratingBarTrack}>
                  <View
                    style={[
                      styles.ratingBarFill,
                      { width: `${totalReviews > 0 ? (count / totalReviews) * 100 : 0}%` },
                    ]}
                  />
                </View>
                <ThemedText style={styles.ratingBarCount}>{count}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sentimentRow}>
          <View style={[styles.sentimentCard, { backgroundColor: "rgba(74,90,43,0.08)" }]}>
            <Feather name="thumbs-up" size={18} color="#4A5A2B" />
            <ThemedText style={[styles.sentimentNum, { color: "#4A5A2B" }]}>{positiveCount}</ThemedText>
            <ThemedText style={styles.sentimentLbl}>Positive</ThemedText>
          </View>
          <View style={[styles.sentimentCard, { backgroundColor: "rgba(212,148,58,0.1)" }]}>
            <Feather name="minus-circle" size={18} color="#B8860B" />
            <ThemedText style={[styles.sentimentNum, { color: "#B8860B" }]}>{neutralCount}</ThemedText>
            <ThemedText style={styles.sentimentLbl}>Neutral</ThemedText>
          </View>
          <View style={[styles.sentimentCard, { backgroundColor: "rgba(139,58,58,0.08)" }]}>
            <Feather name="thumbs-down" size={18} color="#8B3A3A" />
            <ThemedText style={[styles.sentimentNum, { color: "#8B3A3A" }]}>{negativeCount}</ThemedText>
            <ThemedText style={styles.sentimentLbl}>Critical</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.sectionTitle}>Customer Reviews</ThemedText>

        {sellerReviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundRoot },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.light.cardBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  ratingOverview: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xl,
  },
  ratingCenter: {
    alignItems: "center",
    gap: 6,
    paddingRight: Spacing.lg,
    borderRightWidth: 1,
    borderRightColor: `${Colors.light.divider}30`,
  },
  ratingBig: {
    fontSize: 40,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    lineHeight: 44,
  },
  ratingCount: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  ratingBars: {
    flex: 1,
    gap: 6,
  },
  ratingBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingBarLabel: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    width: 10,
  },
  ratingBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: `${Colors.light.accent}12`,
    borderRadius: 3,
    overflow: "hidden",
  },
  ratingBarFill: {
    height: 6,
    backgroundColor: "#D4943A",
    borderRadius: 3,
  },
  ratingBarCount: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    width: 14,
    textAlign: "right",
  },
  sentimentRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  sentimentCard: {
    flex: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: "center",
    gap: 4,
  },
  sentimentNum: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
  },
  sentimentLbl: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  reviewCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  reviewTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.light.accent}15`,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  reviewerInitial: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  reviewerInfo: {
    flex: 1,
    gap: 3,
  },
  reviewerName: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  reviewProduct: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  reviewRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  reviewDate: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  reviewComment: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    lineHeight: 20,
  },
  sentimentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sentimentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sentimentText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
  },
  replyBubble: {
    backgroundColor: `${Colors.light.accent}08`,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.accent,
    gap: 4,
  },
  replyLabel: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
  },
  replyText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    lineHeight: 18,
  },
  editReplyLink: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginTop: 4,
  },
  replyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  replyBtnText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  replyInput: {
    gap: Spacing.sm,
  },
  replyTextInput: {
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: `${Colors.light.divider}40`,
    minHeight: 72,
    textAlignVertical: "top",
  },
  sendReplyBtn: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.xs,
    paddingVertical: 10,
    alignItems: "center",
  },
  sendReplyText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
});
