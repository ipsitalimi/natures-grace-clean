import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, Alert, ActivityIndicator } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { BackHeader } from "@/components/layout";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useDataContext } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { usePractitionerContext } from "@/context/PractitionerContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { resolveApiAccessToken } from "@/lib/apiAccessToken";
import { getApiBaseUrl } from "@/lib/apiBase";
import { runBookingCheckoutPayment } from "@/services/storeCheckoutService";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";
import { useCancellationPolicy } from "@/lib/cancellationPolicy";

type RootStackParamList = {
  SessionSummary: {
    practitionerId: string;
    offeringId?: string;
    serviceName?: string;
    sessionPrice: number;
    sessionDateIso: string;
    selectedDate: { dayName: string; dayNum: number; monthName: string };
    selectedTime: string;
    duration: number;
  };
  Placeholder: { title: string };
};

type SessionSummaryRouteProp = RouteProp<RootStackParamList, "SessionSummary">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function StarFilled({ size = 12, color = "#E5A93B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2L14.5 9H22L16 14L18 21L12 17L6 21L8 14L2 9H9.5L12 2Z" />
    </Svg>
  );
}

function getCategoryLabel(category: string): string {
  switch (category) {
    case "Healings":
      return "Healing Practitioner";
    case "Counseling":
      return "Counselor";
    case "Therapies":
      return "Therapist";
    case "Spiritual Guidance":
      return "Spiritual Guide";
    case "Financial Guidance":
      return "Financial Advisor";
    default:
      return "Practitioner";
  }
}

function formatDuration(minutes: number): string {
  if (minutes === 60) return "1 hour";
  return `${minutes} minutes`;
}

function calculatePrice(basePrice: number, duration: number): number {
  const pricePerMinute = basePrice / 60;
  return Math.round(pricePerMinute * duration);
}

