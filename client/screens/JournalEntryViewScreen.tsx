import React from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { BackHeader, BelowHeaderTitle } from "@/components/layout";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useJournal } from "@/context/JournalContext";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";
import type { MoodStackParamList } from "@/navigation/MoodStackNavigator";

import { getMoodColor, parseMoodsFromStorage } from "@/lib/journalMoods";

type RouteParams = {
  JournalEntryView: { entryId: string };
};

type NavigationProp = NativeStackNavigationProp<MoodStackParamList, "JournalEntryView">;

export default function JournalEntryViewScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { scrollPaddingBottom } = useLayoutInsets(tabBarHeight);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RouteParams, "JournalEntryView">>();
  const { entryId } = route.params;
  const { entries, journalLoading, journalError } = useJournal();

  const entry = entries.find((e) => e.id === entryId);

  if (journalLoading) {
    return (
      <View style={styles.container}>
        <BackHeader showNotifications={false} />
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={Colors.light.accent} />
          <ThemedText style={styles.emptyText}>Loading entry…</ThemedText>
        </View>
      </View>
    );
  }

  if (journalError) {
    return (
      <View style={styles.container}>
        <BackHeader showNotifications={false} />
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>{journalError}</ThemedText>
        </View>
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={styles.container}>
        <BackHeader showNotifications={false} />
        <BelowHeaderTitle>Entry</BelowHeaderTitle>
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>Entry not found.</ThemedText>
        </View>
      </View>
    );
  }

  const entryMoods = parseMoodsFromStorage(entry.mood);

  return (
    <View style={styles.container}>
      <BackHeader
        showNotifications={false}
        rightAction={
          <Pressable
            style={styles.headerIconButton}
            onPress={() => navigation.navigate("JournalEditor", { entryId })}
            testID="button-edit-entry"
          >
            <Feather name="edit-2" size={20} color={Colors.light.accent} />
          </Pressable>
        }
      />

      <BelowHeaderTitle>Entry</BelowHeaderTitle>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metaRow}>
          <View style={styles.dateContainer}>
            <Feather name="calendar" size={16} color={Colors.light.accent} />
            <ThemedText style={styles.dateText}>{entry.date}</ThemedText>
          </View>
          {entryMoods.length > 0 ? (
            <View style={styles.moodChipRow}>
              {entryMoods.map((mood) => (
                <View key={mood} style={styles.moodChip}>
                  <View style={[styles.moodDot, { backgroundColor: getMoodColor(mood) }]} />
                  <ThemedText style={styles.moodText}>{mood}</ThemedText>
                </View>
              ))}
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
  headerIconButton: {
    padding: 8,
    width: 40,
    alignItems: "center",
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
    flexWrap: "wrap",
    gap: 8,
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
  moodChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-end",
    flex: 1,
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
