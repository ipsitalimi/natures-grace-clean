import React, { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { fetchPublishedFaqSections, type PublishedFaqSection } from "@/services/content/helpSupportService";

type FaqItemDisplay = PublishedFaqSection["items"][0];

function FAQItem({ item }: { item: FaqItemDisplay }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      style={styles.faqCard}
      onPress={() => setExpanded(!expanded)}
      testID={`faq-item-${item.id}`}
    >
      <View style={styles.faqHeader}>
        <ThemedText style={styles.question}>{item.question}</ThemedText>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={Colors.light.textSecondary}
        />
      </View>
      {expanded ? (
        <ThemedText style={styles.answer}>{item.answer}</ThemedText>
      ) : null}
    </Pressable>
  );
}

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [sections, setSections] = useState<PublishedFaqSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setSections([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetchPublishedFaqSections();
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      setSections([]);
      return;
    }
    setSections(res.sections);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const flatCount = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>Help</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: getScrollBottomPadding(insets.bottom, 24) }]}
        showsVerticalScrollIndicator={false}
      >
        {!isSupabaseConfigured() ? (
          <ThemedText style={styles.hintText}>Connect Supabase to load FAQs.</ThemedText>
        ) : null}

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.light.accent} />
            <ThemedText style={styles.hintText}>Loading questions…</ThemedText>
          </View>
        ) : null}

        {error ? (
          <Pressable onPress={() => void load()} testID="button-help-retry">
            <ThemedText style={styles.errorText}>{error} — tap to retry</ThemedText>
          </Pressable>
        ) : null}

        {isSupabaseConfigured() && !loading && !error ? (
          <ThemedText style={styles.sectionTitle}>Frequently Asked Questions</ThemedText>
        ) : null}

        {isSupabaseConfigured() && !loading && !error && flatCount === 0 ? (
          <ThemedText style={styles.emptyText}>No published FAQs yet.</ThemedText>
        ) : null}

        {sections.map((section) =>
          section.items.length > 0 ? (
            <View key={section.id} style={styles.sectionBlock}>
              {sections.length > 1 ? (
                <ThemedText style={styles.categoryTitle}>{section.title}</ThemedText>
              ) : null}
              {section.items.map((item) => (
                <FAQItem key={item.id} item={item} />
              ))}
            </View>
          ) : null
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  hintText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: 14,
    color: "#8B3A3A",
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
  },
  sectionBlock: {
    marginBottom: Spacing.sm,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.textMuted,
    marginBottom: Spacing.sm,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  faqCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: 10,
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  question: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  answer: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 21,
    marginTop: Spacing.md,
  },
});
