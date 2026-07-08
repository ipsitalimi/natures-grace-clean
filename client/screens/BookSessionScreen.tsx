import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";

import { ThemedText } from "@/components/ThemedText";
import { BackHeader } from "@/components/layout";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useDataContext } from "@/context/DataContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { fetchOfferingsForPractitioner } from "@/services/content/practitionerOfferingsService";
import { fetchAvailabilityForOffering } from "@/services/content/practitionerAvailabilityService";
import type { SessionOffering } from "@/data/practitionerBookings";
import type { OfferingAvailabilityState } from "@/data/practitionerBookings";
import {
  getBookingDates,
  getTimeSlotsForDate,
  isDateBookable,
} from "@/lib/bookingSlots";

type RootStackParamList = {
  BookSession: { practitionerId: string };
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

type BookSessionRouteProp = RouteProp<RootStackParamList, "BookSession">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function StarFilled({ size = 12, color = "#E5A93B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2L14.5 9H22L16 14L18 21L12 17L6 21L8 14L2 9H9.5L12 2Z" />
    </Svg>
  );
}

function CalendarIcon({ size = 20, color = Colors.light.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Path d="M16 2V6M8 2V6M3 10H21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function ClockIcon({ size = 20, color = Colors.light.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        stroke={color}
        strokeWidth="1.8"
      />
      <Path d="M12 6V12L16 14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
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

function getNextSevenDays(maxDays: number) {
  return getBookingDates(maxDays);
}

const DEFAULT_DURATION_OPTIONS = [
  { minutes: 15, label: "15 mins" },
  { minutes: 30, label: "30 mins" },
  { minutes: 45, label: "45 mins" },
];

function priceForDuration(
  offerings: SessionOffering[],
  durationMinutes: number,
  fallbackPerSession: number
): number {
  const offering = offerings.find((o) => o.duration === durationMinutes);
  if (offering) return offering.price;
  return Math.round((fallbackPerSession / 60) * durationMinutes);
}

function DurationIcon({ size = 20, color = Colors.light.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2V6M12 18V22M6 12H2M22 12H18"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Path
        d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z"
        stroke={color}
        strokeWidth="1.8"
      />
    </Svg>
  );
}

export default function BookSessionScreen() {
  const { scrollPaddingBottom } = useLayoutInsets(Spacing.xl);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<BookSessionRouteProp>();
  const { practitionerId } = route.params;

  const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number | null>(null);
  const [selectedDurationIndex, setSelectedDurationIndex] = useState<number | null>(null);
  const [offerings, setOfferings] = useState<SessionOffering[]>([]);
  const [availabilityByOfferingId, setAvailabilityByOfferingId] = useState<
    Record<string, OfferingAvailabilityState>
  >({});
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  const { practitionerCategories } = useDataContext();
  const { settings } = usePlatformConfig();
  const { session } = useAuth();
  const practitioner = practitionerCategories.flatMap((c) => c.practitioners).find((p) => p.id === practitionerId);
  const maxDays = Math.max(1, settings.maxAdvanceBookingDays ?? 7);
  const dates = getNextSevenDays(maxDays);

  const durationOptions = useMemo(() => {
    if (offerings.length === 0) return DEFAULT_DURATION_OPTIONS;
    const unique = [...new Map(offerings.map((o) => [o.duration, o])).values()];
    return unique.map((o) => ({ minutes: o.duration, label: `${o.duration} mins` }));
  }, [offerings]);

  const selectedOffering = useMemo(() => {
    if (selectedDurationIndex === null) return null;
    const minutes = durationOptions[selectedDurationIndex]?.minutes;
    if (!minutes) return null;
    return offerings.find((o) => o.duration === minutes) ?? null;
  }, [selectedDurationIndex, durationOptions, offerings]);
  const selectedAvailability = selectedOffering
    ? availabilityByOfferingId[selectedOffering.id] ?? null
    : null;
  const selectedDate = selectedDateIndex !== null ? dates[selectedDateIndex] : null;
  const timeSlots = useMemo(() => {
    if (!selectedDate || !selectedAvailability) return [];
    return getTimeSlotsForDate(selectedDate.isoDate, selectedAvailability);
  }, [selectedDate, selectedAvailability]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingSchedule(true);
      const rows = await fetchOfferingsForPractitioner(practitionerId);
      if (cancelled) return;
      setOfferings(rows);
      if (rows.length > 0) {
        const entries = await Promise.all(
          rows.map(async (offering) => [
            offering.id,
            await fetchAvailabilityForOffering(offering.id),
          ] as const)
        );
        if (!cancelled) {
          setAvailabilityByOfferingId(Object.fromEntries(entries));
        }
      }
      if (!cancelled) setLoadingSchedule(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [practitionerId]);

  useEffect(() => {
    setSelectedTimeIndex(null);
  }, [selectedDateIndex]);

  const bookableDates = useMemo(() => {
    if (!selectedAvailability) return dates.map((_, i) => i);
    return dates
      .map((d, i) => (isDateBookable(d.isoDate, selectedAvailability) ? i : -1))
      .filter((i) => i >= 0);
  }, [dates, selectedAvailability]);

  if (!practitioner) {
    return (
      <View style={styles.container}>
        <BackHeader />
        <ThemedText style={styles.errorText}>Practitioner not found</ThemedText>
      </View>
    );
  }

  const canContinue =
    selectedDateIndex !== null &&
    selectedTimeIndex !== null &&
    selectedDurationIndex !== null &&
    timeSlots.length > 0 &&
    !loadingSchedule &&
    offerings.length > 0 &&
    selectedAvailability !== null;

  const selectedTime = selectedTimeIndex !== null ? timeSlots[selectedTimeIndex] : null;
  const selectedDuration = selectedDurationIndex !== null ? durationOptions[selectedDurationIndex] : null;

  const handleContinue = () => {
    if (!session?.user && isSupabaseConfigured()) {
      navigation.navigate("Login" as never);
      return;
    }
    if (selectedDate && selectedTime && selectedDuration && practitioner) {
      const sessionPrice = priceForDuration(
        offerings,
        selectedDuration.minutes,
        practitioner.pricePerSession
      );
      navigation.navigate("SessionSummary", {
        practitionerId,
        offeringId: selectedOffering?.id,
        serviceName: selectedOffering?.sessionType ?? getCategoryLabel(practitioner.category),
        sessionPrice,
        sessionDateIso: selectedDate.isoDate,
        selectedDate: {
          dayName: selectedDate.dayName,
          dayNum: selectedDate.dayNum,
          monthName: selectedDate.monthName,
        },
        selectedTime,
        duration: selectedDuration.minutes,
      });
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

        {!loadingSchedule && offerings.length === 0 ? (
          <View style={styles.emptyScheduleCard}>
            <ThemedText style={styles.emptyScheduleText}>
              Unavailable at the moment — this practitioner has not published session offerings yet.
            </ThemedText>
          </View>
        ) : null}

        {!loadingSchedule && offerings.length > 0 && selectedOffering && !selectedAvailability ? (
          <View style={styles.emptyScheduleCard}>
            <ThemedText style={styles.emptyScheduleText}>
              No availability is configured for this session type yet.
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CalendarIcon size={18} />
            <ThemedText style={styles.sectionTitle}>Select Date</ThemedText>
          </View>
          <ThemedText style={styles.sectionSubtitle}>
            Choose a day that works for you
          </ThemedText>
          {loadingSchedule ? (
            <ActivityIndicator color={Colors.light.accent} style={{ marginVertical: Spacing.md }} />
          ) : null}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.datesContainer}
          >
            {dates.map((day, index) => {
              const disabled = selectedAvailability ? !bookableDates.includes(index) : false;
              return (
              <Pressable
                key={index}
                style={[
                  styles.dateCard,
                  selectedDateIndex === index && styles.dateCardSelected,
                  disabled && styles.dateCardDisabled,
                ]}
                onPress={() => !disabled && setSelectedDateIndex(index)}
                disabled={disabled}
              >
                <ThemedText
                  style={[
                    styles.dateDayName,
                    selectedDateIndex === index && styles.dateTextSelected,
                  ]}
                >
                  {day.dayName}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.dateDayNum,
                    selectedDateIndex === index && styles.dateTextSelected,
                  ]}
                >
                  {day.dayNum}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.dateMonth,
                    selectedDateIndex === index && styles.dateTextSelected,
                  ]}
                >
                  {day.monthName}
                </ThemedText>
              </Pressable>
            );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ClockIcon size={18} />
            <ThemedText style={styles.sectionTitle}>Select Time</ThemedText>
          </View>
          <ThemedText style={styles.sectionSubtitle}>
            {timeSlots.length === 0
              ? "No times available for this date"
              : "Available time slots"}
          </ThemedText>
          <View style={styles.timeSlotsGrid}>
            {timeSlots.map((time, index) => (
              <Pressable
                key={index}
                style={[
                  styles.timeSlot,
                  selectedTimeIndex === index && styles.timeSlotSelected,
                ]}
                onPress={() => setSelectedTimeIndex(index)}
              >
                <ThemedText
                  style={[
                    styles.timeSlotText,
                    selectedTimeIndex === index && styles.timeSlotTextSelected,
                  ]}
                >
                  {time}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DurationIcon size={18} />
            <ThemedText style={styles.sectionTitle}>Select Duration</ThemedText>
          </View>
          <ThemedText style={styles.sectionSubtitle}>
            How long would you like your session?
          </ThemedText>
          <View style={styles.durationGrid}>
            {durationOptions.map((option, index) => (
              <Pressable
                key={index}
                style={[
                  styles.durationOption,
                  selectedDurationIndex === index && styles.durationOptionSelected,
                ]}
                onPress={() => setSelectedDurationIndex(index)}
              >
                <ThemedText
                  style={[
                    styles.durationText,
                    selectedDurationIndex === index && styles.durationTextSelected,
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          style={[styles.confirmButton, !canContinue && styles.confirmButtonDisabled]}
          onPress={canContinue ? handleContinue : undefined}
          disabled={!canContinue}
          testID={canContinue ? "continue-button-enabled" : "continue-button-disabled"}
        >
          <ThemedText style={[styles.confirmButtonText, !canContinue && styles.confirmButtonTextDisabled]}>
            {canContinue ? "Continue" : "Select Date, Time & Duration"}
          </ThemedText>
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
    paddingTop: Spacing.sm,
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: 40,
  },
  emptyScheduleCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  emptyScheduleText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
    lineHeight: 20,
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
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
  },
  datesContainer: {
    gap: 10,
    paddingVertical: 2,
  },
  dateCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    minWidth: 64,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  dateCardSelected: {
    backgroundColor: Colors.light.button,
    borderColor: Colors.light.button,
  },
  dateCardDisabled: {
    opacity: 0.35,
  },
  dateDayName: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  dateDayNum: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.light.text,
  },
  dateMonth: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  dateTextSelected: {
    color: "#FFFFFF",
  },
  timeSlotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timeSlot: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  timeSlotSelected: {
    backgroundColor: Colors.light.button,
    borderColor: Colors.light.button,
  },
  timeSlotText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: "500",
  },
  timeSlotTextSelected: {
    color: "#FFFFFF",
  },
  durationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  durationOption: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  durationOptionSelected: {
    backgroundColor: Colors.light.button,
    borderColor: Colors.light.button,
  },
  durationText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: "500",
  },
  durationTextSelected: {
    color: "#FFFFFF",
  },
  confirmButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  confirmButtonDisabled: {
    backgroundColor: "#B8AF6F",
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  confirmButtonTextDisabled: {
    color: "#FFFFFF",
  },
});
