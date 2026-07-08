import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing } from "@/constants/theme";
import { LayoutSpacing } from "@/constants/layout";
import { PageLayout } from "@/components/layout";
import PractitionerCard from "@/components/PractitionerCard";
import { useDataContext } from "@/context/DataContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { getCategoryById } from "@/data/practitioners";
import { practitionerMatchesSubcategory } from "@/lib/practitionerSpecialties";

type RootStackParamList = {
  CategoryDetail: { categoryId: string; subcategoryName?: string };
  PractitionerProfile: { practitionerId: string };
};

type CategoryDetailRouteProp = RouteProp<RootStackParamList, "CategoryDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CategoryDetailScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CategoryDetailRouteProp>();
  const { categoryId, subcategoryName } = route.params;

  const { practitionerCategories, practitionersLoading } = useDataContext();
  const { filterApprovedPractitioners } = usePlatformConfig();
  const category =
    practitionerCategories.find((c) => c.id === categoryId) ?? getCategoryById(categoryId);
  const approvedPractitioners = category
    ? filterApprovedPractitioners(category.practitioners)
    : [];

  const pageTitle = subcategoryName ?? category?.name ?? "Wellness";
  const pageSubtitle = subcategoryName ? category?.name : category?.subtitle;

  if (!category) {
    return (
      <PageLayout title="Wellness" titleInHeader header="title" footerInset={tabBarHeight}>
        <ThemedText style={styles.errorText}>Category not found</ThemedText>
      </PageLayout>
    );
  }

  const filtered = subcategoryName
    ? approvedPractitioners.filter((p) =>
        practitionerMatchesSubcategory(p, category.name, subcategoryName)
      )
    : approvedPractitioners;

  return (
    <PageLayout
      title={pageTitle}
      subtitle={pageSubtitle}
      titleInHeader
      header="title"
      footerInset={tabBarHeight}
      contentContainerStyle={styles.content}
    >
      <ThemedText style={styles.description}>
        {subcategoryName
          ? `Practitioners offering ${subcategoryName} within ${category.name}.`
          : category.description}
      </ThemedText>

      <ThemedText style={styles.sectionHeading}>Our Practitioners</ThemedText>

      {practitionersLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.accent} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptySection}>
          <ThemedText style={styles.emptyText}>
            {subcategoryName
              ? `Practitioners for ${subcategoryName} will appear here soon.`
              : "Practitioners for this category will appear here soon."}
          </ThemedText>
        </View>
      ) : (
        filtered.map((practitioner) => (
          <PractitionerCard
            key={practitioner.id}
            practitioner={practitioner}
            onPress={() =>
              navigation.navigate("PractitionerProfile", { practitionerId: practitioner.id })
            }
          />
        ))
      )}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: LayoutSpacing.xs,
  },
  description: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: 40,
  },
  emptySection: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    color: Colors.light.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
});
