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
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { fetchAvailabilityForOffering } from "@/services/content/practitionerAvailabilityService";
import { rescheduleUserBooking } from "@/services/bookingRescheduleApi";
import { getBookingDates, getTimeSlotsForDate } from "@/lib/bookingSlots";
import type { OfferingAvailabilityState } from "@/data/practitionerBookings";

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

function getSessionStart(date: string, time: string): Date | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(year, month - 1, day, hour, Number(match[2]), 0, 0);
  return Number.isNaN(result.getTime()) ? null : result;
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
  const { settings } = usePlatformConfig();
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
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);
  const [cancelResult, setCancelResult] = useState<string | null>(null);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [rescheduleVisible, setRescheduleVisible] = useState(false);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleAvailability, setRescheduleAvailability] = useState<OfferingAvailabilityState | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
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
  const rescheduleDates = getBookingDates(Math.max(1, settings.maxAdvanceBookingDays ?? 30));
  const sessionStart = getSessionStart(session.date, session.time);
  const canReschedule = isUpcoming && Boolean(sessionStart && sessionStart.getTime() - Date.now() > 24 * 60 * 60 * 1000);
  const sessionDurationMinutes = Number.parseInt(session.duration, 10);
  const rescheduleSlots = rescheduleDate && rescheduleAvailability
    ? getTimeSlotsForDate(rescheduleDate, rescheduleAvailability, sessionDurationMinutes)
    : [];

  const openReschedule = async () => {
    if (!session.offeringId || !session.practitionerId) {
      setRescheduleError("This booking is missing its service details. Please contact support.");
      setRescheduleVisible(true);
      return;
    }
    setRescheduleError(null);
    setRescheduleAvailability(null);
    setRescheduleDate(null);
    setRescheduleTime(null);
    setRescheduleVisible(true);
    try {
      const availability = await fetchAvailabilityForOffering(session.offeringId);
      setRescheduleAvailability(availability);
    } catch {
      setRescheduleError("Could not load available times. Please try again.");
    }
  };

  const confirmReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime || !authSession?.access_token || rescheduleLoading) return;
    setRescheduleLoading(true);
    setRescheduleError(null);
    try {
      const result = await rescheduleUserBooking(
        session.id,
        authSession.access_token,
        rescheduleDate,
        rescheduleTime
      );
      if (!result.ok) {
        setRescheduleError(result.error ?? "Rescheduling failed. Please try another slot.");
        return;
      }
      await refresh();
      setRescheduleVisible(false);
      setRescheduleDate(null);
      setRescheduleTime(null);
      setCancelResult("Your session has been successfully rescheduled.");
    } catch (error) {
      setRescheduleError(error instanceof Error ? error.message : "Rescheduling failed.");
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleCancelSession = () => {
    setCancelConfirmVisible(true);
  };

  const confirmCancelSession = async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      const updated = await cancelUserSession(session.id);
      if (!updated) {
        setCancelConfirmVisible(false);
        setCancelResult("Could not cancel this session. Please try again or contact support.");
        return;
      }
      await refresh();
      setCancelConfirmVisible(false);
      setCancelResult(
        session.paymentStatus === "Paid"
          ? "Your session was cancelled and a refund request was submitted. Our team will review it shortly."
          : "Your session was cancelled."
      );
    } catch (error) {
      setCancelConfirmVisible(false);
      setCancelResult(error instanceof Error ? error.message : "Could not cancel this session. Please try again.");
    } finally {
      setCancelling(false);
    }
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

        {canReschedule ? (
          <Pressable
            style={styles.rescheduleButton}
            onPress={() => void openReschedule()}
            testID="button-reschedule-session"
          >
            <Feather name="calendar" size={18} color={Colors.light.accent} />
            <ThemedText style={styles.rescheduleButtonText}>Reschedule Session</ThemedText>
          </Pressable>
        ) : null}

        <Modal
          visible={rescheduleVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setRescheduleVisible(false)}
        >
          <View style={styles.cancelModalOverlay}>
            <View style={styles.rescheduleModalCard}>
              <ThemedText style={styles.cancelModalTitle}>Reschedule Session</ThemedText>
              <ThemedText style={styles.cancelModalText}>
                Choose a new date and time. Rescheduling is available until 24 hours before your current session.
              </ThemedText>
              {!rescheduleAvailability && !rescheduleError ? (
                <ActivityIndicator color={Colors.light.accent} />
              ) : null}
              {rescheduleAvailability ? (
                <>
                  <ThemedText style={styles.rescheduleSectionTitle}>Select Date</ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.rescheduleChoices}>
                      {rescheduleDates.map((day) => (
                        <Pressable
                          key={day.isoDate}
                          style={[styles.rescheduleChoice, rescheduleDate === day.isoDate && styles.rescheduleChoiceSelected]}
                          onPress={() => { setRescheduleDate(day.isoDate); setRescheduleTime(null); }}
                        >
                          <ThemedText style={[styles.rescheduleChoiceText, rescheduleDate === day.isoDate && styles.rescheduleChoiceTextSelected]}>
                            {day.dayName} {day.dayNum} {day.monthName}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                  {rescheduleDate ? (
                    <>
                      <ThemedText style={styles.rescheduleSectionTitle}>Select Time</ThemedText>
                      <ScrollView style={styles.rescheduleTimeScroll} nestedScrollEnabled>
                        <View style={styles.rescheduleChoices}>
                          {rescheduleSlots.map((time) => (
                            <Pressable
                              key={time}
                              style={[styles.rescheduleChoice, rescheduleTime === time && styles.rescheduleChoiceSelected]}
                              onPress={() => setRescheduleTime(time)}
                            >
                              <ThemedText style={[styles.rescheduleChoiceText, rescheduleTime === time && styles.rescheduleChoiceTextSelected]}>
                                {time}
                              </ThemedText>
                            </Pressable>
                          ))}
                        </View>
                        {rescheduleSlots.length === 0 ? (
                          <ThemedText style={styles.cancelModalText}>No available times on this date.</ThemedText>
                        ) : null}
                      </ScrollView>
                    </>
                  ) : null}
                </>
              ) : null}
              {rescheduleError ? <ThemedText style={styles.reviewError}>{rescheduleError}</ThemedText> : null}
              <Pressable
                style={[styles.cancelModalButton, (!rescheduleDate || !rescheduleTime || rescheduleLoading) && styles.submitReviewDisabled]}
                onPress={() => void confirmReschedule()}
                disabled={!rescheduleDate || !rescheduleTime || rescheduleLoading}
                testID="button-confirm-reschedule"
              >
                {rescheduleLoading ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText style={styles.cancelModalButtonText}>Confirm New Time</ThemedText>}
              </Pressable>
              <Pressable style={styles.cancelModalKeepButton} onPress={() => setRescheduleVisible(false)}>
                <ThemedText style={styles.cancelModalKeepText}>Keep Current Session</ThemedText>
              </Pressable>
            </View>
          </View>
        </Modal>

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
                    <View style={styles.receiptMeta}>
                      <ThemedText style={styles.receiptMetaLabel}>Payment method</ThemedText>
                      <ThemedText style={styles.receiptMetaValue}>Razorpay</ThemedText>
                    </View>
                    <View style={styles.receiptMeta}>
                      <ThemedText style={styles.receiptMetaLabel}>Payment ID</ThemedText>
                      <ThemedText style={styles.receiptMetaValue}>{session.paymentId || "Unavailable"}</ThemedText>
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

        <Modal
          visible={cancelConfirmVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCancelConfirmVisible(false)}
        >
          <View style={styles.cancelModalOverlay}>
            <View style={styles.cancelModalCard}>
              <ThemedText style={styles.cancelModalTitle}>Cancel Session?</ThemedText>
              <ThemedText style={styles.cancelModalText}>
                {bookingCancelMessage(`${session.date}T${session.time || "12:00"}`)}
              </ThemedText>
              <ThemedText style={styles.cancelModalText}>Do you wish to continue?</ThemedText>
              <Pressable
                style={[styles.cancelModalButton, cancelling && styles.submitReviewDisabled]}
                onPress={() => void confirmCancelSession()}
                disabled={cancelling}
              >
                {cancelling ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText style={styles.cancelModalButtonText}>Confirm Cancellation</ThemedText>}
              </Pressable>
              <Pressable
                style={styles.cancelModalKeepButton}
                onPress={() => setCancelConfirmVisible(false)}
                disabled={cancelling}
              >
                <ThemedText style={styles.cancelModalKeepText}>Keep Session</ThemedText>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={cancelResult !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setCancelResult(null)}
        >
          <View style={styles.cancelModalOverlay}>
            <View style={styles.cancelModalCard}>
              <ThemedText style={styles.cancelModalTitle}>Cancellation Update</ThemedText>
              <ThemedText style={styles.cancelModalText}>{cancelResult}</ThemedText>
              <Pressable
                style={styles.cancelModalButton}
                onPress={() => {
                  setCancelResult(null);
                  if (session.status === "Upcoming") navigation.goBack();
                }}
              >
                <ThemedText style={styles.cancelModalButtonText}>OK</ThemedText>
              </Pressable>
            </View>
          </View>
        </Modal>

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
  rescheduleButton: {
    borderWidth: 1,
    borderColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
    marginBottom: Spacing.md,
  },
  rescheduleButtonText: {
    color: Colors.light.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  rescheduleModalCard: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "85%",
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  rescheduleSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.text,
    marginTop: Spacing.xs,
  },
  rescheduleChoices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 4,
  },
  rescheduleChoice: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  rescheduleChoiceSelected: {
    backgroundColor: Colors.light.button,
    borderColor: Colors.light.button,
  },
  rescheduleChoiceText: {
    color: Colors.light.text,
    fontSize: 13,
    fontWeight: "500",
  },
  rescheduleChoiceTextSelected: {
    color: "#FFFFFF",
  },
  rescheduleTimeScroll: {
    maxHeight: 150,
  },
  cancelModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  cancelModalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cancelModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
  },
  cancelModalText: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.light.textSecondary,
  },
  cancelModalButton: {
    backgroundColor: "#D4534A",
    borderRadius: BorderRadius.sm,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelModalButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  cancelModalKeepButton: {
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelModalKeepText: {
    color: Colors.light.text,
    fontSize: 14,
    fontWeight: "600",
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
