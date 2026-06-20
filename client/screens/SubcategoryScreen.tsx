import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing } from "@/constants/theme";
import ProfileDrawer from "@/components/ProfileDrawer";
import { useDataContext } from "@/context/DataContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { getHeaderPaddingTop, getScrollBottomPadding, getAuthScreenPaddingTop } from "@/lib/layoutInsets";

type ParamList = {
  Subcategory: { categoryId: string };
  CategoryDetail: { categoryId: string; subcategoryName: string };
};

type SubcategoryRouteProp = RouteProp<ParamList, "Subcategory">;
type NavigationProp = NativeStackNavigationProp<ParamList>;

export default function SubcategoryScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SubcategoryRouteProp>();
  const { categoryId } = route.params;
  const [drawerVisible, setDrawerVisible] = useState(false);

  const { practitionerCategories } = useDataContext();
  const { filterApprovedPractitioners } = usePlatformConfig();
  const category = practitionerCategories.find((c) => c.id === categoryId);
  const approvedPractitioners = category
    ? filterApprovedPractitioners(category.practitioners)
    : [];

  if (!category) {
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
        <ThemedText style={styles.errorText}>Category not found</ThemedText>
      </View>
    );
  }

  const subcategories = category.subcategories || [];

  return (
    <View style={styles.container}>
      <ProfileDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.title}>{category.name}</ThemedText>
        <ThemedText style={styles.subtitle}>{category.subtitle}</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.description}>{category.description}</ThemedText>

        <ThemedText style={styles.sectionTitle}>Choose a Service</ThemedText>

        {subcategories.map((sub) => {
          const practitionerCount = approvedPractitioners.filter(
            (p) => p.subcategory === sub.name
          ).length;

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
              <View style={styles.subcategoryIconContainer}>
                <Feather name={sub.icon as any} size={22} color={Colors.light.accent} />
              </View>
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
    paddingHorizontal: Spacing.lg,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    marginTop: 4,
    fontFamily: "Nunito_400Regular",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
  },
  description: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 21,
    marginBottom: 20,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 14,
  },
  subcategoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  subcategoryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundRoot,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
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
