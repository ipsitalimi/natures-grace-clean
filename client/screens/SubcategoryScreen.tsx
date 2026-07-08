import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/theme";
import { LayoutSpacing } from "@/constants/layout";
import { PageLayout } from "@/components/layout";
import { useDataContext } from "@/context/DataContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { getCategoryById } from "@/data/practitioners";
import { countPractitionersInSubcategory } from "@/lib/practitionerSpecialties";

type ParamList = {
  Subcategory: { categoryId: string };
  CategoryDetail: { categoryId: string; subcategoryName: string };
};

type SubcategoryRouteProp = RouteProp<ParamList, "Subcategory">;
type NavigationProp = NativeStackNavigationProp<ParamList>;

export default function SubcategoryScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SubcategoryRouteProp>();
  const { categoryId } = route.params;

  const { practitionerCategories } = useDataContext();
  const { filterApprovedPractitioners } = usePlatformConfig();
  const category =
    practitionerCategories.find((c) => c.id === categoryId) ?? getCategoryById(categoryId);
  const approvedPractitioners = category
    ? filterApprovedPractitioners(category.practitioners)
    : [];

  if (!category) {
    return (
      <PageLayout title="Wellness" titleInHeader header="title" footerInset={tabBarHeight}>
        <ThemedText style={styles.errorText}>Category not found</ThemedText>
      </PageLayout>
    );
  }

  const subcategories = category.subcategories || [];

  return (
    <PageLayout
      title={category.name}
      subtitle={category.subtitle}
      titleInHeader
      header="title"
      footerInset={tabBarHeight}
      contentContainerStyle={styles.content}
    >
      <ThemedText style={styles.description}>{category.description}</ThemedText>

      <ThemedText style={styles.sectionHeading}>Choose a Service</ThemedText>

      {subcategories.map((sub) => {
        const practitionerCount = countPractitionersInSubcategory(
          approvedPractitioners,
          category.name,
          sub.name
        );

        return (
          <Pressable
            key={sub.id}
            style={styles.subcategoryCard}
            onPress={() =>
              navigation.navigate("CategoryDetail", {
                categoryId: category.id,
                subcategoryName: sub.name,
              })
            }
            testID={`subcategory-${sub.id}`}
          >
            <View style={styles.subcategoryInfo}>
              <ThemedText style={styles.subcategoryName}>{sub.name}</ThemedText>
              <ThemedText style={styles.subcategoryCount}>
                {practitionerCount > 0
                  ? `${practitionerCount} practitioner${practitionerCount > 1 ? "s" : ""}`
                  : "Coming soon"}
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.light.textMuted} />
          </Pressable>
        );
      })}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: LayoutSpacing.xs,
  },
  description: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 21,
    marginBottom: LayoutSpacing.lg,
    textAlign: "center",
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    textAlign: "center",
    marginBottom: LayoutSpacing.md,
  },
  subcategoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  subcategoryInfo: {
    flex: 1,
  },
  subcategoryName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 3,
    fontFamily: "Nunito_700Bold",
  },
  subcategoryCount: {
    fontSize: 12,
    color: Colors.light.textMuted,
    fontFamily: "Nunito_400Regular",
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: 40,
  },
});
