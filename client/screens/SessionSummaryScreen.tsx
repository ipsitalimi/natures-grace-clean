import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useDataContext } from "@/context/DataContext";
import { useBooking } from "@/context/BookingContext";
import ProfileDrawer from "@/components/ProfileDrawer";

type RootStackParamList = {
  SessionSummary: {
    practitionerId: string;
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
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SessionSummaryRouteProp>();
  const { practitionerId, selectedDate, selectedTime, duration } = route.params;
  const { setUpcomingBooking } = useBooking();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const { practitionerCategories } = useDataContext();
  const practitioner = practitionerCategories.flatMap((c) => c.practitioners).find((p) => p.id === practitionerId);

  if (!practitioner) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color={Colors.light.accent} />
          </Pressable>
          <View style={styles.headerCenter} />
          <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
            <Feather name="bell" size={22} color={Colors.light.accent} />
          </Pressable>
        </View>
        <ThemedText style={styles.errorText}>Practitioner not found</ThemedText>
      </View>
    );
  }

  const sessionPrice = calculatePrice(practitioner.pricePerSession, duration);

  const handleConfirmBooking = () => {
    setUpcomingBooking({
      practitionerId,
      practitionerName: practitioner.name,
      practitionerPhoto: practitioner.photo,
      category: getCategoryLabel(practitioner.category),
      date: selectedDate,
      time: selectedTime,
      duration,
    });
    navigation.navigate("Placeholder", { title: "Booking Confirmed" });
  };

  return (
    <View style={styles.container}>
      <ProfileDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.practitionerCard}>
          <Image source={{ uri: practitioner.photo }} style={styles.practitionerPhoto} />
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
            <ThemedText style={styles.summaryValue}>One-on-One Session</ThemedText>
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
            You can cancel or reschedule up to 24 hours before the session at no charge.
          </ThemedText>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={styles.confirmButton}
          onPress={handleConfirmBooking}
          testID="confirm-booking-button"
        >
          <ThemedText style={styles.confirmButtonText}>Confirm Booking</ThemedText>
        </Pressable>
      </View>
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
  practitionerInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  practitionerName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
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
  },
  summaryValue: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: "500",
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
  },
  confirmButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
