import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { BackHeader } from "@/components/layout";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useDataContext } from "@/context/DataContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useReviews } from "@/context/ReviewsContext";
import { fetchOfferingsForPractitioner } from "@/services/content/practitionerOfferingsService";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import VerifiedBadge, { isVerifiedPractitioner } from "@/components/VerifiedBadge";
import TrustIndicators from "@/components/TrustIndicators";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";

type RootStackParamList = {
  PractitionerProfile: { practitionerId: string };
  Placeholder: { title: string };
  BookSession: { practitionerId: string };
};

type PractitionerProfileRouteProp = RouteProp<RootStackParamList, "PractitionerProfile">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function StarFilled({ size = 14, color = "#E5A93B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2L14.5 9H22L16 14L18 21L12 17L6 21L8 14L2 9H9.5L12 2Z" />
    </Svg>
  );
}

function getCategoryLabel(category: string): string {
  switch (category) {
    case "Healings":
      return "Healing Practitioner";
    case "Counseling":
      return "Counselor";
    case "Therapies":
      return "Therapist";
    case "Spiritual Guidance":
      return "Spiritual Guide";
    case "Financial Guidance":
      return "Financial Advisor";
    default:
      return "Practitioner";
  }
}

export default function PractitionerProfileScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { scrollPaddingBottom } = useLayoutInsets(tabBarHeight);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PractitionerProfileRouteProp>();
  const { practitionerId } = route.params;
  const [bioExpanded, setBioExpanded] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  const { session } = useAuth();
  const { practitionerCategories } = useDataContext();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { getPractitionerStats } = useReviews();
  const [liveRating, setLiveRating] = useState<number | null>(null);
  const [liveReviewCount, setLiveReviewCount] = useState<number | null>(null);
  const [hasOfferings, setHasOfferings] = useState<boolean | null>(null);
  const practitioner = practitionerCategories.flatMap((c) => c.practitioners).find((p) => p.id === practitionerId);

  if (!practitioner) {
    return (
      <View style={styles.container}>
        <BackHeader />
        <ThemedText style={styles.errorText}>Practitioner not found</ThemedText>
      </View>
    );
  }

  const bioIsLong = practitioner.bio.length > 150;
  const displayBio = bioIsLong && !bioExpanded 
    ? practitioner.bio.substring(0, 150).trim() + "..." 
    : practitioner.bio;

  const favorited = isFavorite("practitioner", practitionerId);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    getPractitionerStats(practitionerId).then((stats) => {
      setLiveRating(stats.reviewCount > 0 ? stats.avgRating : null);
      setLiveReviewCount(stats.reviewCount);
    });
  }, [practitionerId, getPractitionerStats]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setHasOfferings(null);
      return;
    }
    let cancelled = false;
    fetchOfferingsForPractitioner(practitionerId).then((rows) => {
      if (!cancelled) setHasOfferings(rows.length > 0);
    });
    return () => {
      cancelled = true;
    };
  }, [practitionerId]);

  const displayRating =
    liveReviewCount != null && liveReviewCount > 0
      ? (liveRating ?? practitioner.rating)
      : practitioner.rating;
  const displayReviewCount =
    liveReviewCount != null ? liveReviewCount : practitioner.reviewCount;

  const handleToggleFavorite = async () => {
    if (!isSupabaseConfigured()) {
      setFavoriteError("Sign in with Supabase configured to save favorites.");
      return;
    }
    if (!session?.user) {
      setFavoriteError("Sign in to save favorites.");
      return;
    }
    setFavoriteBusy(true);
    setFavoriteError(null);
    const ok = await toggleFavorite({
      itemType: "practitioner",
      itemId: practitionerId,
      itemDbId: practitionerId,
      displayName: practitioner.name,
      displaySubtitle: practitioner.subcategory || practitioner.category,
    });
    if (!ok) {
      setFavoriteError("Could not update favorite.");
    }
    setFavoriteBusy(false);
  };

  return (
    <View style={styles.container}>
      <BackHeader
        showNotifications={false}
        rightAction={
          <View style={styles.headerActions}>
            <Pressable
              style={styles.headerIconButton}
              onPress={handleToggleFavorite}
              disabled={favoriteBusy}
              testID="button-toggle-favorite"
            >
              {favoriteBusy ? (
                <ActivityIndicator size="small" color={Colors.light.accent} />
              ) : (
                <Feather
                  name="heart"
                  size={22}
                  color={favorited ? "#D4534A" : Colors.light.accent}
                />
              )}
            </Pressable>
            <Pressable
              style={styles.headerIconButton}
              onPress={() => navigation.navigate("Notifications" as never)}
              testID="button-notifications"
            >
              <Feather name="bell" size={22} color={Colors.light.accent} />
            </Pressable>
          </View>
        }
      />

      {favoriteError ? (
        <ThemedText style={styles.favoriteError}>{favoriteError}</ThemedText>
      ) : null}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identityBlock}>
          <Image
            source={practitioner.localPhoto || { uri: practitioner.photo }}
            style={styles.photo}
            resizeMode="cover"
          />
          <ThemedText style={styles.name}>{practitioner.name}</ThemedText>
          {isVerifiedPractitioner(practitioner) ? (
            <View style={styles.badgeWrap}>
              <VerifiedBadge kind="practitioner" />
            </View>
          ) : null}
          <ThemedText style={styles.categoryLabel}>
            {getCategoryLabel(practitioner.category)}
          </ThemedText>
          <View style={styles.ratingRow}>
            <StarFilled size={14} />
            <ThemedText style={styles.ratingText}>
              {displayRating.toFixed(1)}
            </ThemedText>
            <ThemedText style={styles.reviewCount}>
              {displayReviewCount} reviews
            </ThemedText>
          </View>
        </View>

        {isVerifiedPractitioner(practitioner) ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>Trust & Verification</ThemedText>
            <TrustIndicators kind="practitioner" />
          </View>
        ) : null}

        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>About</ThemedText>
          <ThemedText style={styles.bioText}>{displayBio}</ThemedText>
          {bioIsLong && !bioExpanded ? (
            <Pressable onPress={() => setBioExpanded(true)}>
              <ThemedText style={styles.readMore}>Read more</ThemedText>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>Experience & Credentials</ThemedText>
          <View style={styles.credentialRow}>
            <View style={styles.bullet} />
            <ThemedText style={styles.credentialText}>{practitioner.experience}</ThemedText>
          </View>
          {practitioner.certifications.map((cert, index) => (
            <View key={index} style={styles.credentialRow}>
              <View style={styles.bullet} />
              <ThemedText style={styles.credentialText}>{cert}</ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.sessionCard}>
          <ThemedText style={styles.sessionCardTitle}>Session Details</ThemedText>
          
          <View style={styles.sessionRow}>
            <ThemedText style={styles.sessionLabel}>Type</ThemedText>
            <ThemedText style={styles.sessionValue}>One-on-One Session</ThemedText>
          </View>
          
          <View style={styles.sessionRow}>
            <ThemedText style={styles.sessionLabel}>Duration</ThemedText>
            <ThemedText style={styles.sessionValue}>60 minutes</ThemedText>
          </View>
          
          <View style={styles.sessionRow}>
            <ThemedText style={styles.sessionLabel}>Price</ThemedText>
            <ThemedText style={styles.sessionPrice}>₹{practitioner.pricePerSession}</ThemedText>
          </View>

          <Pressable
            style={[styles.bookButton, hasOfferings === false && styles.bookButtonMuted]}
            onPress={() => navigation.navigate("BookSession", { practitionerId })}
          >
            <ThemedText style={styles.bookButtonText}>
              {hasOfferings === false ? "Unavailable at the moment" : "Book Session"}
            </ThemedText>
          </Pressable>
          {hasOfferings === false ? (
            <ThemedText style={styles.unavailableHint}>
              This practitioner has not published session offerings yet.
            </ThemedText>
          ) : null}
        </View>

        <ThemedText style={styles.availabilityHint}>
          Availability varies by practitioner
        </ThemedText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconButton: {
    padding: 8,
  },
  favoriteError: {
    fontSize: 13,
    color: "#8B3A3A",
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  identityBlock: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  photo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.light.backgroundSecondary,
    marginBottom: Spacing.md,
  },
  name: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
    textAlign: "center",
  },
  badgeWrap: {
    marginBottom: Spacing.sm,
  },
  categoryLabel: {
    fontSize: 14,
    color: Colors.light.textMuted,
    marginBottom: Spacing.sm,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.light.text,
  },
  reviewCount: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  bioText: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
  },
  readMore: {
    fontSize: 14,
    color: Colors.light.accent,
    fontWeight: "500",
    marginTop: 6,
  },
  credentialRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.light.textSecondary,
    marginRight: Spacing.sm,
    marginTop: 7,
  },
  credentialText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  sessionCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sessionCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  sessionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  sessionLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  sessionValue: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: "500",
  },
  sessionPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.accent,
  },
  bookButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.xs,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  bookButtonMuted: {
    opacity: 0.65,
  },
  bookButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  unavailableHint: {
    fontSize: 12,
    color: Colors.light.textMuted,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  availabilityHint: {
    fontSize: 13,
    color: Colors.light.textMuted,
    textAlign: "center",
    fontStyle: "italic",
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: 100,
  },
});
