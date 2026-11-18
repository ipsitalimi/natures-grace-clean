import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Switch } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { TitleHeader, KeyboardFormLayout } from "@/components/layout";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import type { SessionOffering } from "@/data/practitionerBookings";
import { usePractitionerContext } from "@/context/PractitionerContext";
import { useAuth } from "@/context/AuthContext";
import { fetchAvailabilityForOffering } from "@/services/content/practitionerAvailabilityService";
import { fetchPractitionerProfileDetailsResult } from "@/services/content/practitionerId";
import { peekLastPractitionerProvisionError } from "@/services/content/practitionerId";
import { fetchMyPractitionerPricingRules, type PractitionerPricingRule } from "@/services/content/practitionerPricingService";

const DURATION_OPTIONS = [
  { minutes: 15, label: "15 mins" },
  { minutes: 20, label: "20 mins" },
  { minutes: 30, label: "30 mins" },
  { minutes: 45, label: "45 mins" },
  { minutes: 60, label: "60 mins" },
];

const PRICE_STEP = 100;

const TIME_OPTIONS = [
  "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
  "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM",
];
const DEFAULT_START = "9:00 AM";
const DEFAULT_END = "5:00 PM";

type TimingMode = "same" | "custom";
interface TimeSlot { start: string; end: string; additional?: { start: string; end: string }[]; }

