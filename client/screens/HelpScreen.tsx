import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

const faqItems = [
  {
    id: "1",
    question: "How do I book a session?",
    answer: "Browse our wellness categories, select a practitioner, and tap 'Book Session' to schedule your appointment.",
  },
  {
    id: "2",
    question: "Can I cancel a booking?",
    answer: "Yes, you can cancel up to 24 hours before your session from the Session History page.",
  },
  {
    id: "3",
    question: "How do I change my account details?",
    answer: "Go to Settings > Edit Profile to update your name, email, and other information.",
  },
  {
    id: "4",
    question: "Is my data secure?",
    answer: "Yes, we use industry-standard encryption to protect all your personal information.",
  },
  {
    id: "5",
    question: "How do I contact support?",
    answer: "You can reach us through the Contact page in Settings, or email us at support@naturesgrace.com.",
  },
];

function FAQItem({ item }: { item: (typeof faqItems)[0] }) {
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

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.sectionTitle}>Frequently Asked Questions</ThemedText>
        {faqItems.map((item) => (
          <FAQItem key={item.id} item={item} />
        ))}
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
