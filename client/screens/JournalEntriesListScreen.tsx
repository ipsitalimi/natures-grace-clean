import React from "react";
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { BackHeader, BelowHeaderTitle } from "@/components/layout";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useJournal } from "@/context/JournalContext";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";

import { getMoodColor, parseMoodsFromStorage } from "@/lib/journalMoods";

type RootStackParamList = {
  JournalEntryView: { entryId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function JournalEntriesListScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { scrollPaddingBottom } = useLayoutInsets(tabBarHeight);
  const navigation = useNavigation<NavigationProp>();
  const { entries, journalLoading, journalError, refreshJournal } = useJournal();

  return (
    <View style={styles.container}>
      <BackHeader />

      <BelowHeaderTitle>Recent Entries</BelowHeaderTitle>

      {journalLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={Colors.light.accent} />
          <ThemedText style={styles.emptyText}>Loading entries…</ThemedText>
        </View>
      ) : journalError ? (
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>{journalError}</ThemedText>
          <Pressable style={styles.retryButton} onPress={() => void refreshJournal()}>
            <ThemedText style={styles.retryButtonText}>Try again</ThemedText>
          </Pressable>
        </View>
      ) : entries.length > 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText style={styles.subtitle}>
            {entries.length} {entries.length === 1 ? "reflection" : "reflections"} captured
          </ThemedText>

          {entries.map((entry) => {
            const entryMoods = parseMoodsFromStorage(entry.mood);
            const moodLabel = entryMoods.join(", ");
            return (
            <Pressable
              key={entry.id}
              style={({ pressed }) => [styles.entryCard, pressed && styles.entryCardPressed]}
              onPress={() => navigation.navigate("JournalEntryView", { entryId: entry.id })}
              testID={`entry-card-${entry.id}`}
            >
              <View style={styles.entryTop}>
                {entryMoods[0] ? (
                  <View style={[styles.moodDot, { backgroundColor: getMoodColor(entryMoods[0]) }]} />
                ) : null}
                <ThemedText style={styles.entryDate}>{entry.date}</ThemedText>
                {moodLabel ? (
                  <ThemedText style={styles.moodLabel} numberOfLines={1}>{moodLabel}</ThemedText>
                ) : null}
              </View>
              <ThemedText style={styles.entryPreview} numberOfLines={2}>
                {entry.preview}
              </ThemedText>
              <Feather name="chevron-right" size={18} color={Colors.light.textSecondary} style={styles.chevron} />
            </Pressable>
          );
          })}
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
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.accent,
    marginTop: Spacing.sm,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
