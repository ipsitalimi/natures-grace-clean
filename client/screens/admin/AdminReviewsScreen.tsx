import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

type ReviewStatus = "Approved" | "Pending" | "Flagged";

interface Review {
  id: string;
  userName: string;
  userInitial: string;
  practitionerName: string;
  rating: number;
  text: string;
  date: string;
  status: ReviewStatus;
}

const initialReviews: Review[] = [
  {
    id: "r1",
    userName: "Sarah M.",
    userInitial: "S",
    practitionerName: "Dr. Priya Sharma",
    rating: 5,
    text: "Amazing healing session. I felt so much better after just one visit. Highly recommend!",
    date: "Feb 18",
    status: "Approved",
  },
  {
    id: "r2",
    userName: "Raj K.",
    userInitial: "R",
    practitionerName: "Maya Devi",
    rating: 4,
    text: "Very calming counseling session. Maya really listens and provides thoughtful advice.",
    date: "Feb 17",
    status: "Approved",
  },
  {
    id: "r3",
    userName: "Anonymous",
    userInitial: "A",
    practitionerName: "Arjun Nair",
    rating: 2,
    text: "Did not meet expectations. The session felt rushed and I didn't feel heard.",
    date: "Feb 16",
    status: "Pending",
  },
  {
    id: "r4",
    userName: "Neha P.",
    userInitial: "N",
    practitionerName: "Dr. Priya Sharma",
    rating: 1,
    text: "Very rude behavior. Would not recommend this practitioner to anyone.",
    date: "Feb 15",
    status: "Flagged",
  },
  {
    id: "r5",
    userName: "Amit S.",
    userInitial: "A",
    practitionerName: "Ravi Kumar",
    rating: 5,
    text: "Life-changing therapy session! Ravi has a gift for making you feel at ease.",
    date: "Feb 14",
    status: "Approved",
  },
  {
    id: "r6",
    userName: "Priya L.",
    userInitial: "P",
    practitionerName: "Maya Devi",
    rating: 3,
    text: "Good but could improve. The session was helpful but felt a bit generic.",
    date: "Feb 13",
    status: "Pending",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Feather
          key={i}
          name="star"
          size={14}
          color={i <= rating ? "#C4A97A" : `${Colors.light.textSecondary}40`}
          style={i <= rating ? { opacity: 1 } : { opacity: 0.4 }}
        />
      ))}
    </View>
  );
}

function getStatusColor(status: ReviewStatus) {
  switch (status) {
    case "Approved":
      return "#013220";
    case "Pending":
      return "#C4A97A";
    case "Flagged":
      return "#C47A7A";
  }
}