export default function SessionSummaryScreen() {
  const { scrollPaddingBottom } = useLayoutInsets(Spacing.xl);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SessionSummaryRouteProp>();
  const { practitionerId, selectedDate, selectedTime, duration, offeringId, serviceName, sessionPrice, sessionDateIso } =
    route.params;
  const { profile, session } = useAuth();
  const { refresh: refreshPractitionerData } = usePractitionerContext();
  const [confirming, setConfirming] = useState(false);
  const { freeHours } = useCancellationPolicy();

  const { practitionerCategories } = useDataContext();
  const practitioner = practitionerCategories.flatMap((c) => c.practitioners).find((p) => p.id === practitionerId);

  if (!practitioner) {
    return (
      <View style={styles.container}>
        <BackHeader />
        <ThemedText style={styles.errorText}>Practitioner not found</ThemedText>
      </View>
    );
  }

  const displayDateLabel = `${selectedDate.dayName}, ${selectedDate.dayNum} ${selectedDate.monthName}`;

  const handleConfirmBooking = async () => {
    if (confirming) return;
    setConfirming(true);
    const sessionDateLabel = displayDateLabel;

    try {
      if (!isSupabaseConfigured()) {
        Alert.alert("Booking unavailable", "Connect Supabase to book sessions.");
        return;
      }
      const accessToken = await resolveApiAccessToken(session?.access_token);
      if (__DEV__) {
        console.log("[bookingCheckout][client] confirm booking auth state", {
          apiUrl: getApiBaseUrl(),
          supabaseSessionPresent: Boolean(session),
          contextAccessTokenPresent: Boolean(session?.access_token),
          resolvedAccessTokenPresent: Boolean(accessToken),
        });
      }
      if (!accessToken) {
        Alert.alert("Payment", "Please sign in to book a session.");
        return;
      }

      const checkout = await runBookingCheckoutPayment({
        amountInr: sessionPrice,
        durationMinutes: duration,
        practitionerId,
        accessToken,
        userId: session?.user?.id,
        customerName: profile?.full_name ?? undefined,
        customerEmail: profile?.email ?? session?.user?.email ?? undefined,
        booking: {
          practitionerId,
          offeringId,
          clientName: profile?.full_name ?? "Guest",
          clientEmail: profile?.email ?? session?.user?.email ?? undefined,
          serviceName: serviceName ?? getCategoryLabel(practitioner.category),
          sessionDate: sessionDateIso,
          sessionTime: selectedTime,
          durationMinutes: duration,
          amountInr: sessionPrice,
        },
      });
      if (checkout.error) {
        Alert.alert("Payment", checkout.error);
        return;
      }

      await refreshPractitionerData();
      if (checkout.bookingId) {
        (navigation as any).navigate("SessionDetail", { sessionId: checkout.bookingId });
      } else {
        navigation.navigate("SessionHistory" as never);
      }
    } finally {
      setConfirming(false);
    }
  };

  return (
    <View style={styles.container}>
      <BackHeader />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.practitionerCard}>
          {practitioner.photo ? (
            <Image source={{ uri: practitioner.photo }} style={styles.practitionerPhoto} />
          ) : (
            <View style={[styles.practitionerPhoto, styles.practitionerPhotoPlaceholder]}>
              <ThemedText style={styles.practitionerPhotoInitial}>
                {(practitioner.name || "?").charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          )}
          <View style={styles.practitionerInfo}>
            <ThemedText style={styles.practitionerName}>{practitioner.name}</ThemedText>
            <ThemedText style={styles.practitionerCategory}>
              {getCategoryLabel(practitioner.category)}
            </ThemedText>
            <View style={styles.ratingRow}>
              <StarFilled size={12} />
              <ThemedText style={styles.ratingText}>
                {practitioner.rating} ({practitioner.reviewCount} reviews)
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <ThemedText style={styles.summaryTitle}>Booking Details</ThemedText>
          
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Session Type</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {serviceName ?? "One-on-One Session"}
            </ThemedText>
          </View>
          
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Date</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {`${selectedDate.dayName}, ${selectedDate.dayNum} ${selectedDate.monthName}`}
            </ThemedText>
          </View>
          
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Time</ThemedText>
            <ThemedText style={styles.summaryValue}>{selectedTime}</ThemedText>
          </View>
          
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Duration</ThemedText>
            <ThemedText style={styles.summaryValue}>{formatDuration(duration)}</ThemedText>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <ThemedText style={styles.totalLabel}>Total</ThemedText>
            <ThemedText style={styles.totalValue}>
              ₹{sessionPrice.toLocaleString()}
            </ThemedText>
          </View>
        </View>

        <View style={styles.noteCard}>
          <Feather name="info" size={16} color={Colors.light.accent} />
          <ThemedText style={styles.noteText}>
            You can cancel at least {freeHours} hours before your session per our cancellation policy. To
            change the time, cancel (if eligible) and book again — in-app rescheduling is not available yet.
          </ThemedText>
        </View>

        <Pressable
          style={[styles.confirmButton, confirming && styles.confirmButtonDisabled]}
          onPress={() => void handleConfirmBooking()}
          disabled={confirming}
          testID="confirm-booking-button"
        >
          {confirming ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.confirmButtonText}>Confirm Booking</ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: 40,
  },
  practitionerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  practitionerPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.backgroundRoot,
  },
  practitionerPhotoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${Colors.light.accent}15`,
  },
  practitionerPhotoInitial: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.accent,
  },
  practitionerInfo: {
    marginLeft: Spacing.md,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  practitionerName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
    flexShrink: 1,
  },
  practitionerCategory: {
    fontSize: 13,
    color: Colors.light.accent,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  summaryCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    flexShrink: 0,
    marginRight: 12,
  },
  summaryValue: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: "500",
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.divider,
    marginVertical: Spacing.md,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.accent,
  },
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${Colors.light.accent}10`,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 10,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 20,
  },
  confirmButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
