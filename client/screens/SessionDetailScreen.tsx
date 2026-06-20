import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import ProfileDrawer from "@/components/ProfileDrawer";
import type { UserSessionHistory } from "@/data/practitionerBookings";
import { useAuth } from "@/context/AuthContext";
import { usePractitionerContext } from "@/context/PractitionerContext";
import { useReviews } from "@/context/ReviewsContext";
import type { Review } from "@/data/reviews";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { getHeaderPaddingTop, getScrollBottomPadding, getAuthScreenPaddingTop } from "@/lib/layoutInsets";
import { openMeetingLink } from "@/lib/meetingLink";
import { useCancellationPolicy } from "@/lib/cancellationPolicy";

type ParamList = {
  SessionDetail: { sessionId: string };
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <ThemedText style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText style={styles.detailValue}>{value}</ThemedText>
    </View>
  );
}

function getStatusColor(status: UserSessionHistory["status"]): string {
  switch (status) {
    case "Completed":
      return Colors.light.accent;
    case "Upcoming":
      return "#E5A93B";
    case "Cancelled":
      return "#D4534A";
    default:
      return Colors.light.textSecondary;
  }
}

export default function SessionDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ParamList, "SessionDetail">>();
  const { sessionId } = route.params;
  const [drawerVisible, setDrawerVisible] = useState(false);

  const { session: authSession } = useAuth();
  const { userSessions, loading: practitionerLoading, refresh, cancelUserSession } =
    usePractitionerContext();
  const { submitReview, getReviewForBooking, refreshMyReviews } = useReviews();
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { bookingCancelMessage } = useCancellationPolicy();
  const session = userSessions.find((s) => s.id === sessionId);

  useEffect(() => {
    if (!session || session.status !== "Completed" || !isSupabaseConfigured()) return;
    let cancelled = false;
    setReviewLoading(true);
    getReviewForBooking(session.id)
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
        if (!cancelled) setReviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.id, session?.status, getReviewForBooking]);

  if (practitionerLoading && !session) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
          <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color={Colors.light.accent} />
          </Pressable>
          <View style={styles.headerCenter} />
          <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
            <Feather name="bell" size={22} color={Colors.light.accent} />
          </Pressable>
        </View>
        <View style={styles.titleSection}>
          <ThemedText style={styles.pageTitle}>Session Detail</ThemedText>
        </View>
        <View style={styles.emptyState}>
          <ActivityIndicator color={Colors.light.accent} />
          <ThemedText style={styles.emptyText}>Loading session…</ThemedText>
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
          <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color={Colors.light.accent} />
          </Pressable>
          <View style={styles.headerCenter} />
          <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
            <Feather name="bell" size={22} color={Colors.light.accent} />
          </Pressable>
        </View>

        <View style={styles.titleSection}>
          <ThemedText style={styles.pageTitle}>Session Detail</ThemedText>
        </View>

        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>
            {!isSupabaseConfigured()
              ? "Connect Supabase to view session details."
              : "Session not found."}
          </ThemedText>
        </View>
      </View>
    );
  }

  const isUpcoming = session.status === "Upcoming";

  const handleJoinSession = () => {
    openMeetingLink(session.meetingLink);
  };

  const handleCancelSession = () => {
    const refundNote = bookingCancelMessage(`${session.date}T${session.time || "12:00"}`);
    Alert.alert(
      "Cancel Session",
      `${refundNote}\n\nDo you wish to continue?`,
      [
        { text: "Keep Session", style: "cancel" },
        {
          text: "Cancel Session",
          style: "destructive",
          onPress: async () => {
            if (cancelling) return;
            setCancelling(true);
            const updated = await cancelUserSession(session.id);
            setCancelling(false);
            if (!updated) {
              Alert.alert("Could not cancel", "Please try again or contact support.");
              return;
            }
            await refresh();
            Alert.alert(
              "Session cancelled",
              session.paymentStatus === "Paid"
                ? "Your session was cancelled and a refund request was submitted. Our team will review it shortly."
                : "Your session was cancelled.",
              [{ text: "OK", onPress: () => navigation.goBack() }]
            );
          },
        },
      ]
    );
  };

  const handleSubmitReview = async () => {
    if (!reviewText.trim() || !session.practitionerId) {
      setReviewError("Add a review and ensure the session is linked to a practitioner.");
      return;
    }
    if (!authSession?.user) {
      setReviewError("Sign in to submit a review.");
      return;
    }
    setSubmittingReview(true);
    setReviewError(null);
    try {
      const created = await submitReview({
        targetType: "practitioner",
        practitionerId: session.practitionerId,
        practitionerName: session.practitionerName,
        serviceLabel: session.serviceType,
        bookingId: session.id,
        rating,
        body: reviewText,
      });
      if (!created) {
        setReviewError("Could not submit review.");
      } else {
        setExistingReview(created);
        setReviewSubmitted(true);
        await refreshMyReviews();
      }
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Could not submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <View style={styles.container}>
      <ProfileDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>Session Detail</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: getScrollBottomPadding(insets.bottom, 100) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <ThemedText style={styles.practitionerName}>{session.practitionerName}</ThemedText>
          <ThemedText style={styles.serviceType}>{session.serviceType}</ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(session.status)}15` }]}>
            <ThemedText style={[styles.statusBadgeText, { color: getStatusColor(session.status) }]}>
              {session.status}
            </ThemedText>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <ThemedText style={styles.sectionTitle}>Session Details</ThemedText>
          <DetailRow label="Practitioner" value={session.practitionerName} />
          <View style={styles.divider} />
          <DetailRow label="Service" value={session.serviceType} />
          <View style={styles.divider} />
          <DetailRow label="Date" value={session.date} />
          <View style={styles.divider} />
          <DetailRow label="Time" value={session.time} />
          <View style={styles.divider} />
          <DetailRow label="Duration" value={session.duration} />
          <View style={styles.divider} />
          <DetailRow label="Price" value={`\u20B9${session.price}`} />
        </View>

        {session.paymentStatus === "Paid" && session.status !== "Upcoming" ? (
          <Pressable
            style={styles.refundCard}
            onPress={() =>
              (navigation as any).navigate("RefundRequest", { bookingId: session.id })
            }
            testID="button-session-refund"
          >
            <Feather name="rotate-ccw" size={18} color={Colors.light.accent} />
            <View style={styles.refundCardBody}>
              <ThemedText style={styles.refundCardTitle}>Refund request</ThemedText>
              <ThemedText style={styles.refundCardText}>
                View status or submit details for this paid session.
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.light.textMuted} />
          </Pressable>
        ) : null}

        {session.status === "Completed" ? (
          <View style={styles.noteCard}>
            <Feather name="check-circle" size={16} color={Colors.light.accent} />
            <ThemedText style={styles.noteText}>
              This session has been completed. We hope it was a meaningful experience.
            </ThemedText>
          </View>
        ) : null}

        {session.status === "Completed" ? (
          <View style={styles.reviewCard}>
            <ThemedText style={styles.sectionTitle}>Your Review</ThemedText>
            {reviewLoading ? (
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
                    <Pressable key={n} onPress={() => setRating(n)} testID={`button-star-${n}`}>
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
                  placeholder="Share your experience..."
                  placeholderTextColor={Colors.light.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  testID="input-session-review"
                />
                {reviewError ? (
                  <ThemedText style={styles.reviewError}>{reviewError}</ThemedText>
                ) : null}
                <Pressable
                  style={[styles.submitReviewBtn, submittingReview && styles.submitReviewDisabled]}
                  onPress={handleSubmitReview}
                  disabled={submittingReview}
                  testID="button-submit-review"
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
        ) : null}
      </ScrollView>

      {isUpcoming ? (
        <View style={[styles.bottomBar, { paddingBottom: getScrollBottomPadding(insets.bottom, 16) }]}>
          <Pressable
            style={styles.joinButton}
            onPress={handleJoinSession}
            testID="button-join-session"
          >
            <ThemedText style={styles.joinButtonText}>Join Session</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.cancelButton, cancelling && styles.submitReviewDisabled]}
            onPress={handleCancelSession}
            disabled={cancelling}
            testID="button-cancel-session"
          >
            {cancelling ? (
              <ActivityIndicator color="#D4534A" />
            ) : (
              <ThemedText style={styles.cancelButtonText}>Cancel Session</ThemedText>
            )}
          </Pressable>
        </View>
      ) : null}
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
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  headerCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  practitionerName: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
  },
  serviceType: {
    fontSize: 15,
    color: Colors.light.accent,
    marginBottom: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  detailsCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.divider,
  },
  refundCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  refundCardBody: { flex: 1, gap: 2 },
  refundCardTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  refundCardText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${Colors.light.accent}10`,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    gap: 10,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 20,
  },
  reviewCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  starPicker: {
    flexDirection: "row",
    gap: 8,
    marginBottom: Spacing.md,
  },
  reviewInput: {
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    padding: Spacing.md,
    fontSize: 14,
    color: Colors.light.text,
    minHeight: 96,
    marginBottom: Spacing.sm,
  },
  reviewError: {
    fontSize: 13,
    color: "#8B3A3A",
    marginBottom: Spacing.sm,
  },
  reviewStatus: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.accent,
    marginBottom: Spacing.sm,
  },
  reviewBodyDisplay: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  submitReviewBtn: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  submitReviewDisabled: {
    opacity: 0.5,
  },
  submitReviewText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.backgroundRoot,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
    gap: 10,
  },
  joinButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    alignItems: "center",
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "#D4534A",
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#D4534A",
  },
});
