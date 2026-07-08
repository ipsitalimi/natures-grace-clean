import React, { useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, TextInput, Alert } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle, Rect } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/theme";
import { LayoutSpacing } from "@/constants/layout";
import { PageLayout } from "@/components/layout";
import { useDrawer } from "@/context/DrawerContext";
import { useIsSellerTabContext } from "@/hooks/useIsSellerTabContext";
import { useIsPractitionerTabContext } from "@/hooks/useIsPractitionerTabContext";
import { useJournal } from "@/context/JournalContext";
import { useGratitude } from "@/context/GratitudeContext";
import {
  DEFAULT_MOOD_OPTIONS,
  getMoodColor,
  MAX_CUSTOM_MOODS,
  MAX_SELECTED_MOODS,
  parseMoodsFromStorage,
} from "@/lib/journalMoods";

type MoodStackParamList = {
  JournalEditor: { prompt?: string } | undefined;
  JournalEntriesList: undefined;
  JournalEntryView: { entryId: string };
  Gratitude: undefined;
  MonthlyOverview: undefined;
  GuidedReflection: undefined;
};

type MainTabParamList = {
  HomeTab: undefined;
  MoodTab: undefined;
};

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<MoodStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

function BookIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 19.5V4.5C4 3.67 4.67 3 5.5 3H18.5C19.33 3 20 3.67 20 4.5V19.5C20 20.33 19.33 21 18.5 21H5.5C4.67 21 4 20.33 4 19.5Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M8 3V21" stroke={color} strokeWidth="1.5" />
      <Path d="M12 8H16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M12 12H16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function PenIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 3L21 8L8 21H3V16L16 3Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M14 5L19 10" stroke={color} strokeWidth="1.5" />
    </Svg>
  );
}

function HeartIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21C12 21 3 13.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 13 5.08C14.09 3.81 15.76 3 17.5 3C20.58 3 23 5.42 23 8.5C23 13.5 14 21 14 21"
        fill={color}
        opacity={0.2}
      />
      <Path
        d="M12 21C12 21 3 13.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 12 5.08C12.09 3.81 13.76 3 15.5 3C18.58 3 21 5.42 21 8.5C21 13.5 12 21 12 21Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="1.5" />
      <Path d="M16 2V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M8 2V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M3 10H21" stroke={color} strokeWidth="1.5" />
      <Circle cx="12" cy="16" r="2" fill={color} opacity={0.5} />
    </Svg>
  );
}


interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  onPress?: () => void;
}

function MenuItem({ icon, title, subtitle, badge, onPress }: MenuItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
      onPress={onPress}
    >
      <View style={styles.menuIconContainer}>
        {icon}
      </View>
      <View style={styles.menuContent}>
        <ThemedText style={styles.menuTitle}>{title}</ThemedText>
        {subtitle ? <ThemedText style={styles.menuSubtitle}>{subtitle}</ThemedText> : null}
      </View>
      {badge ? (
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>{badge}</ThemedText>
        </View>
      ) : null}
      <Feather name="chevron-right" size={18} color={Colors.light.textSecondary} />
    </Pressable>
  );
}

const moodOptions = [...DEFAULT_MOOD_OPTIONS];

