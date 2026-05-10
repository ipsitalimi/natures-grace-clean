import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle, Rect } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing } from "@/constants/theme";
import ProfileDrawer from "@/components/ProfileDrawer";
import { useJournal } from "@/context/JournalContext";

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

function getMoodColor(mood: string): string {
  switch (mood) {
    case "Peaceful": return "#7BA68A";
    case "Grateful": return "#C4A97A";
    case "Anxious": return "#C47A7A";
    case "Hopeful": return "#7AAEC4";
    default: return Colors.light.accent;
  }
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

const moodOptions = ["Peaceful", "Grateful", "Anxious", "Hopeful"];

export default function MoodScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { entries, selectedMood, setSelectedMood, getStreak } = useJournal();

  const streak = getStreak();
  const recentEntries = entries.slice(0, 3);

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(selectedMood === mood ? null : mood);
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
    <View style={styles.container}>
      <ProfileDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerIconButton} onPress={goBackToHome} testID="button-back-home">
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>
      
      <View style={styles.topContent}>
        <View style={styles.titleSection}>
          <ThemedText style={styles.title}>Journal</ThemedText>
        </View>

        {streak > 0 ? (
          <View style={styles.streakContainer} testID="text-streak">
            <ThemedText style={styles.streakText}>
              {getStreakIcon()} {streak} day reflection streak
            </ThemedText>
          </View>
        ) : null}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
      >
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
          <View style={styles.moodRow}>
            {moodOptions.map((mood) => (
              <Pressable
                key={mood}
                style={[
                  styles.moodOption,
                  selectedMood === mood && styles.moodOptionSelected,
                ]}
                onPress={() => handleMoodSelect(mood)}
                testID={`mood-chip-${mood.toLowerCase()}`}
              >
                <View style={[styles.moodColorDot, { backgroundColor: getMoodColor(mood) }]} />
                <ThemedText
                  style={[
                    styles.moodEmoji,
                    selectedMood === mood && styles.moodEmojiSelected,
                  ]}
                >
                  {mood}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          {selectedMood ? (
            <View style={styles.moodConfirmation}>
              <Feather name="check" size={14} color={Colors.light.accent} />
              <ThemedText style={styles.moodConfirmationText}>
                Feeling {selectedMood.toLowerCase()} - will be attached to your next entry
              </ThemedText>
            </View>
          ) : null}
        </View>

        {recentEntries.length > 0 ? (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <ThemedText style={styles.sectionTitle}>Recent Entries</ThemedText>
              <Pressable onPress={() => navigation.navigate("JournalEntriesList")} testID="button-see-all">
                <ThemedText style={styles.seeAllText}>See All</ThemedText>
              </Pressable>
            </View>
            {recentEntries.map((entry) => (
              <Pressable
                key={entry.id}
                style={({ pressed }) => [styles.recentEntryCard, pressed && styles.recentEntryCardPressed]}
                onPress={() => navigation.navigate("JournalEntryView", { entryId: entry.id })}
                testID={`entry-card-${entry.id}`}
              >
                <View style={styles.recentEntryTop}>
                  {entry.mood ? (
                    <View style={[styles.entryMoodDot, { backgroundColor: getMoodColor(entry.mood) }]} />
                  ) : null}
                  <ThemedText style={styles.recentEntryDate}>{entry.date}</ThemedText>
                </View>
                <ThemedText style={styles.recentEntryPreview} numberOfLines={2}>
                  {entry.preview}
                </ThemedText>
              </Pressable>
            ))}
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
          badge="3"
          onPress={() => navigation.navigate("Gratitude")}
        />

        <MenuItem
          icon={<CalendarIcon size={22} color={Colors.light.accent} />}
          title="Monthly Overview"
          subtitle="Track your emotional journey"
          onPress={() => navigation.navigate("MonthlyOverview")}
        />
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
  topContent: {
    paddingHorizontal: Spacing.lg,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontSize: 34,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    letterSpacing: 0.5,
  },
  streakContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  streakText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: "500",
    opacity: 0.7,
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
  moodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  moodOption: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 12,
    paddingVertical: 10,
    marginHorizontal: 3,
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
