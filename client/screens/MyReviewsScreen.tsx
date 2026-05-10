import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

const mockReviews = [
  {
    id: "1",
    practitionerName: "Dr. Neelam Parwani",
    serviceType: "Guided Meditation",
    rating: 5,
    text: "Transformative session. Dr. Parwani's guidance helped me find deep inner peace.",
    date: "Jan 15, 2026",
  },
  {
    id: "2",
    practitionerName: "Ananya Sharma",
    serviceType: "Reiki Healing",
    rating: 4,
    text: "Gentle and nurturing experience. Felt a noticeable shift in energy.",
    date: "Jan 8, 2026",
  },
  {
    id: "3",
    practitionerName: "Vikram Patel",
    serviceType: "Counseling",
    rating: 5,
    text: "Incredibly supportive and insightful. Helped me see things from a new perspective.",
    date: "Dec 20, 2025",
  },
  {
    id: "4",
    practitionerName: "Meera Joshi",
    serviceType: "Tarot Reading",
    rating: 4,
    text: "Accurate and compassionate reading. Gave me clarity on my path forward.",
    date: "Dec 12, 2025",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Feather
          key={i}
          name="star"
          size={14}
          color={i <= rating ? "#E5A93B" : Colors.light.backgroundTertiary}
          style={i <= rating ? { opacity: 1 } : { opacity: 0.5 }}
        />
      ))}
    </View>
  );
}

function ReviewCard({ review }: { review: (typeof mockReviews)[0] }) {
  return (
    <View style={styles.card} testID={`review-card-${review.id}`}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <ThemedText style={styles.practitionerName}>{review.practitionerName}</ThemedText>
          <ThemedText style={styles.serviceType}>{review.serviceType}</ThemedText>
        </View>
        <StarRating rating={review.rating} />
      </View>
      <ThemedText style={styles.reviewText}>{review.text}</ThemedText>
      <ThemedText style={styles.dateText}>{review.date}</ThemedText>
    </View>
  );
}

export default function MyReviewsScreen() {
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
        <ThemedText style={styles.pageTitle}>My Reviews</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {mockReviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
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
    gap: 10,
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  cardInfo: {
    flex: 1,
  },
  practitionerName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  serviceType: {
    fontSize: 14,
    color: Colors.light.accent,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  reviewText: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  dateText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
});