export default function MoodScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { openDrawerForRole } = useDrawer();
  const isSellerTab = useIsSellerTabContext();
  const isPractitionerTab = useIsPractitionerTabContext();
  const isRoleTab = isSellerTab || isPractitionerTab;
  const {
    entries,
    selectedMoods,
    customMoods,
    toggleSelectedMood,
    addCustomMood,
    removeCustomMood,
    getStreak,
    journalLoading,
    journalError,
  } = useJournal();
  const { myGratitudes } = useGratitude();
  const [customMoodInput, setCustomMoodInput] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);

  const streak = getStreak();
  const recentEntries = entries.slice(0, 3);
  const atSelectionLimit = selectedMoods.length >= MAX_SELECTED_MOODS;

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const handleMoodSelect = (mood: string) => {
    if (!selectedMoods.includes(mood) && atSelectionLimit) {
      Alert.alert(
        "Selection limit",
        `You can select up to ${MAX_SELECTED_MOODS} moods at a time.`
      );
      return;
    }
    toggleSelectedMood(mood);
  };

  const handleAddCustomMood = async () => {
    const trimmed = customMoodInput.trim();
    if (!trimmed) return;
    if (customMoods.length >= MAX_CUSTOM_MOODS && !customMoods.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert(
        "Custom mood limit",
        `You can save up to ${MAX_CUSTOM_MOODS} custom moods. Remove one to add another.`
      );
      return;
    }
    if (!selectedMoods.includes(trimmed) && atSelectionLimit) {
      Alert.alert(
        "Selection limit",
        `You can select up to ${MAX_SELECTED_MOODS} moods at a time.`
      );
      return;
    }
    setAddingCustom(true);
    const ok = await addCustomMood(trimmed);
    setAddingCustom(false);
    if (ok) {
      setCustomMoodInput("");
    } else {
      Alert.alert("Could not add mood", "Please use a shorter name (max 24 characters).");
    }
  };

  const goBackToHome = () => {
    navigation.navigate("HomeTab");
  };

  const getStreakIcon = () => {
    if (streak >= 7) return "\u2728";
    if (streak >= 3) return "\uD83D\uDD25";
    return "\uD83C\uDF31";
  };

  return (
    <PageLayout
      title="Journal"
      titleInHeader
      header={isRoleTab ? "compact" : "title"}
      headerProps={
        isRoleTab
          ? {
              onProfilePress: () =>
                openDrawerForRole({ isSeller: isSellerTab, isPractitioner: isPractitionerTab }),
            }
          : { onBackPress: goBackToHome }
      }
      footerInset={tabBarHeight}
    >
      {streak > 0 ? (
        <View style={styles.streakContainer} testID="text-streak">
          <ThemedText style={styles.streakText}>
            {getStreakIcon()} {streak} day reflection streak
          </ThemedText>
        </View>
      ) : null}

        <View style={styles.promptCard}>
          <ThemedText style={styles.promptDate}>{todayDate}</ThemedText>
          <ThemedText style={styles.promptText}>
            Take a moment to reflect on your day and capture your thoughts.
          </ThemedText>
          <Pressable
            style={styles.writeButton}
            onPress={() => navigation.navigate("JournalEditor")}
            testID="button-write-entry"
          >
            <PenIcon size={16} color="#FFFFFF" />
            <ThemedText style={styles.writeButtonText}>Write Today's Entry</ThemedText>
          </Pressable>
          <Pressable
            style={styles.guidedButton}
            onPress={() => navigation.navigate("GuidedReflection")}
            testID="button-guided-reflection"
          >
            <Feather name="compass" size={16} color={Colors.light.accent} />
            <ThemedText style={styles.guidedButtonText}>I don't know what to write</ThemedText>
          </Pressable>
        </View>

        <View style={styles.moodSection}>
          <ThemedText style={styles.sectionTitle}>How are you feeling?</ThemedText>
          <ThemedText style={styles.moodHint}>
            Select up to {MAX_SELECTED_MOODS} moods for your next entry
          </ThemedText>
          <View style={styles.moodRow}>
            {moodOptions.map((mood) => {
              const selected = selectedMoods.includes(mood);
              return (
                <Pressable
                  key={mood}
                  style={[styles.moodOption, selected && styles.moodOptionSelected]}
                  onPress={() => handleMoodSelect(mood)}
                  testID={`mood-chip-${mood.toLowerCase()}`}
                >
                  <View style={[styles.moodColorDot, { backgroundColor: getMoodColor(mood) }]} />
                  <ThemedText style={[styles.moodEmoji, selected && styles.moodEmojiSelected]}>
                    {mood}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {customMoods.length > 0 ? (
            <View style={styles.customMoodRow}>
              {customMoods.map((mood) => {
                const selected = selectedMoods.includes(mood);
                return (
                  <Pressable
                    key={mood}
                    style={[styles.customMoodChip, selected && styles.moodOptionSelected]}
                    onPress={() => handleMoodSelect(mood)}
                    onLongPress={() => {
                      Alert.alert("Remove custom mood?", mood, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Remove", style: "destructive", onPress: () => void removeCustomMood(mood) },
                      ]);
                    }}
                  >
                    <View style={[styles.moodColorDot, { backgroundColor: getMoodColor(mood) }]} />
                    <ThemedText
                      style={[styles.customMoodText, selected && styles.moodEmojiSelected]}
                      numberOfLines={1}
                    >
                      {mood}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {customMoods.length < MAX_CUSTOM_MOODS ? (
            <View style={styles.addCustomRow}>
              <TextInput
                style={styles.customMoodInput}
                placeholder="Add a custom mood"
                placeholderTextColor={Colors.light.textMuted}
                value={customMoodInput}
                onChangeText={setCustomMoodInput}
                maxLength={24}
                returnKeyType="done"
                onSubmitEditing={() => void handleAddCustomMood()}
              />
              <Pressable
                style={[styles.addCustomButton, (!customMoodInput.trim() || addingCustom) && styles.addCustomButtonDisabled]}
                onPress={() => void handleAddCustomMood()}
                disabled={!customMoodInput.trim() || addingCustom}
              >
                {addingCustom ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="plus" size={18} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          ) : null}

          {selectedMoods.length > 0 ? (
            <View style={styles.moodConfirmation}>
              <Feather name="check" size={14} color={Colors.light.accent} />
              <ThemedText style={styles.moodConfirmationText}>
                {selectedMoods.join(", ")} — will be attached to your next entry
              </ThemedText>
            </View>
          ) : null}
        </View>

        {journalLoading ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="small" color={Colors.light.accent} />
            <ThemedText style={styles.loadingText}>Loading journal…</ThemedText>
          </View>
        ) : journalError ? (
          <View style={styles.loadingSection}>
            <ThemedText style={styles.loadingText}>{journalError}</ThemedText>
          </View>
        ) : null}

        {!journalLoading && recentEntries.length > 0 ? (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <ThemedText style={styles.sectionTitle}>Recent Entries</ThemedText>
              <Pressable onPress={() => navigation.navigate("JournalEntriesList")} testID="button-see-all">
                <ThemedText style={styles.seeAllText}>See All</ThemedText>
              </Pressable>
            </View>
            {recentEntries.map((entry) => {
              const entryMoods = parseMoodsFromStorage(entry.mood);
              return (
              <Pressable
                key={entry.id}
                style={({ pressed }) => [styles.recentEntryCard, pressed && styles.recentEntryCardPressed]}
                onPress={() => navigation.navigate("JournalEntryView", { entryId: entry.id })}
                testID={`entry-card-${entry.id}`}
              >
                <View style={styles.recentEntryTop}>
                  {entryMoods[0] ? (
                    <View style={[styles.entryMoodDot, { backgroundColor: getMoodColor(entryMoods[0]) }]} />
                  ) : null}
                  <ThemedText style={styles.recentEntryDate}>{entry.date}</ThemedText>
                </View>
                <ThemedText style={styles.recentEntryPreview} numberOfLines={2}>
                  {entry.preview}
                </ThemedText>
              </Pressable>
            );
            })}
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Your Journal</ThemedText>
        </View>

        <MenuItem
          icon={<BookIcon size={22} color={Colors.light.accent} />}
          title="All Entries"
          subtitle="View your past reflections"
          badge={entries.length > 0 ? String(entries.length) : undefined}
          onPress={() => navigation.navigate("JournalEntriesList")}
        />

        <MenuItem
          icon={<HeartIcon size={22} color={Colors.light.accent} />}
          title="Gratitude Log"
          subtitle="Things you're thankful for"
          badge={myGratitudes.length > 0 ? String(myGratitudes.length) : undefined}
          onPress={() => navigation.navigate("Gratitude")}
        />

        <MenuItem
          icon={<CalendarIcon size={22} color={Colors.light.accent} />}
          title="Monthly Overview"
          subtitle="Track your emotional journey"
          onPress={() => navigation.navigate("MonthlyOverview")}
        />
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  streakContainer: {
    alignItems: "center",
    marginBottom: LayoutSpacing.lg,
  },
  streakText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: "500",
    opacity: 0.7,
  },
  loadingSection: {
    alignItems: "center",
    paddingVertical: LayoutSpacing.lg,
    gap: LayoutSpacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  promptCard: {
    backgroundColor: Colors.light.accent,
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    marginBottom: 20,
  },
  promptDate: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
  },
  promptText: {
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 22,
    marginBottom: 16,
    fontFamily: "ui-serif",
  },
  writeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 10,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 10,
  },
  writeButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  guidedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 10,
    paddingVertical: 10,
    gap: 8,
  },
  guidedButtonText: {
    fontSize: 13,
    color: Colors.light.accent,
    fontWeight: "500",
  },
  moodSection: {
    marginBottom: 20,
  },
  moodHint: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 4,
    marginBottom: 8,
  },
  moodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  moodOption: {
    width: "47%",
    minWidth: 100,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  moodColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moodEmoji: {
    fontSize: 11,
    color: Colors.light.text,
    fontWeight: "500",
  },
  moodOptionSelected: {
    borderColor: Colors.light.accent,
    backgroundColor: `${Colors.light.accent}10`,
  },
  moodEmojiSelected: {
    color: Colors.light.accent,
    fontWeight: "700",
  },
  customMoodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  customMoodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
    maxWidth: "100%",
  },
  customMoodText: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: "500",
    flexShrink: 1,
  },
  addCustomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  customMoodInput: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  addCustomButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.light.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  addCustomButtonDisabled: {
    opacity: 0.45,
  },
  moodConfirmation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  moodConfirmationText: {
    fontSize: 12,
    color: Colors.light.accent,
    fontWeight: "500",
    opacity: 0.7,
    flex: 1,
    flexShrink: 1,
  },
  recentSection: {
    marginBottom: 20,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 13,
    color: Colors.light.accent,
    fontWeight: "600",
    opacity: 0.7,
  },
  recentEntryCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  recentEntryCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  recentEntryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  entryMoodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recentEntryDate: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.accent,
  },
  recentEntryPreview: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.light.text,
    opacity: 0.8,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  menuItemPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${Colors.light.accent}10`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
  },
  menuSubtitle: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  badge: {
    backgroundColor: Colors.light.accent,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  badgeText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
