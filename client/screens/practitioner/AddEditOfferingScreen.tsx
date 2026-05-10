import React, { useState } from "react";
import { View, ScrollView, StyleSheet, TextInput, Pressable, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { offeringsStore, type SessionOffering } from "@/data/sessionOfferingsStore";

const SESSION_TYPES = [
  "Healing",
  "Counseling",
  "Spiritual Guidance",
  "Therapy",
  "Nutrition",
  "Financial Guidance",
];

const DURATION_OPTIONS = [
  { minutes: 15, label: "15 mins" },
  { minutes: 30, label: "30 mins" },
  { minutes: 45, label: "45 mins" },
  { minutes: 60, label: "60 mins" },
];

const MIN_PRICE = 500;
const MAX_PRICE = 2500;
const PRICE_STEP = 100;

function TypeIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={Colors.light.accent} strokeWidth="1.5" fill="none" />
      <Path d="M8 12L11 15L16 9" stroke={Colors.light.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ClockIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        stroke={Colors.light.accent}
        strokeWidth="1.5"
      />
      <Path d="M12 6V12L16 14" stroke={Colors.light.accent} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function PriceIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={Colors.light.accent} strokeWidth="1.5" fill="none" />
      <Path d="M12 6V18" stroke={Colors.light.accent} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M9 9C9 9 9.5 8 12 8C14.5 8 15 9.5 15 10C15 12 9 12 9 14C9 15 10 16 12 16C14.5 16 15 15 15 15" stroke={Colors.light.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface CalendarPickerProps {
  selectedDates: string[];
  onToggleDate: (key: string) => void;
  alwaysAvailable: boolean;
  onToggleAlways: (val: boolean) => void;
}

function CalendarPicker({ selectedDates, onToggleDate, alwaysAvailable, onToggleAlways }: CalendarPickerProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View style={calStyles.wrapper}>
      <View style={calStyles.alwaysRow}>
        <View style={calStyles.alwaysLeft}>
          <Feather name="check-circle" size={16} color={Colors.light.accent} />
          <ThemedText style={calStyles.alwaysLabel}>Always available</ThemedText>
        </View>
        <Switch
          value={alwaysAvailable}
          onValueChange={onToggleAlways}
          trackColor={{ false: Colors.light.divider, true: Colors.light.accent }}
          thumbColor="#FFFFFF"
        />
      </View>

      {!alwaysAvailable ? (
        <View style={calStyles.calendarBox}>
          <View style={calStyles.monthRow}>
            <Pressable style={calStyles.navBtn} onPress={goToPrevMonth} testID="calendar-prev">
              <Feather name="chevron-left" size={18} color={Colors.light.accent} />
            </Pressable>
            <ThemedText style={calStyles.monthLabel}>
              {MONTHS[viewMonth]} {viewYear}
            </ThemedText>
            <Pressable style={calStyles.navBtn} onPress={goToNextMonth} testID="calendar-next">
              <Feather name="chevron-right" size={18} color={Colors.light.accent} />
            </Pressable>
          </View>

          <View style={calStyles.dayHeaders}>
            {DAYS_SHORT.map((d) => (
              <ThemedText key={d} style={calStyles.dayHeader}>{d}</ThemedText>
            ))}
          </View>

          {rows.map((row, ri) => (
            <View key={ri} style={calStyles.weekRow}>
              {row.map((day, di) => {
                if (day === null) {
                  return <View key={di} style={calStyles.dayCell} />;
                }
                const key = toDateKey(viewYear, viewMonth, day);
                const isSelected = selectedDates.includes(key);
                const isToday = key === todayKey;
                const isPast = new Date(viewYear, viewMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                return (
                  <Pressable
                    key={di}
                    style={[
                      calStyles.dayCell,
                      isSelected && calStyles.dayCellSelected,
                      isToday && !isSelected && calStyles.dayCellToday,
                      isPast && calStyles.dayCellPast,
                    ]}
                    onPress={() => { if (!isPast) onToggleDate(key); }}
                    disabled={isPast}
                    testID={`calendar-day-${key}`}
                  >
                    <ThemedText
                      style={[
                        calStyles.dayText,
                        isSelected && calStyles.dayTextSelected,
                        isToday && !isSelected && calStyles.dayTextToday,
                        isPast && calStyles.dayTextPast,
                      ]}
                    >
                      {day}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ))}

          {selectedDates.length > 0 ? (
            <View style={calStyles.selectedSummary}>
              <ThemedText style={calStyles.selectedCount}>
                {selectedDates.length} date{selectedDates.length > 1 ? "s" : ""} selected
              </ThemedText>
              <Pressable onPress={() => selectedDates.forEach((d) => onToggleDate(d))} testID="calendar-clear">
                <ThemedText style={calStyles.clearText}>Clear all</ThemedText>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={calStyles.alwaysNote}>
          <Feather name="info" size={13} color={Colors.light.textMuted} />
          <ThemedText style={calStyles.alwaysNoteText}>
            You will appear available every day for this offering.
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const calStyles = StyleSheet.create({
  wrapper: {
    gap: Spacing.md,
  },
  alwaysRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  alwaysLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  alwaysLabel: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  calendarBox: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(1,50,32,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  dayHeaders: {
    flexDirection: "row",
    marginBottom: 6,
  },
  dayHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  dayCell: {
    flex: 1,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
  },
  dayCellSelected: {
    backgroundColor: Colors.light.accent,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: Colors.light.accent,
  },
  dayCellPast: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
  },
  dayTextSelected: {
    color: "#FFFFFF",
    fontFamily: "Nunito_700Bold",
  },
  dayTextToday: {
    color: Colors.light.accent,
    fontFamily: "Nunito_700Bold",
  },
  dayTextPast: {
    color: Colors.light.textMuted,
  },
  selectedSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  selectedCount: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  clearText: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textDecorationLine: "underline",
  },
  alwaysNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(1,50,32,0.05)",
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  alwaysNoteText: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    flex: 1,
  },
});

export default function AddEditOfferingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();

  const offeringId: string | null = route.params?.offeringId ?? null;
  const existingOffering = offeringId
    ? offeringsStore.getOfferings().find((o) => o.id === offeringId) ?? null
    : null;
  const isEdit = !!existingOffering;

  const [selectedType, setSelectedType] = useState<string>(existingOffering?.sessionType ?? "");
  const [selectedDuration, setSelectedDuration] = useState<number | null>(existingOffering?.duration ?? null);
  const [price, setPrice] = useState<number>(existingOffering?.price ?? 1000);
  const [notes, setNotes] = useState<string>(existingOffering?.notes ?? "");
  const [saved, setSaved] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [alwaysAvailable, setAlwaysAvailable] = useState(true);

  const toggleDate = (key: string) => {
    setSelectedDates((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]
    );
  };

  const canSave = selectedType !== "" && selectedDuration !== null;

  const handleSave = () => {
    if (!canSave) return;
    const offering: SessionOffering = {
      id: existingOffering?.id ?? `off-${Date.now()}`,
      sessionType: selectedType,
      duration: selectedDuration!,
      price,
      notes,
    };
    if (isEdit) {
      offeringsStore.updateOffering(offering);
    } else {
      offeringsStore.addOffering(offering);
    }
    setSaved(true);
    setTimeout(() => {
      navigation.goBack();
    }, 1200);
  };

  const incrementPrice = () => {
    setPrice((p) => Math.min(p + PRICE_STEP, MAX_PRICE));
  };

  const decrementPrice = () => {
    setPrice((p) => Math.max(p - PRICE_STEP, MIN_PRICE));
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={20} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>
          {isEdit ? "Edit Offering" : "Add Session Offering"}
        </ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TypeIcon />
            <ThemedText style={styles.sectionTitle}>Session Type</ThemedText>
          </View>
          <ThemedText style={styles.sectionSubtitle}>
            Choose the type of session you offer
          </ThemedText>
          <View style={styles.chipsGrid}>
            {SESSION_TYPES.map((type) => (
              <Pressable
                key={type}
                style={[
                  styles.chip,
                  selectedType === type && styles.chipSelected,
                ]}
                onPress={() => setSelectedType(type)}
                testID={`chip-type-${type.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    selectedType === type && styles.chipTextSelected,
                  ]}
                >
                  {type}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ClockIcon />
            <ThemedText style={styles.sectionTitle}>Duration</ThemedText>
          </View>
          <ThemedText style={styles.sectionSubtitle}>
            How long is this session?
          </ThemedText>
          <View style={styles.durationGrid}>
            {DURATION_OPTIONS.map((option) => (
              <Pressable
                key={option.minutes}
                style={[
                  styles.durationOption,
                  selectedDuration === option.minutes && styles.durationOptionSelected,
                ]}
                onPress={() => setSelectedDuration(option.minutes)}
                testID={`duration-${option.minutes}`}
              >
                <ThemedText
                  style={[
                    styles.durationText,
                    selectedDuration === option.minutes && styles.durationTextSelected,
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="calendar" size={18} color={Colors.light.accent} />
            <ThemedText style={styles.sectionTitle}>Availability</ThemedText>
          </View>
          <ThemedText style={styles.sectionSubtitle}>
            Select the dates you are available for this offering
          </ThemedText>
          <CalendarPicker
            selectedDates={selectedDates}
            onToggleDate={toggleDate}
            alwaysAvailable={alwaysAvailable}
            onToggleAlways={(val) => {
              setAlwaysAvailable(val);
              if (val) setSelectedDates([]);
            }}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <PriceIcon />
            <ThemedText style={styles.sectionTitle}>Price</ThemedText>
          </View>
          <ThemedText style={styles.sectionSubtitle}>
            Set your session price (&#8377;500 - &#8377;2,500)
          </ThemedText>
          <View style={styles.priceCard}>
            <Pressable
              style={[styles.stepperBtn, price <= MIN_PRICE && styles.stepperBtnDisabled]}
              onPress={decrementPrice}
              disabled={price <= MIN_PRICE}
              testID="button-price-minus"
            >
              <Feather name="minus" size={20} color={price <= MIN_PRICE ? Colors.light.textMuted : Colors.light.accent} />
            </Pressable>
            <View style={styles.priceDisplay}>
              <ThemedText style={styles.priceSymbol}>&#8377;</ThemedText>
              <ThemedText style={styles.priceValue}>{price.toLocaleString()}</ThemedText>
            </View>
            <Pressable
              style={[styles.stepperBtn, price >= MAX_PRICE && styles.stepperBtnDisabled]}
              onPress={incrementPrice}
              disabled={price >= MAX_PRICE}
              testID="button-price-plus"
            >
              <Feather name="plus" size={20} color={price >= MAX_PRICE ? Colors.light.textMuted : Colors.light.accent} />
            </Pressable>
          </View>
          <View style={styles.priceRange}>
            <ThemedText style={styles.priceRangeText}>&#8377;500</ThemedText>
            <View style={styles.priceFill}>
              <View
                style={[
                  styles.priceBar,
                  { width: `${((price - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100}%` },
                ]}
              />
            </View>
            <ThemedText style={styles.priceRangeText}>&#8377;2,500</ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="file-text" size={18} color={Colors.light.accent} />
            <ThemedText style={styles.sectionTitle}>Notes (Optional)</ThemedText>
          </View>
          <ThemedText style={styles.sectionSubtitle}>
            Add any additional details about this offering
          </ThemedText>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g., What the client can expect..."
            placeholderTextColor={Colors.light.textMuted}
            multiline
            numberOfLines={3}
            testID="input-notes"
          />
        </View>

        {canSave ? (
          <View style={styles.previewCard}>
            <ThemedText style={styles.previewLabel}>Preview</ThemedText>
            <View style={styles.previewRow}>
              <ThemedText style={styles.previewType}>{selectedType}</ThemedText>
              <ThemedText style={styles.previewDot}>-</ThemedText>
              <ThemedText style={styles.previewDuration}>
                {selectedDuration === 60 ? "1 hour" : `${selectedDuration} min`}
              </ThemedText>
            </View>
            <ThemedText style={styles.previewPrice}>&#8377;{price.toLocaleString()}</ThemedText>
          </View>
        ) : null}

        <Pressable
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={canSave ? handleSave : undefined}
          disabled={!canSave}
          testID="button-save-offering"
        >
          <ThemedText style={[styles.saveButtonText, !canSave && styles.saveButtonTextDisabled]}>
            {canSave ? "Save Offering" : "Select Type & Duration"}
          </ThemedText>
        </Pressable>

        {saved ? (
          <View style={styles.confirmationBanner}>
            <Feather name="check-circle" size={16} color="#013220" />
            <ThemedText style={styles.confirmationText}>
              {isEdit ? "Offering updated successfully" : "Offering saved successfully"}
            </ThemedText>
          </View>
        ) : null}
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
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
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginBottom: Spacing.md,
  },
  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  chipSelected: {
    backgroundColor: Colors.light.button,
    borderColor: Colors.light.button,
  },
  chipText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  chipTextSelected: {
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
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  durationTextSelected: {
    color: "#FFFFFF",
  },
  priceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(1, 50, 32, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  priceDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceSymbol: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginRight: 2,
  },
  priceValue: {
    fontSize: 32,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  priceRange: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  priceRangeText: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  priceFill: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(1, 50, 32, 0.08)",
    borderRadius: 2,
    overflow: "hidden",
  },
  priceBar: {
    height: 4,
    backgroundColor: Colors.light.accent,
    borderRadius: 2,
  },
  notesInput: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    minHeight: 80,
    textAlignVertical: "top",
  },
  previewCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    borderStyle: "dashed",
    alignItems: "center",
  },
  previewLabel: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  previewType: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  previewDot: {
    fontSize: 14,
    color: Colors.light.textMuted,
  },
  previewDuration: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  previewPrice: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  saveButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#B8AF6F",
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  saveButtonTextDisabled: {
    color: "#FFFFFF",
  },
  confirmationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(1, 50, 32, 0.1)",
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  confirmationText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#013220",
  },
});