function validateTimeWindows(windows: TimeSlot[]): boolean {
  const toMinutes = (value: string) => {
    const index = TIME_OPTIONS.indexOf(value);
    return index < 0 ? -1 : index * 60 + 6 * 60;
  };
  const sorted = windows.map((w) => ({ start: toMinutes(w.start), end: toMinutes(w.end) })).sort((a, b) => a.start - b.start);
  return sorted.every((w, i) => w.start >= 0 && w.end > w.start && (i === 0 || w.start >= sorted[i - 1].end));
}

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
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDateKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${DAYS_FULL[date.getDay()]}, ${d} ${MONTHS_SHORT[m - 1]}`;
}

// ─── Time Step Control ────────────────────────────────────────────────────────

interface TimeStepControlProps {
  value: string;
  onChange: (v: string) => void;
  minIndex?: number;
  maxIndex?: number;
}

function TimeStepControl({ value, onChange, minIndex = 0, maxIndex }: TimeStepControlProps) {
  const max = maxIndex ?? TIME_OPTIONS.length - 1;
  const idx = TIME_OPTIONS.indexOf(value);
  const canDec = idx > minIndex;
  const canInc = idx < max;

  return (
    <View style={tsStyles.row}>
      <Pressable
        style={[tsStyles.stepBtn, !canDec && tsStyles.stepBtnDisabled]}
        onPress={() => canDec && onChange(TIME_OPTIONS[idx - 1])}
        disabled={!canDec}
        testID={`time-step-left-${value.replace(/\s+/g, "-")}`}
      >
        <Feather name="chevron-left" size={15} color={canDec ? Colors.light.accent : Colors.light.textMuted} />
      </Pressable>
      <View style={tsStyles.timeBox}>
        <ThemedText style={tsStyles.timeText}>{value}</ThemedText>
      </View>
      <Pressable
        style={[tsStyles.stepBtn, !canInc && tsStyles.stepBtnDisabled]}
        onPress={() => canInc && onChange(TIME_OPTIONS[idx + 1])}
        disabled={!canInc}
        testID={`time-step-right-${value.replace(/\s+/g, "-")}`}
      >
        <Feather name="chevron-right" size={15} color={canInc ? Colors.light.accent : Colors.light.textMuted} />
      </Pressable>
    </View>
  );
}

const tsStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: `${Colors.light.accent}10`,
    justifyContent: "center",
    alignItems: "center",
  },
  stepBtnDisabled: {
    opacity: 0.35,
  },
  timeBox: {
    minWidth: 72,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
  },
  timeText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
});

// ─── Time Range Picker ────────────────────────────────────────────────────────

interface TimeRangePickerProps {
  value: TimeSlot;
  onChange: (v: TimeSlot) => void;
  compact?: boolean;
}

function TimeRangePicker({ value, onChange, compact = false }: TimeRangePickerProps) {
  const startIdx = TIME_OPTIONS.indexOf(value.start);
  const endIdx = TIME_OPTIONS.indexOf(value.end);

  const handleStartChange = (newStart: string) => {
    const newStartIdx = TIME_OPTIONS.indexOf(newStart);
    if (endIdx <= newStartIdx) {
      const newEnd = TIME_OPTIONS[Math.min(newStartIdx + 1, TIME_OPTIONS.length - 1)];
      onChange({ start: newStart, end: newEnd });
    } else {
      onChange({ ...value, start: newStart });
    }
  };

  const handleEndChange = (newEnd: string) => {
    onChange({ ...value, end: newEnd });
  };

  return (
    <View style={[trpStyles.container, compact && trpStyles.containerCompact]}>
      <View style={trpStyles.block}>
        <ThemedText style={trpStyles.label}>From</ThemedText>
        <TimeStepControl
          value={value.start}
          onChange={handleStartChange}
          minIndex={0}
          maxIndex={TIME_OPTIONS.length - 2}
        />
      </View>
      <Feather name="arrow-right" size={16} color={Colors.light.textMuted} style={trpStyles.arrow} />
      <View style={trpStyles.block}>
        <ThemedText style={trpStyles.label}>To</ThemedText>
        <TimeStepControl
          value={value.end}
          onChange={handleEndChange}
          minIndex={startIdx + 1}
          maxIndex={TIME_OPTIONS.length - 1}
        />
      </View>
    </View>
  );
}

const trpStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    gap: 8,
  },
  containerCompact: {
    padding: Spacing.sm,
  },
  block: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  arrow: {
    flexShrink: 0,
    marginTop: 14,
  },
});

// ─── Timing Section ───────────────────────────────────────────────────────────

interface TimingSectionProps {
  selectedDates: string[];
  timingMode: TimingMode;
  onChangeMode: (m: TimingMode) => void;
  globalTiming: TimeSlot;
  onChangeGlobalTiming: (v: TimeSlot) => void;
  dateTimings: Record<string, TimeSlot>;
  onChangeDateTiming: (date: string, v: TimeSlot) => void;
}

function TimingSection({
  selectedDates,
  timingMode,
  onChangeMode,
  globalTiming,
  onChangeGlobalTiming,
  dateTimings,
  onChangeDateTiming,
}: TimingSectionProps) {
  if (selectedDates.length === 0) return null;

  const sorted = [...selectedDates].sort();

  return (
    <View style={timStyles.wrapper}>
      <View style={timStyles.header}>
        <Feather name="clock" size={15} color={Colors.light.accent} />
        <ThemedText style={timStyles.headerTitle}>Session Timings</ThemedText>
      </View>
      <ThemedText style={timStyles.headerSub}>
        Define your availability window for the selected date{selectedDates.length > 1 ? "s" : ""}.
      </ThemedText>

      <View style={timStyles.modeToggle}>
        <Pressable
          style={[timStyles.modeBtn, timingMode === "same" && timStyles.modeBtnActive]}
          onPress={() => onChangeMode("same")}
          testID="timing-mode-same"
        >
          <Feather
            name="copy"
            size={14}
            color={timingMode === "same" ? "#FFFFFF" : Colors.light.textMuted}
          />
          <ThemedText
            style={[timStyles.modeBtnText, timingMode === "same" && timStyles.modeBtnTextActive]}
          >
            Same for all
          </ThemedText>
        </Pressable>
        <Pressable
          style={[timStyles.modeBtn, timingMode === "custom" && timStyles.modeBtnActive]}
          onPress={() => onChangeMode("custom")}
          testID="timing-mode-custom"
        >
          <Feather
            name="sliders"
            size={14}
            color={timingMode === "custom" ? "#FFFFFF" : Colors.light.textMuted}
          />
          <ThemedText
            style={[timStyles.modeBtnText, timingMode === "custom" && timStyles.modeBtnTextActive]}
          >
            Per day
          </ThemedText>
        </Pressable>
      </View>

      {timingMode === "same" ? (
        <View style={timStyles.sameBlock}>
          <TimeRangePicker value={globalTiming} onChange={(v) => onChangeGlobalTiming({ ...v, additional: globalTiming.additional })} />
          {(globalTiming.additional ?? []).map((window, index) => (
            <View key={`global-window-${index}`} style={timStyles.dateCard}>
              <View style={timStyles.dateLabelRow}>
                <ThemedText style={timStyles.dateCardLabel}>Additional window {index + 1}</ThemedText>
                <Pressable onPress={() => onChangeGlobalTiming({ ...globalTiming, additional: (globalTiming.additional ?? []).filter((_, i) => i !== index) })}>
                  <Feather name="trash-2" size={16} color="#8B3A3A" />
                </Pressable>
              </View>
              <TimeRangePicker value={window} compact onChange={(v) => onChangeGlobalTiming({ ...globalTiming, additional: (globalTiming.additional ?? []).map((w, i) => i === index ? v : w) })} />
            </View>
          ))}
          {(globalTiming.additional ?? []).length < 1 ? <Pressable style={timStyles.addWindow} onPress={() => onChangeGlobalTiming({ ...globalTiming, additional: [...(globalTiming.additional ?? []), { start: "4:00 PM", end: "8:00 PM" }] })}><Feather name="plus" size={15} color={Colors.light.accent} /><ThemedText style={timStyles.addWindowText}>Add another time window</ThemedText></Pressable> : null}
          <View style={timStyles.applyNote}>
            <Feather name="check-circle" size={13} color="#4A7C59" />
            <ThemedText style={timStyles.applyNoteText}>
              Applied to all {selectedDates.length} selected date{selectedDates.length > 1 ? "s" : ""}
            </ThemedText>
          </View>
        </View>
      ) : (
        <View style={timStyles.customBlock}>
          <View style={timStyles.customHint}>
            <Feather name="info" size={13} color={Colors.light.textMuted} />
            <ThemedText style={timStyles.customHintText}>
              Set a different time window for each date.
            </ThemedText>
          </View>
          {sorted.map((date) => {
            const timing = dateTimings[date] ?? globalTiming;
            return (
              <View key={date} style={timStyles.dateCard}>
                <View style={timStyles.dateLabelRow}>
                  <View style={timStyles.dateDot} />
                  <ThemedText style={timStyles.dateCardLabel}>{formatDateKey(date)}</ThemedText>
                  <ThemedText style={timStyles.dateCardTime}>
                    {timing.start} – {timing.end}
                  </ThemedText>
                </View>
                <TimeRangePicker value={timing} onChange={(v) => onChangeDateTiming(date, { ...v, additional: timing.additional })} compact />
                {(timing.additional ?? []).map((window, index) => (
                  <View key={`${date}-window-${index}`} style={timStyles.dateCard}>
                    <View style={timStyles.dateLabelRow}>
                      <ThemedText style={timStyles.dateCardLabel}>Additional window {index + 1}</ThemedText>
                      <Pressable onPress={() => onChangeDateTiming(date, { ...timing, additional: (timing.additional ?? []).filter((_, i) => i !== index) })}><Feather name="trash-2" size={16} color="#8B3A3A" /></Pressable>
                    </View>
                    <TimeRangePicker value={window} compact onChange={(v) => onChangeDateTiming(date, { ...timing, additional: (timing.additional ?? []).map((w, i) => i === index ? v : w) })} />
                  </View>
                ))}
                {(timing.additional ?? []).length < 1 ? <Pressable style={timStyles.addWindow} onPress={() => onChangeDateTiming(date, { ...timing, additional: [...(timing.additional ?? []), { start: "4:00 PM", end: "8:00 PM" }] })}><Feather name="plus" size={15} color={Colors.light.accent} /><ThemedText style={timStyles.addWindowText}>Add another time window</ThemedText></Pressable> : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const timStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: `${Colors.light.accent}06`,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: `${Colors.light.accent}18`,
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    lineHeight: 17,
    marginTop: -6,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: 3,
    gap: 3,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  modeBtnActive: {
    backgroundColor: Colors.light.accent,
  },
  modeBtnText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
  },
  modeBtnTextActive: {
    color: "#FFFFFF",
  },
  sameBlock: {
    gap: Spacing.sm,
  },
  applyNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  applyNoteText: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#4A7C59",
  },
  customBlock: {
    gap: Spacing.md,
  },
  customHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  customHintText: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    flex: 1,
  },
  addWindow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 4 },
  addWindowText: { fontSize: 13, fontFamily: "Nunito_700Bold", color: Colors.light.accent },
  dateCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  dateLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.light.accent,
    flexShrink: 0,
  },
  dateCardLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  dateCardTime: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
});

// ─── Calendar Picker ──────────────────────────────────────────────────────────

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
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
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
                if (day === null) return <View key={di} style={calStyles.dayCell} />;
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
  wrapper: { gap: Spacing.md },
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
  dayCellSelected: { backgroundColor: Colors.light.accent },
  dayCellToday: { borderWidth: 1.5, borderColor: Colors.light.accent },
  dayCellPast: { opacity: 0.3 },
  dayText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
  },
  dayTextSelected: { color: "#FFFFFF", fontFamily: "Nunito_700Bold" },
  dayTextToday: { color: Colors.light.accent, fontFamily: "Nunito_700Bold" },
  dayTextPast: { color: Colors.light.textMuted },
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AddEditOfferingScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { profile } = useAuth();

  const { offerings, upsertOffering } = usePractitionerContext();
  const offeringId: string | null = route.params?.offeringId ?? null;
  const existingOffering = offeringId
    ? offerings.find((o) => o.id === offeringId) ?? null
    : null;
  const isEdit = !!existingOffering;

  const [selectedType, setSelectedType] = useState<string>(existingOffering?.sessionType ?? "");
  const [selectedDuration, setSelectedDuration] = useState<number | null>(existingOffering?.duration ?? null);
  const [price, setPrice] = useState<number>(existingOffering?.price ?? 0);
  const [pricingRules, setPricingRules] = useState<PractitionerPricingRule[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingLoadError, setPricingLoadError] = useState("");
  const [notes, setNotes] = useState<string>(existingOffering?.notes ?? "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [alwaysAvailable, setAlwaysAvailable] = useState(true);

  const [timingMode, setTimingMode] = useState<TimingMode>("same");
  const [globalTiming, setGlobalTiming] = useState<TimeSlot>({ start: DEFAULT_START, end: DEFAULT_END });
  const [dateTimings, setDateTimings] = useState<Record<string, TimeSlot>>({});
  const [availabilityLoaded, setAvailabilityLoaded] = useState(!isEdit);
  const [approvedSessionTypes, setApprovedSessionTypes] = useState<string[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProfile(true);
      const result = await fetchPractitionerProfileDetailsResult(profile?.id);
      if (cancelled) return;
      if (result.ok) {
        const names = [
          ...new Set(
            result.profile.specialties?.map((s) => s.subcategory) ??
              (result.profile.subcategory ? [result.profile.subcategory] : [])
          ),
        ].filter(Boolean);
        setApprovedSessionTypes(names);
      } else {
        setApprovedSessionTypes([]);
      }
      setLoadingProfile(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const sessionTypeOptions = approvedSessionTypes;

  // React Navigation keeps stack screens mounted when they lose focus. Refresh
  // pricing whenever this screen becomes active so admin changes are picked up
  // without requiring the practitioner to sign out or restart the app.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setPricingLoading(true);
      setPricingLoadError("");
      setPricingRules([]);
      fetchMyPractitionerPricingRules(profile?.id)
        .then((rules) => {
          if (!cancelled) setPricingRules(rules);
        })
        .catch((error) => {
          console.error("[AddEditOffering] Could not refresh practitioner pricing:", error);
          if (!cancelled) {
            setPricingRules([]);
            setPricingLoadError(error instanceof Error ? error.message : "Could not load pricing rules.");
          }
        })
        .finally(() => {
          if (!cancelled) setPricingLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [profile?.id])
  );

  const selectedPricingRule = pricingRules.find(
    (rule) => rule.duration_minutes === selectedDuration && rule.is_enabled
  );
  const minPrice = selectedPricingRule ? selectedPricingRule.min_price : 0;
  const maxPrice = selectedPricingRule ? selectedPricingRule.max_price : 0;

  useEffect(() => {
    if (selectedType && sessionTypeOptions.includes(selectedType)) return;
    if (sessionTypeOptions.length === 0) {
      setSelectedType("");
      return;
    }
    setSelectedType((prev) => (prev && sessionTypeOptions.includes(prev) ? prev : sessionTypeOptions[0]));
  }, [selectedType, sessionTypeOptions]);

  useEffect(() => {
    if (!existingOffering?.id || !isEdit) return;
    let cancelled = false;
    (async () => {
      const avail = await fetchAvailabilityForOffering(existingOffering.id);
      if (cancelled) return;
      setAlwaysAvailable(avail.alwaysAvailable);
      setSelectedDates(avail.selectedDates);
      setTimingMode(avail.timingMode);
      setGlobalTiming(avail.globalTiming);
      setDateTimings(avail.dateTimings);
      setAvailabilityLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [existingOffering?.id, isEdit]);

  const toggleDate = (key: string) => {
    setSelectedDates((prev) => {
      if (prev.includes(key)) {
        const next = prev.filter((d) => d !== key);
        const { [key]: _, ...restTimings } = dateTimings;
        setDateTimings(restTimings);
        return next;
      }
      return [...prev, key];
    });
  };

  const handleChangeDateTiming = (date: string, v: TimeSlot) => {
    setDateTimings((prev) => ({ ...prev, [date]: v }));
  };

  const windowsValid = selectedDates.every((date) => validateTimeWindows([dateTimings[date] ?? globalTiming, ...((dateTimings[date] ?? globalTiming).additional ?? [])])) && validateTimeWindows([globalTiming, ...(globalTiming.additional ?? [])]);
  const canSave = selectedType !== "" && selectedDuration !== null && !!selectedPricingRule && price >= minPrice && price <= maxPrice && windowsValid;

  const handleSave = async () => {
    if (!canSave || saving) { if (!selectedPricingRule) setSaveError("This duration is not enabled or priced by the administrator."); return; }
    setSaving(true);
    setSaveError("");
    if (!windowsValid) { setSaveError("Time windows must be valid and cannot overlap. Please adjust them."); setSaving(false); return; }
    const offering: SessionOffering = {
      id: existingOffering?.id ?? `off-${Date.now()}`,
      sessionType: selectedType,
      duration: selectedDuration!,
      price,
      notes,
    };
    const saved = await upsertOffering(offering, {
      alwaysAvailable,
      selectedDates,
      timingMode,
      globalTiming,
      dateTimings,
    });
    setSaving(false);
    if (!saved) {
      const provision = peekLastPractitionerProvisionError();
      setSaveError(
        provision && !provision.ok
          ? provision.error
          : "Could not save this offering. Make sure your practitioner account is set up, then try again."
      );
      return;
    }
    setSaved(true);
    setTimeout(() => navigation.goBack(), 1200);
  };

  const incrementPrice = () => setPrice((p) => Math.min(p + PRICE_STEP, maxPrice));
  const decrementPrice = () => setPrice((p) => Math.max(p - PRICE_STEP, minPrice));

  return (
    <KeyboardFormLayout
      footerInset={30}
      header={
        <>
          <TitleHeader title={isEdit ? "Edit Offering" : "Add Session Offering"} showNotifications={false} />
        </>
      }
    >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TypeIcon />
            <ThemedText style={styles.sectionTitle}>Session Type</ThemedText>
          </View>
          <ThemedText style={styles.sectionSubtitle}>
            Choose a service from your approved specialties
          </ThemedText>
          {loadingProfile ? (
            <ThemedText style={styles.sectionSubtitle}>Loading your approved services…</ThemedText>
          ) : approvedSessionTypes.length === 0 ? (
            <ThemedText style={styles.sectionSubtitle}>
              No approved services found on your profile. Complete practitioner approval first.
            </ThemedText>
          ) : null}
          <View style={styles.chipsGrid}>
            {sessionTypeOptions.map((type) => (
              <Pressable
                key={type}
                style={[styles.chip, selectedType === type && styles.chipSelected]}
                onPress={() => setSelectedType(type)}
                testID={`chip-type-${type.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <ThemedText style={[styles.chipText, selectedType === type && styles.chipTextSelected]}>
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
            Choose a duration enabled by the Nature's Grace administrator.
          </ThemedText>
          {pricingLoading ? <ThemedText style={styles.sectionSubtitle}>Loading approved durations…</ThemedText> : null}
          <View style={styles.durationGrid}>
            {DURATION_OPTIONS.map((option) => (
              <Pressable
                key={option.minutes}
                style={[styles.durationOption, selectedDuration === option.minutes && styles.durationOptionSelected]}
                onPress={() => {
                  setSelectedDuration(option.minutes);
                  const rule = pricingRules.find((item) => item.duration_minutes === option.minutes && item.is_enabled);
                  if (rule) setPrice((current) => Math.min(Math.max(current || rule.min_price, rule.min_price), rule.max_price));
                }}
                disabled={!pricingRules.some((rule) => rule.duration_minutes === option.minutes && rule.is_enabled)}
                testID={`duration-${option.minutes}`}
              >
                <ThemedText style={[styles.durationText, selectedDuration === option.minutes && styles.durationTextSelected]}>
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          {!pricingLoading && pricingLoadError ? (
            <View style={styles.durationWarning} testID="duration-pricing-load-error">
              <Feather name="alert-circle" size={15} color="#8B5E20" />
              <ThemedText style={styles.durationWarningText}>
                Could not load your admin pricing settings: {pricingLoadError}
              </ThemedText>
            </View>
          ) : !pricingLoading && !pricingRules.some((rule) => rule.is_enabled) ? (
            <View style={styles.durationWarning} testID="duration-admin-warning">
              <Feather name="alert-circle" size={15} color="#8B5E20" />
              <ThemedText style={styles.durationWarningText}>
                You can add or edit a session offering only after the admin enables a session duration and sets its price range. Please contact the admin.
              </ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.durationHint}>
              Durations that have not been enabled and priced by the admin cannot be selected.
            </ThemedText>
          )}
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
              if (val) {
                setSelectedDates([]);
                setDateTimings({});
              }
            }}
          />
          {!alwaysAvailable ? (
            <TimingSection
              selectedDates={selectedDates}
              timingMode={timingMode}
              onChangeMode={setTimingMode}
              globalTiming={globalTiming}
              onChangeGlobalTiming={setGlobalTiming}
              dateTimings={dateTimings}
              onChangeDateTiming={handleChangeDateTiming}
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <PriceIcon />
            <ThemedText style={styles.sectionTitle}>Price</ThemedText>
          </View>
          {!selectedDuration ? (
            <ThemedText style={styles.sectionSubtitle}>Select an enabled duration to see its permitted price range.</ThemedText>
          ) : !selectedPricingRule ? (
            <ThemedText style={styles.sectionSubtitle}>This duration has not been enabled by the administrator. Choose another duration or contact the admin.</ThemedText>
          ) : (
            <>
              <ThemedText style={styles.sectionSubtitle}>
                Choose any whole-rupee price from ₹{minPrice.toLocaleString()} to ₹{maxPrice.toLocaleString()}.
              </ThemedText>
              <View style={styles.priceCard}>
                <Pressable
                  style={[styles.stepperBtn, price <= minPrice && styles.stepperBtnDisabled]}
                  onPress={decrementPrice}
                  disabled={price <= minPrice}
                  testID="button-price-minus"
                >
                  <Feather name="minus" size={20} color={price <= minPrice ? Colors.light.textMuted : Colors.light.accent} />
                </Pressable>
                <View style={styles.priceDisplay}>
                  <ThemedText style={styles.priceSymbol}>&#8377;</ThemedText>
                  <ThemedText style={styles.priceValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {price.toLocaleString()}
                  </ThemedText>
                </View>
                <Pressable
                  style={[styles.stepperBtn, price >= maxPrice && styles.stepperBtnDisabled]}
                  onPress={incrementPrice}
                  disabled={price >= maxPrice}
                  testID="button-price-plus"
                >
                  <Feather name="plus" size={20} color={price >= maxPrice ? Colors.light.textMuted : Colors.light.accent} />
                </Pressable>
              </View>
              <View style={styles.priceRange}>
                <ThemedText style={styles.priceRangeText}>₹{minPrice.toLocaleString()}</ThemedText>
                <View style={styles.priceFill}>
                  <View style={[styles.priceBar, { width: maxPrice > minPrice ? `${Math.max(0, Math.min(100, ((price - minPrice) / (maxPrice - minPrice)) * 100))}%` : "100%" }]} />
                </View>
                <ThemedText style={styles.priceRangeText}>₹{maxPrice.toLocaleString()}</ThemedText>
              </View>
            </>
          )}
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
              <ThemedText style={styles.previewDot}>·</ThemedText>
              <ThemedText style={styles.previewDuration}>
                {selectedDuration === 60 ? "1 hour" : `${selectedDuration} min`}
              </ThemedText>
            </View>
            <ThemedText style={styles.previewPrice}>&#8377;{price.toLocaleString()}</ThemedText>
            {!alwaysAvailable && selectedDates.length > 0 ? (
              <ThemedText style={styles.previewDates}>
                {selectedDates.length} date{selectedDates.length > 1 ? "s" : ""} ·{" "}
                {timingMode === "same"
                  ? `${globalTiming.start} – ${globalTiming.end}`
                  : "Custom timings per date"}
              </ThemedText>
            ) : alwaysAvailable ? (
              <ThemedText style={styles.previewDates}>Always available</ThemedText>
            ) : null}
          </View>
        ) : null}

        <Pressable
          style={[styles.saveButton, (!canSave || saving) && styles.saveButtonDisabled]}
          onPress={canSave && !saving ? handleSave : undefined}
          disabled={!canSave || saving}
          testID="button-save-offering"
        >
          <ThemedText style={[styles.saveButtonText, (!canSave || saving) && styles.saveButtonTextDisabled]}>
            {saving ? "Saving…" : canSave ? "Save Offering" : "Select Type & Duration"}
          </ThemedText>
        </Pressable>

        {saveError ? (
          <ThemedText style={{ color: "#8B3A3A", marginTop: 8, textAlign: "center" }}>
            {saveError}
          </ThemedText>
        ) : null}

        {saved ? (
          <View style={styles.confirmationBanner}>
            <Feather name="check-circle" size={16} color="#013220" />
            <ThemedText style={styles.confirmationText}>
              {isEdit ? "Offering updated successfully" : "Offering saved successfully"}
            </ThemedText>
          </View>
        ) : null}
    </KeyboardFormLayout>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.xl },
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
  chipTextSelected: { color: "#FFFFFF" },
  durationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  durationOption: {
    flex: 1,
    minWidth: 70,
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
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
  durationTextSelected: { color: "#FFFFFF" },
  durationWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#FFF6E8",
    borderWidth: 1,
    borderColor: "#E8D3AE",
  },
  durationWarningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Nunito_400Regular",
    color: "#76521F",
  },
  durationHint: {
    marginTop: Spacing.sm,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
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
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(1, 50, 32, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: { opacity: 0.4 },
  priceDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    flex: 1,
    minWidth: 0,
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
    flexShrink: 1,
    textAlign: "center",
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
    marginTop: Spacing.sm,
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
    gap: 4,
  },
  previewLabel: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewType: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  previewDot: {
    fontSize: 16,
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
  previewDates: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginTop: 2,
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
  saveButtonTextDisabled: { color: "#FFFFFF" },
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
