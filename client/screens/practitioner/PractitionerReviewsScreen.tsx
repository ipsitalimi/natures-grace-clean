import React, { useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, TextInput } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { BackHeader, BelowHeaderTitle } from "@/components/layout";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { LayoutSpacing } from "@/constants/layout";
import { usePractitionerContext } from "@/context/PractitionerContext";
import { useReviews } from "@/context/ReviewsContext";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";
import type { PractitionerHomeReview } from "@/data/practitionerBookings";

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={styles.starRow}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Feather
          key={i}
          name="star"
          size={14}
          color={i < rating ? "#E5A93B" : Colors.light.divider}
        />
      ))}
    </View>
  );
}

function ReviewCard({
  review,
  onSaveReply,
}: {
  review: PractitionerHomeReview;
  onSaveReply: (reviewId: string, reply: string) => Promise<boolean>;
}) {
  const [replyVisible, setReplyVisible] = useState(false);
  const [replyText, setReplyText] = useState(review.providerReply ?? "");
  const [savedReply, setSavedReply] = useState(review.providerReply ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!replyText.trim()) return;
    setSaving(true);
    setSaveError(null);
    const ok = await onSaveReply(review.id, replyText);
    setSaving(false);
    if (ok) {
      setSavedReply(replyText.trim());
      setReplyVisible(false);
    } else {
      setSaveError("Could not save reply. Try again.");
    }
  };

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <ThemedText style={styles.reviewerName}>{review.userName}</ThemedText>
        <ThemedText style={styles.reviewDate}>{review.date}</ThemedText>
      </View>
      <StarRow rating={review.rating} />
      {review.service ? <ThemedText style={styles.serviceText}>{review.service}</ThemedText> : null}
      <ThemedText style={styles.reviewText}>{review.text}</ThemedText>
      {savedReply ? (
        <View style={styles.replyBubble}>
          <ThemedText style={styles.replyLabel}>Your reply</ThemedText>
          <ThemedText style={styles.replyText}>{savedReply}</ThemedText>
        </View>
      ) : null}
      <Pressable style={styles.replyBtn} onPress={() => setReplyVisible((v) => !v)}>
        <ThemedText style={styles.replyBtnText}>
          {replyVisible ? "Cancel" : savedReply ? "Edit reply" : "Reply to review"}
        </ThemedText>
      </Pressable>
      {replyVisible ? (
        <View style={styles.replyInputWrap}>
          <TextInput
            style={styles.replyInput}
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Write a thoughtful reply..."
            placeholderTextColor={Colors.light.textMuted}
            multiline
          />
          {saveError ? <ThemedText style={styles.errorText}>{saveError}</ThemedText> : null}
          <Pressable style={styles.saveReplyBtn} onPress={() => void handleSave()} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.saveReplyText}>Save reply</ThemedText>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function PractitionerReviewsScreen() {
  const navigation = useNavigation();
  const { scrollPaddingBottom } = useLayoutInsets(16);
  const { dashboard, loading, loadError, refresh } = usePractitionerContext();
  const { savePractitionerReply } = useReviews();
  const [refreshing, setRefreshing] = useState(false);

  const handleSaveReply = async (reviewId: string, reply: string) => {
    const ok = await savePractitionerReply(reviewId, reply);
    if (ok) {
      await refresh({ silent: true });
    }
    return ok;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh({ silent: true });
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <BackHeader showNotifications={false} />
      <BelowHeaderTitle>Client Reviews</BelowHeaderTitle>

      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <ThemedText style={styles.summaryLabel}>Average rating</ThemedText>
          <ThemedText style={styles.summaryValue}>
            {dashboard.reviewCount > 0 ? dashboard.avgRating.toFixed(1) : "—"}
          </ThemedText>
          <ThemedText style={styles.summaryHint}>
            {dashboard.reviewCount} approved review{dashboard.reviewCount === 1 ? "" : "s"}
          </ThemedText>
        </View>

        {loading || refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.light.accent} />
            <ThemedText style={styles.hint}>Loading reviews…</ThemedText>
          </View>
        ) : loadError ? (
          <View style={styles.centered}>
            <ThemedText style={styles.errorText}>{loadError}</ThemedText>
            <Pressable style={styles.retryBtn} onPress={() => void handleRefresh()}>
              <ThemedText style={styles.retryText}>Try again</ThemedText>
            </Pressable>
          </View>
        ) : dashboard.reviews.length === 0 ? (
          <View style={styles.centered}>
            <Feather name="star" size={36} color={Colors.light.textMuted} />
            <ThemedText style={styles.emptyTitle}>No reviews yet</ThemedText>
            <ThemedText style={styles.hint}>
              Approved client reviews will appear here after sessions are completed.
            </ThemedText>
          </View>
        ) : (
          dashboard.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} onSaveReply={handleSaveReply} />
          ))
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  summaryCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: LayoutSpacing.lg,
    alignItems: "center",
    marginBottom: LayoutSpacing.lg,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.light.accent,
  },
  summaryHint: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  reviewCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: LayoutSpacing.md,
    marginBottom: LayoutSpacing.sm,
    gap: 6,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
    flex: 1,
  },
  reviewDate: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginLeft: 8,
  },
  starRow: {
    flexDirection: "row",
    gap: 2,
  },
  serviceText: {
    fontSize: 12,
    color: Colors.light.accent,
    fontWeight: "500",
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.light.text,
  },
  centered: {
    alignItems: "center",
    paddingVertical: LayoutSpacing.xl,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.light.text,
  },
  hint: {
    fontSize: 14,
    color: Colors.light.textMuted,
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    fontSize: 14,
    color: "#8B3A3A",
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.accent,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
