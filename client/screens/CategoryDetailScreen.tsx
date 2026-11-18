import React, { useEffect, useMemo, useState } from "react";
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
import { fetchOfferingsForPractitioner } from "@/services/content/practitionerOfferingsService";
import type { SessionOffering } from "@/data/practitionerBookings";

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
  const [offeringsByPractitioner, setOfferingsByPractitioner] = useState<Record<string, SessionOffering[]>>({});
  const { filterApprovedPractitioners } = usePlatformConfig();
  const category =
    practitionerCategories.find((c) => c.id === categoryId) ?? getCategoryById(categoryId);
  const approvedPractitioners = category
    ? filterApprovedPractitioners(category.practitioners)
    : [];

  const pageTitle = subcategoryName ?? category?.name ?? "Wellness";
  const pageSubtitle = subcategoryName ? category?.name : category?.subtitle;

  const filtered = useMemo(() => !category ? [] : (subcategoryName
    ? approvedPractitioners.filter((p) => practitionerMatchesSubcategory(p, category.name, subcategoryName))
    : approvedPractitioners), [category, subcategoryName, practitionerCategories, filterApprovedPractitioners]);
  const practitionerIdsKey = filtered.map((p) => p.id).join(",");

  useEffect(() => {
    let cancelled = false;
    const ids = practitionerIdsKey ? practitionerIdsKey.split(",") : [];
    Promise.all(ids.map(async (id) => [id, await fetchOfferingsForPractitioner(id)] as const))
      .then((entries) => {
        if (!cancelled) setOfferingsByPractitioner(Object.fromEntries(entries));
      });
    return () => { cancelled = true; };
  }, [practitionerIdsKey]);

  if (!category) {
    return (
      <PageLayout title="Wellness" titleInHeader header="title" footerInset={tabBarHeight}>
        <ThemedText style={styles.errorText}>Category not found</ThemedText>
      </PageLayout>
    );
  }

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
            priceLabel={(() => {
              const offers = offeringsByPractitioner[practitioner.id] ?? [];
              if (!offers.length) return "View session options";
              const lowest = [...offers].sort((a, b) => a.price - b.price || a.duration - b.duration)[0];
              const durationLabel = lowest.duration === 60 ? "60 min" : `${lowest.duration} min`;
              return offers.length > 1 ? `From ₹${lowest.price.toLocaleString("en-IN")} · ${durationLabel}` : `₹${lowest.price.toLocaleString("en-IN")} · ${durationLabel}`;
            })()}
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
