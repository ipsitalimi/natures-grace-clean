import React, { useEffect, useState } from "react";
import {
  View,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { PageLayout } from "@/components/layout";
import { LayoutSpacing } from "@/constants/layout";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import type { UserSessionHistory } from "@/data/practitionerBookings";
import { useAuth } from "@/context/AuthContext";
import { usePractitionerContext } from "@/context/PractitionerContext";
import { useReviews } from "@/context/ReviewsContext";
import type { Review } from "@/data/reviews";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { useCancellationPolicy } from "@/lib/cancellationPolicy";

type ParamList = {
  SessionDetail: { sessionId: string };
};

function SessionDetailLayout({
  children,
  scrollable = true,
  footerInset = 0,
}: {
  children: React.ReactNode;
  scrollable?: boolean;
  footerInset?: number;
}) {
  return (
    <PageLayout
      title="Session Detail"
      titleInHeader
      header="back"
      scrollable={scrollable}
      footerInset={footerInset}
      style={styles.flex}
      contentContainerStyle={styles.pageContent}
    >
      {children}
    </PageLayout>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <ThemedText style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText style={styles.detailValue}>{value}</ThemedText>
    </View>
  );
}

function formatReceiptAmount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "Unavailable";
  return `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ParamList, "SessionDetail">>();
  const { sessionId } = route.params;

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
  const [receiptVisible, setReceiptVisible] = useState(false);
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
      <SessionDetailLayout scrollable={false}>
        <View style={styles.emptyState}>
          <ActivityIndicator color={Colors.light.accent} />
          <ThemedText style={styles.emptyText}>Loading session…</ThemedText>
        </View>
      </SessionDetailLayout>
    );
  }

  if (!session) {
    return (
      <SessionDetailLayout scrollable={false}>
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>
            {!isSupabaseConfigured()
              ? "Connect Supabase to view session details."
              : "Session not found."}
          </ThemedText>
        </View>
      </SessionDetailLayout>
    );
  }

  const isUpcoming = session.status === "Upcoming";

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
    <SessionDetailLayout>
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

        {session.status === "Upcoming" && session.meetingLink ? (
          <Pressable
            style={styles.refundCard}
            onPress={() => void Linking.openURL(session.meetingLink!)}
            testID="button-join-google-meet"
          >
            <Feather name="video" size={18} color={Colors.light.accent} />
            <View style={styles.refundCardBody}>
              <ThemedText style={styles.refundCardTitle}>Join Google Meet</ThemedText>
              <ThemedText style={styles.refundCardText}>Open your booked session</ThemedText>
            </View>
            <Feather name="external-link" size={18} color={Colors.light.textMuted} />
          </Pressable>
        ) : null}

        {session.paymentStatus === "Paid" ? (
          <>
            <Pressable
              style={styles.refundCard}
              onPress={() => setReceiptVisible(true)}
              testID="button-view-booking-receipt"
            >
              <Feather name="file-text" size={18} color={Colors.light.accent} />
              <View style={styles.refundCardBody}>
                <ThemedText style={styles.refundCardTitle}>View Receipt</ThemedText>
                <ThemedText style={styles.refundCardText}>View your payment breakdown</ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.light.textMuted} />
            </Pressable>

            <Modal
              visible={receiptVisible}
              transparent
              animationType="slide"
              onRequestClose={() => setReceiptVisible(false)}
              statusBarTranslucent
            >
              <View style={styles.receiptOverlay}>
                <View style={styles.receiptSheet}>
                  <View style={styles.receiptHeader}>
                    <View>
                      <ThemedText style={styles.receiptBrand}>NATURE'S GRACE</ThemedText>
                      <ThemedText style={styles.receiptTitle}>Payment receipt</ThemedText>
                    </View>
                    <Pressable
                      onPress={() => setReceiptVisible(false)}
                      hitSlop={12}
                      accessibilityLabel="Close receipt"
                      testID="button-close-booking-receipt"
                    >
                      <Feather name="x" size={22} color={Colors.light.text} />
                    </Pressable>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.receiptMeta}>
                      <ThemedText style={styles.receiptMetaLabel}>Booking reference</ThemedText>
                      <ThemedText style={styles.receiptMetaValue}>
                        {session.bookingNumber || session.id}
                      </ThemedText>
                    </View>
                    <View style={styles.receiptMeta}>
                      <ThemedText style={styles.receiptMetaLabel}>Payment status</ThemedText>
                      <ThemedText style={styles.receiptPaid}>PAID</ThemedText>
                    </View>
                    <View style={styles.receiptDivider} />

                    <ThemedText style={styles.receiptSectionTitle}>Session</ThemedText>
                    <DetailRow label="Practitioner" value={session.practitionerName} />
                    <DetailRow label="Service" value={session.serviceType} />
                    <DetailRow label="Date" value={session.date} />
                    <DetailRow label="Time" value={session.time} />
                    <DetailRow label="Duration" value={session.duration} />

                    <View style={styles.receiptDivider} />
                    <ThemedText style={styles.receiptSectionTitle}>Payment breakdown</ThemedText>
                    <View style={styles.receiptMoneyRow}>
                      <ThemedText style={styles.receiptMoneyLabel}>Session amount</ThemedText>
                      <ThemedText style={styles.receiptMoneyValue}>
                        {formatReceiptAmount(session.serviceAmountInr)}
                      </ThemedText>
                    </View>
                    <View style={styles.receiptMoneyRow}>
                      <ThemedText style={styles.receiptMoneyLabel}>Platform fee</ThemedText>
                      <ThemedText style={styles.receiptMoneyValue}>
                        {formatReceiptAmount(session.platformFeeInr)}
                      </ThemedText>
                    </View>
                    <View style={styles.receiptMoneyRow}>
                      <ThemedText style={styles.receiptMoneyLabel}>GST on platform fee</ThemedText>
                      <ThemedText style={styles.receiptMoneyValue}>
                        {formatReceiptAmount(session.platformGstInr)}
                      </ThemedText>
                    </View>
                    <View style={styles.receiptTotalRow}>
                      <ThemedText style={styles.receiptTotalLabel}>Total paid</ThemedText>
                      <ThemedText style={styles.receiptTotalValue}>
                        {formatReceiptAmount(session.totalPaidAmountInr)}
                      </ThemedText>
                    </View>

                    <View style={styles.receiptDivider} />
                    <ThemedText style={styles.receiptSectionTitle}>Transaction</ThemedText>
                    <DetailRow label="Payment method" value="Razorpay" />
                    <DetailRow label="Payment ID" value={session.paymentId || "Unavailable"} />
                    <ThemedText style={styles.receiptFootnote}>
                      This receipt reflects the amounts recorded for this booking.
                    </ThemedText>
                  </ScrollView>

                  <Pressable
                    style={styles.receiptCloseButton}
                    onPress={() => setReceiptVisible(false)}
                    testID="button-done-booking-receipt"
                  >
                    <ThemedText style={styles.receiptCloseButtonText}>Done</ThemedText>
                  </Pressable>
                </View>
              </View>
            </Modal>
          </>
        ) : null}

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

        {isUpcoming ? (
          <View style={styles.actionSection}>
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
      </SessionDetailLayout>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  pageContent: {
    paddingTop: LayoutSpacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
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
  receiptOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  receiptSheet: {
    maxHeight: "88%",
    backgroundColor: Colors.light.backgroundRoot,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  receiptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  receiptBrand: {
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: "700",
    color: Colors.light.accent,
  },
  receiptTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.light.text,
    marginTop: 4,
  },
  receiptMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },
  receiptMetaLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  receiptMetaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
    maxWidth: "62%",
    textAlign: "right",
  },
  receiptPaid: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.light.accent,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: Colors.light.divider,
    marginVertical: Spacing.md,
  },
  receiptSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 5,
  },
  receiptMoneyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
  },
  receiptMoneyLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  receiptMoneyValue: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.text,
  },
  receiptTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
  },
  receiptTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
  },
  receiptTotalValue: {
    fontSize: 19,
    fontWeight: "700",
    color: Colors.light.accent,
  },
  receiptFootnote: {
    fontSize: 12,
    color: Colors.light.textMuted,
    lineHeight: 18,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  receiptCloseButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  receiptCloseButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
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
  actionSection: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    gap: 10,
  },
  introChatButton: {
    backgroundColor: Colors.light.accent,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing.md,
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
