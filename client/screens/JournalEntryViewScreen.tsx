import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useJournal } from "@/context/JournalContext";

type RouteParams = {
  JournalEntryView: { entryId: string };
};

function getMoodColor(mood: string): string {
  switch (mood) {
    case "Peaceful": return "#7BA68A";
    case "Grateful": return "#C4A97A";
    case "Anxious": return "#C47A7A";
    case "Hopeful": return "#7AAEC4";
    default: return Colors.light.accent;
  }
}

export default function JournalEntryViewScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, "JournalEntryView">>();
  const { entryId } = route.params;
  const { entries } = useJournal();

  const entry = entries.find((e) => e.id === entryId);

  if (!entry) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color={Colors.light.accent} />
          </Pressable>
          <View style={styles.headerCenter} />
          <View style={styles.headerIconButton} />
        </View>
        <View style={styles.titleSection}>
          <ThemedText style={styles.pageTitle}>Entry</ThemedText>
        </View>
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>Entry not found.</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <View style={styles.headerIconButton} />
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>Entry</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metaRow}>
          <View style={styles.dateContainer}>
            <Feather name="calendar" size={16} color={Colors.light.accent} />
            <ThemedText style={styles.dateText}>{entry.date}</ThemedText>
          </View>
          {entry.mood ? (
            <View style={styles.moodChip}>
              <View style={[styles.moodDot, { backgroundColor: getMoodColor(entry.mood) }]} />
              <ThemedText style={styles.moodText}>{entry.mood}</ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.contentCard}>
          <ThemedText style={styles.entryText}>{entry.fullText}</ThemedText>
        </View>

        <View style={styles.wordCountRow}>
          <ThemedText style={styles.wordCountText}>
            {entry.fullText.trim().split(/\s+/).length} words
          </ThemedText>
        </View>
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
    width: 40,
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
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateText: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.light.accent,
  },
  moodChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    gap: 6,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moodText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },
  contentCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xl,
  },
  entryText: {
    fontSize: 16,
    lineHeight: 26,
    color: Colors.light.text,
  },
  wordCountRow: {
    alignItems: "flex-end",
    paddingTop: Spacing.sm,
    paddingHorizontal: 4,
  },
  wordCountText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    opacity: 0.5,
  },
});
