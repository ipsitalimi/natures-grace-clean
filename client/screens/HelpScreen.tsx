import React, { useCallback, useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { PageLayout, Card } from "@/components/layout";
import { LayoutSpacing } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { fetchPublishedFaqSections, type PublishedFaqSection } from "@/services/content/helpSupportService";

type FaqItemDisplay = PublishedFaqSection["items"][0];

function FAQItem({ item }: { item: FaqItemDisplay }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      onPress={() => setExpanded(!expanded)}
      style={styles.faqCard}
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
    </Card>
  );
}

export default function HelpScreen() {
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
    <PageLayout title="Help" titleInHeader header="back" contentContainerStyle={styles.content}>
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
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: LayoutSpacing.sm,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: LayoutSpacing.sm,
    marginBottom: LayoutSpacing.md,
  },
  hintText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: LayoutSpacing.md,
  },
  errorText: {
    fontSize: 14,
    color: "#8B3A3A",
    marginBottom: LayoutSpacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: LayoutSpacing.md,
  },
  sectionBlock: {
    marginBottom: LayoutSpacing.sm,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.textMuted,
    marginBottom: LayoutSpacing.sm,
    marginLeft: LayoutSpacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: LayoutSpacing.sm,
    marginLeft: LayoutSpacing.xs,
  },
  faqCard: {
    marginBottom: LayoutSpacing.sm,
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
    marginRight: LayoutSpacing.sm,
  },
  answer: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 21,
    marginTop: LayoutSpacing.md,
  },
});
