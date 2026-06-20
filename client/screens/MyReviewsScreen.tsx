import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useReviews } from "@/context/ReviewsContext";
import type { Review } from "@/data/reviews";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";

function StarRating({
  rating,
  onChange,
  editable,
}: {
  rating: number;
  onChange?: (rating: number) => void;
  editable?: boolean;
}) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable
          key={i}
          onPress={editable && onChange ? () => onChange(i) : undefined}
          disabled={!editable}
        >
          <Feather
            name="star"
            size={14}
            color={i <= rating ? "#E5A93B" : Colors.light.backgroundTertiary}
            style={i <= rating ? { opacity: 1 } : { opacity: 0.5 }}
          />
        </Pressable>
      ))}
    </View>
  );
}

function statusColor(status: Review["status"]) {
  switch (status) {
    case "Approved":
      return Colors.light.accent;
    case "Pending":
      return "#C4A97A";
    case "Flagged":
      return "#8B3A3A";
  }
}

function ReviewCard({
  review,
  onUpdate,
  onDelete,
}: {
  review: Review;
  onUpdate: (reviewId: string, patch: { rating?: number; body?: string }) => Promise<boolean>;
  onDelete: (reviewId: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(review.rating);
  const [text, setText] = useState(review.body);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isProduct = review.targetType === "product";
  const title = isProduct
    ? review.practitionerName || review.serviceLabel
    : review.practitionerName;
  const serviceType = isProduct
    ? review.serviceLabel || "Product"
    : review.serviceLabel || review.targetType;

  const handleSave = async () => {
    if (!text.trim()) {
      setActionError("Review text cannot be empty.");
      return;
    }
    setSaving(true);
    setActionError(null);
    const ok = await onUpdate(review.id, { rating, body: text.trim() });
    setSaving(false);
    if (ok) {
      setEditing(false);
    } else {
      setActionError("Could not update review. Only pending reviews can be edited.");
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete review", "Remove this review permanently?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void onDelete(review.id).then((ok) => {
            if (!ok) {
              Alert.alert("Could not delete", "Please try again.");
            }
          });
        },
      },
    ]);
  };

  return (
    <View style={styles.card} testID={`review-card-${review.id}`}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <ThemedText style={styles.practitionerName}>{title}</ThemedText>
          <ThemedText style={styles.serviceType}>{serviceType}</ThemedText>
        </View>
        <StarRating rating={editing ? rating : review.rating} onChange={setRating} editable={editing} />
      </View>

      {editing ? (
        <TextInput
          style={styles.editInput}
          multiline
          value={text}
          onChangeText={setText}
          textAlignVertical="top"
        />
      ) : (
        <ThemedText style={styles.reviewText}>{review.body}</ThemedText>
      )}

      <View style={styles.cardFooter}>
        <ThemedText style={styles.dateText}>
          {new Date(review.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </ThemedText>
        <ThemedText style={[styles.statusText, { color: statusColor(review.status) }]}>
          {review.status}
        </ThemedText>
      </View>

      {review.status === "Pending" ? (
        <View style={styles.actionsRow}>
          {editing ? (
            <>
              <Pressable style={styles.actionButton} onPress={() => void handleSave()} disabled={saving}>
                <ThemedText style={styles.actionButtonText}>{saving ? "Saving…" : "Save"}</ThemedText>
              </Pressable>
              <Pressable
                style={styles.actionButtonMuted}
                onPress={() => {
                  setEditing(false);
                  setRating(review.rating);
                  setText(review.body);
                  setActionError(null);
                }}
              >
                <ThemedText style={styles.actionButtonMutedText}>Cancel</ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={styles.actionButton} onPress={() => setEditing(true)}>
                <ThemedText style={styles.actionButtonText}>Edit</ThemedText>
              </Pressable>
              <Pressable style={styles.actionButtonMuted} onPress={handleDelete}>
                <ThemedText style={styles.actionButtonMutedText}>Delete</ThemedText>
              </Pressable>
            </>
          )}
        </View>
      ) : null}

      {actionError ? <ThemedText style={styles.actionError}>{actionError}</ThemedText> : null}
    </View>
  );
}

export default function MyReviewsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { session } = useAuth();
  const { myReviews, reviewsLoading, reviewsError, updateMyReview, deleteMyReview } = useReviews();

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable
          style={styles.headerIconButton}
          onPress={() => navigation.navigate("Notifications" as never)}
          testID="button-notifications"
        >
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>My Reviews</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getScrollBottomPadding(insets.bottom, 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {reviewsLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.light.accent} />
            <ThemedText style={styles.loadingText}>Loading your reviews…</ThemedText>
          </View>
        ) : null}

        {reviewsError ? (
          <ThemedText style={styles.errorText}>{reviewsError}</ThemedText>
        ) : null}

        {!session?.user && isSupabaseConfigured() ? (
          <ThemedText style={styles.errorText}>Sign in to view your reviews.</ThemedText>
        ) : null}

        {!reviewsLoading && !reviewsError && myReviews.length === 0 ? (
          <ThemedText style={styles.emptyText}>
            You have not written any reviews yet. Complete a session and share your experience
            from Session History.
          </ThemedText>
        ) : null}

        {myReviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            onUpdate={updateMyReview}
            onDelete={deleteMyReview}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: 8,
    backgroundColor: Colors.light.backgroundRoot,
  },
  headerIconButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: 10,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: "#8B3A3A",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  cardInfo: {
    flex: 1,
  },
  practitionerName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  serviceType: {
    fontSize: 14,
    color: Colors.light.accent,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  reviewText: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  editInput: {
    minHeight: 80,
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: `${Colors.light.accent}12`,
    borderRadius: BorderRadius.sm,
    paddingVertical: 10,
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.accent,
  },
  actionButtonMuted: {
    flex: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  actionButtonMutedText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.textSecondary,
  },
  actionError: {
    fontSize: 12,
    color: "#8B3A3A",
    marginTop: Spacing.sm,
  },
});
