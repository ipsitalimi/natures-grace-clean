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
import ProfileDrawer from "@/components/ProfileDrawer";

type RootStackParamList = {
  BookSession: { practitionerId: string };
  SessionSummary: {
    practitionerId: string;
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

function getNextSevenDays(): { date: Date; dayName: string; dayNum: number; monthName: string }[] {
  const days = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    days.push({
      date,
      dayName: dayNames[date.getDay()],
      dayNum: date.getDate(),
      monthName: monthNames[date.getMonth()],
    });
  }
  return days;
}

const timeSlots = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
];

const durationOptions = [
  { minutes: 15, label: "15 mins" },
  { minutes: 30, label: "30 mins" },
  { minutes: 45, label: "45 mins" },
];

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
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<BookSessionRouteProp>();
  const { practitionerId } = route.params;

  const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number | null>(null);
  const [selectedDurationIndex, setSelectedDurationIndex] = useState<number | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const { practitionerCategories } = useDataContext();
  const practitioner = practitionerCategories.flatMap((c) => c.practitioners).find((p) => p.id === practitionerId);
  const dates = getNextSevenDays();

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

  const canContinue = selectedDateIndex !== null && selectedTimeIndex !== null && selectedDurationIndex !== null;
  const selectedDate = selectedDateIndex !== null ? dates[selectedDateIndex] : null;
  const selectedTime = selectedTimeIndex !== null ? timeSlots[selectedTimeIndex] : null;
  const selectedDuration = selectedDurationIndex !== null ? durationOptions[selectedDurationIndex] : null;

  const handleContinue = () => {
    if (selectedDate && selectedTime && selectedDuration) {
      navigation.navigate("SessionSummary", {
        practitionerId,
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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CalendarIcon size={18} />
            <ThemedText style={styles.sectionTitle}>Select Date</ThemedText>
          </View>
          <ThemedText style={styles.sectionSubtitle}>
            Choose a day that works for you
          </ThemedText>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.datesContainer}
          >
            {dates.map((day, index) => (
              <Pressable
                key={index}
                style={[
                  styles.dateCard,
                  selectedDateIndex === index && styles.dateCardSelected,
                ]}
                onPress={() => setSelectedDateIndex(index)}
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
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ClockIcon size={18} />
            <ThemedText style={styles.sectionTitle}>Select Time</ThemedText>
          </View>
          <ThemedText style={styles.sectionSubtitle}>
            Available time slots
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
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
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
