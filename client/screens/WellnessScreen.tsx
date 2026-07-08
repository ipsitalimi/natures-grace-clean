import React, { useMemo } from "react";
import { View, StyleSheet, Pressable, Image, ActivityIndicator, ImageSourcePropType } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, BorderRadius } from "@/constants/theme";
import { CardTokens, LayoutSpacing } from "@/constants/layout";
import { PageLayout } from "@/components/layout";
import { useDataContext } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";

import healingsIcon from "../../assets/images/icons/healings-icon.png";
import therapiesIcon from "../../assets/images/icons/therapies-icon.png";
import spiritualIcon from "../../assets/images/icons/spiritual-icon.png";
import counselingIcon from "../../assets/images/icons/counseling-icon.png";
import financialIcon from "../../assets/images/icons/financial-icon.png";
import nutritionIcon from "../../assets/images/icons/nutrition-icon.png";
import animalHealingIcon from "../../assets/images/icons/animal-healing-icon.png";

const ICON_MAP: Record<string, ImageSourcePropType> = {
  healings: healingsIcon,
  therapies: therapiesIcon,
  "spiritual-guidance": spiritualIcon,
  spiritual_guidance: spiritualIcon,
  counseling: counselingIcon,
  "financial-guidance": financialIcon,
  financial_guidance: financialIcon,
  "nutrition-diet": nutritionIcon,
  diet_nutrition: nutritionIcon,
  "animal-healing": animalHealingIcon,
};

/** Display order matching the Wellness screen design (2-column grid). */
const WELLNESS_DISPLAY_ORDER: string[] = [
  "healings",
  "counseling",
  "therapies",
  "spiritual-guidance",
  "financial-guidance",
  "nutrition-diet",
  "animal-healing",
];

function getCategoryOrder(id: string): number {
  const normalized = id.replace(/_/g, "-");
  const idx = WELLNESS_DISPLAY_ORDER.indexOf(normalized);
  return idx === -1 ? 99 : idx;
}

const BUTTON_TEXT_MAP: Record<string, string> = {
  healings: "Explore",
  counseling: "Find Help",
  therapies: "View All",
  "spiritual-guidance": "Seek Now",
  spiritual_guidance: "Seek Now",
  "financial-guidance": "Get Advice",
  financial_guidance: "Get Advice",
  "nutrition-diet": "Learn More",
  diet_nutrition: "Learn More",
  "animal-healing": "Explore",
};

/** Short card copy from the Wellness screen design. */
const CARD_DESCRIPTION_MAP: Record<string, string> = {
  healings: "Reiki, chakra healing, and energy balancing.",
  counseling: "Emotional support and guided conversations.",
  therapies: "Naturopathy and holistic wellness treatments",
  "spiritual-guidance": "Tarot readings and intuitive insight sessions.",
  spiritual_guidance: "Tarot readings and intuitive insight sessions.",
  "financial-guidance": "Mindful money management",
  financial_guidance: "Mindful money management",
  "nutrition-diet": "Balanced wholesome meals",
  diet_nutrition: "Balanced wholesome meals",
  "animal-healing": "healings for animals",
};

interface WellnessCategory {
  id: string;
  name: string;
  description: string;
}

type WellnessStackParamList = {
  Subcategory: { categoryId: string };
  CategoryDetail: { categoryId: string; subcategoryName: string };
  Placeholder: { title: string };
};

type MainTabParamList = {
  HomeTab: undefined;
  WellnessTab: undefined;
};

type WellnessNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<WellnessStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

interface CategoryCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  onPress: () => void;
}

