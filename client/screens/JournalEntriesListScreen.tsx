import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useJournal } from "@/context/JournalContext";

type RootStackParamList = {
  JournalEntryView: { entryId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function getMoodColor(mood: string): string {
  switch (mood) {
    case "Peaceful": return "#7BA68A";
    case "Grateful": return "#C4A97A";
    case "Anxious": return "#C47A7A";
    case "Hopeful": return "#7AAEC4";
    default: return Colors.light.accent;
  }
}

export default function JournalEntriesListScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { entries } = useJournal();

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>Recent Entries</ThemedText>
      </View>

      {entries.length > 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText style={styles.subtitle}>
            {entries.length} {entries.length === 1 ? "reflection" : "reflections"} captured
          </ThemedText>

          {entries.map((entry) => (
            <Pressable
              key={entry.id}
              style={({ pressed }) => [styles.entryCard, pressed && styles.entryCardPressed]}
              onPress={() => navigation.navigate("JournalEntryView", { entryId: entry.id })}
              testID={`entry-card-${entry.id}`}
            >
              <View style={styles.entryTop}>
                {entry.mood ? (
                  <View style={[styles.moodDot, { backgroundColor: getMoodColor(entry.mood) }]} />
                ) : null}
                <ThemedText style={styles.entryDate}>{entry.date}</ThemedText>
                {entry.mood ? (
                  <ThemedText style={styles.moodLabel}>{entry.mood}</ThemedText>
                ) : null}
              </View>
              <ThemedText style={styles.entryPreview} numberOfLines={2}>
                {entry.preview}
              </ThemedText>
              <Feather name="chevron-right" size={18} color={Colors.light.textSecondary} style={styles.chevron} />
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Feather name="book-open" size={36} color={Colors.light.textSecondary} />
          <ThemedText style={styles.emptyText}>Nothing here yet.</ThemedText>
          <ThemedText style={styles.emptySubtext}>Your reflections will appear here</ThemedText>
        </View>
      )}
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
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.lg,
    opacity: 0.7,
  },
  entryCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    padding: Spacing.lg,
    marginBottom: 12,
    position: "relative",
  },
  entryCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  entryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  entryDate: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.accent,
    flex: 1,
  },
  moodLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: "500",
    opacity: 0.6,
  },
  entryPreview: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.text,
    paddingRight: 24,
    opacity: 0.8,
  },
  chevron: {
    position: "absolute",
    right: 16,
    top: "50%",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    opacity: 0.6,
  },
});