export default function AdminReviewsScreen({ onBackToDashboard }: { onBackToDashboard: () => void }) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [activeFilter, setActiveFilter] = useState<"All" | ReviewStatus>("All");

  const filters: ("All" | ReviewStatus)[] = ["All", "Pending", "Flagged", "Approved"];

  const filteredReviews =
    activeFilter === "All" ? reviews : reviews.filter((r) => r.status === activeFilter);

  const pendingCount = reviews.filter((r) => r.status === "Pending").length;
  const approvedCount = reviews.filter((r) => r.status === "Approved").length;
  const flaggedCount = reviews.filter((r) => r.status === "Flagged").length;
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "0";

  const handleApprove = (id: string) => {
    setReviews(reviews.map((r) => (r.id === id ? { ...r, status: "Approved" as const } : r)));
  };

  const handleFlag = (id: string) => {
    setReviews(reviews.map((r) => (r.id === id ? { ...r, status: "Flagged" as const } : r)));
  };

  const handleRemove = (id: string) => {
    setReviews(reviews.filter((r) => r.id !== id));
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleRow}>
        <Pressable style={styles.backButton} onPress={onBackToDashboard} testID="button-back-dashboard">
          <Feather name="arrow-left" size={16} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.sectionTitle}>Reviews</ThemedText>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <ThemedText style={styles.statValue}>{pendingCount}</ThemedText>
          <ThemedText style={styles.statLabel}>Pending</ThemedText>
        </View>
        <View style={styles.statChip}>
          <ThemedText style={styles.statValue}>{approvedCount}</ThemedText>
          <ThemedText style={styles.statLabel}>Approved</ThemedText>
        </View>
        <View style={styles.statChip}>
          <ThemedText style={styles.statValue}>{flaggedCount}</ThemedText>
          <ThemedText style={styles.statLabel}>Flagged</ThemedText>
        </View>
        <View style={styles.statChip}>
          <View style={styles.ratingRow}>
            <ThemedText style={styles.statValue}>{avgRating}</ThemedText>
            <Feather name="star" size={14} color="#C4A97A" />
          </View>
          <ThemedText style={styles.statLabel}>Avg Rating</ThemedText>
        </View>
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <Pressable
            key={f}
            style={[styles.filterTab, activeFilter === f ? styles.filterTabActive : null]}
            onPress={() => setActiveFilter(f)}
            testID={`button-filter-${f.toLowerCase()}`}
          >
            <ThemedText
              style={[styles.filterTabText, activeFilter === f ? styles.filterTabTextActive : null]}
            >
              {f}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {filteredReviews.map((review) => (
        <View key={review.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={styles.avatar}>
              <ThemedText style={styles.avatarText}>{review.userInitial}</ThemedText>
            </View>
            <View style={styles.reviewHeaderInfo}>
              <ThemedText style={styles.userName}>{review.userName}</ThemedText>
              <ThemedText style={styles.practitionerName}>
                reviewed {review.practitionerName}
              </ThemedText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(review.status) }]}>
              <ThemedText style={styles.statusBadgeText}>{review.status}</ThemedText>
            </View>
          </View>

          <StarRating rating={review.rating} />
          <ThemedText style={styles.reviewText}>{review.text}</ThemedText>
          <ThemedText style={styles.reviewDate}>{review.date}</ThemedText>

          <View style={styles.actionRow}>
            {review.status !== "Approved" ? (
              <Pressable
                style={styles.approveBtn}
                onPress={() => handleApprove(review.id)}
                testID={`button-approve-${review.id}`}
              >
                <Feather name="check" size={14} color="#013220" />
                <ThemedText style={styles.approveBtnText}>Approve</ThemedText>
              </Pressable>
            ) : null}
            {review.status !== "Flagged" ? (
              <Pressable
                style={styles.flagBtn}
                onPress={() => handleFlag(review.id)}
                testID={`button-flag-${review.id}`}
              >
                <Feather name="flag" size={14} color="#C47A7A" />
                <ThemedText style={styles.flagBtnText}>Flag</ThemedText>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.removeBtn}
              onPress={() => handleRemove(review.id)}
              testID={`button-remove-${review.id}`}
            >
              <Feather name="trash-2" size={14} color="#8B3A3A" />
              <ThemedText style={styles.removeBtnText}>Remove</ThemedText>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  backButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: Spacing.lg,
  },
  statChip: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    fontFamily: "Nunito_400Regular",
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.cardBackground,
  },
  filterTabActive: {
    backgroundColor: Colors.light.accent,
  },
  filterTabText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  filterTabTextActive: {
    color: "#FFFFFF",
  },
  reviewCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${Colors.light.accent}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  reviewHeaderInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  practitionerName: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  starRow: {
    flexDirection: "row",
    gap: 2,
    marginBottom: 6,
  },
  reviewText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    lineHeight: 19,
    marginBottom: 6,
  },
  reviewDate: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: `${Colors.light.divider}40`,
    paddingTop: 10,
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#013220",
  },
  approveBtnText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#013220",
  },
  flagBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C47A7A",
  },
  flagBtnText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#C47A7A",
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#8B3A3A",
  },
  removeBtnText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#8B3A3A",
  },
});