function CategoryCard({ icon, title, description, buttonText, onPress }: CategoryCardProps) {
  return (
    <View style={styles.categoryCard}>
      <View style={styles.categoryCardBody}>
        <View style={styles.categoryIconContainer}>{icon}</View>
        <ThemedText style={styles.categoryTitle} numberOfLines={2}>
          {title}
        </ThemedText>
        <View style={styles.categoryDescriptionWrap}>
          <ThemedText style={styles.categoryDescription} numberOfLines={3}>
            {description}
          </ThemedText>
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [styles.categoryButton, pressed && styles.categoryButtonPressed]}
        onPress={onPress}
      >
        <ThemedText style={styles.categoryButtonText}>{buttonText}</ThemedText>
        <Feather name="chevron-right" size={14} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

export default function WellnessScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<WellnessNavigationProp>();
  const { practitionerCategories, practitionersLoading, dataError, refreshContent } = useDataContext();
  const { profile } = useAuth();
  const showPractitionerApplication =
    profile?.role !== "Practitioner" && profile?.role !== "Seller";

  useFocusEffect(
    React.useCallback(() => {
      void refreshContent({ silent: true });
    }, [refreshContent])
  );

  const categories = useMemo<WellnessCategory[]>(() => {
    return [...practitionerCategories]
      .map((c) => ({
        id: c.id,
        name: c.name,
        description:
          CARD_DESCRIPTION_MAP[c.id] ??
          CARD_DESCRIPTION_MAP[c.id.replace(/_/g, "-")] ??
          c.subtitle,
      }))
      .sort((a, b) => getCategoryOrder(a.id) - getCategoryOrder(b.id));
  }, [practitionerCategories]);

  const navigateToCategory = (categoryId: string) => {
    navigation.navigate("Subcategory", { categoryId });
  };

  const goBackToHome = () => {
    navigation.navigate("HomeTab");
  };

  const renderCategoryGrid = () =>
    categories.map((cat) => (
      <CategoryCard
        key={cat.id}
        icon={
          <Image
            source={ICON_MAP[cat.id] || ICON_MAP[cat.id.replace(/_/g, "-")] || healingsIcon}
            style={styles.categoryIconImage}
            resizeMode="cover"
          />
        }
        title={cat.name}
        buttonText={BUTTON_TEXT_MAP[cat.id] ?? BUTTON_TEXT_MAP[cat.id.replace(/_/g, "-")] ?? "Explore"}
        description={cat.description}
        onPress={() => navigateToCategory(cat.id)}
      />
    ));

  return (
    <PageLayout
      title="Wellness"
      titleInHeader
      subtitle="What kind of support feels right for you today?"
      header="title"
      headerProps={{ onBackPress: goBackToHome }}
      scrollable
      footerInset={tabBarHeight}
      contentContainerStyle={styles.mainContent}
    >
        {practitionersLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.accent} />
          </View>
        ) : dataError ? (
          <View style={styles.loadingContainer}>
            <Feather name="alert-circle" size={36} color={Colors.light.textSecondary} />
            <ThemedText style={styles.errorText}>{dataError}</ThemedText>
            <Pressable style={styles.retryBtn} onPress={() => void refreshContent()}>
              <ThemedText style={styles.retryText}>Try again</ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            <ThemedText style={styles.sectionHeading}>Explore Our Services</ThemedText>
            <View style={styles.categoriesGrid}>{renderCategoryGrid()}</View>
          </>
        )}

        {showPractitionerApplication ? (
          <Pressable
            style={styles.becomePractitionerButton}
            onPress={() => navigation.navigate("PractitionerApplication" as never)}
            testID="button-become-practitioner"
          >
            <Feather name="briefcase" size={15} color={Colors.light.accent} />
            <ThemedText style={styles.becomePractitionerText}>Become a Practitioner</ThemedText>
          </Pressable>
        ) : null}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  mainContent: {
    flexGrow: 1,
    paddingTop: LayoutSpacing.xs,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    textAlign: "center",
    marginBottom: LayoutSpacing.md,
  },
  loadingContainer: {
    flex: 1,
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
    gap: LayoutSpacing.sm,
  },
  errorText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: LayoutSpacing.xs,
    paddingHorizontal: LayoutSpacing.md,
    paddingVertical: LayoutSpacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.accent,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: LayoutSpacing.sm,
    rowGap: LayoutSpacing.sm,
    marginBottom: LayoutSpacing.md,
  },
  categoryCard: {
    width: "47.5%",
    height: 224,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: CardTokens.radius,
    padding: LayoutSpacing.md,
    paddingBottom: LayoutSpacing.sm,
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryCardBody: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  categoryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: LayoutSpacing.xs,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  categoryIconImage: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.3 }],
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "ui-serif",
    color: Colors.light.accent,
    marginBottom: LayoutSpacing.xs,
    textAlign: "center",
    lineHeight: 19,
    minHeight: 38,
  },
  categoryDescriptionWrap: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-start",
    minHeight: 45,
  },
  categoryDescription: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "ui-serif",
    color: Colors.light.accent,
    textAlign: "center",
    opacity: 0.85,
    minHeight: 45,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: LayoutSpacing.sm,
    width: "100%",
    gap: LayoutSpacing.xs,
    marginTop: LayoutSpacing.xs,
  },
  categoryButtonPressed: {
    opacity: 0.9,
  },
  categoryButtonText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
  },
  becomePractitionerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    borderWidth: 1,
    borderColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: 9,
    paddingHorizontal: LayoutSpacing.xl,
    gap: LayoutSpacing.sm,
    marginTop: 4,
  },
  becomePractitionerText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
});
