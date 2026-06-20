import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing } from "@/constants/theme";
import PractitionerCard from "@/components/PractitionerCard";
import ProfileDrawer from "@/components/ProfileDrawer";
import { useDataContext } from "@/context/DataContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { getHeaderPaddingTop, getScrollBottomPadding, getAuthScreenPaddingTop } from "@/lib/layoutInsets";

type RootStackParamList = {
  CategoryDetail: { categoryId: string; subcategoryName?: string };
  PractitionerProfile: { practitionerId: string };
};

type CategoryDetailRouteProp = RouteProp<RootStackParamList, "CategoryDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CategoryDetailScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CategoryDetailRouteProp>();
  const { categoryId, subcategoryName } = route.params;
  const [drawerVisible, setDrawerVisible] = useState(false);

  const { practitionerCategories, practitionersLoading } = useDataContext();
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

  return (
    <View style={styles.container}>
      <ProfileDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {subcategoryName ? (
          <ThemedText style={styles.subcategoryTitle}>{subcategoryName}</ThemedText>
        ) : null}
        <ThemedText style={styles.description}>{category.description}</ThemedText>

        <ThemedText style={styles.sectionTitle}>Our Practitioners</ThemedText>

        {practitionersLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.accent} />
          </View>
        ) : (
          (() => {
            const filtered = subcategoryName
              ? approvedPractitioners.filter((p) => p.subcategory === subcategoryName)
              : approvedPractitioners;
            const displayList = filtered.length > 0 ? filtered : approvedPractitioners;
            return displayList.map((practitioner) => (
              <PractitionerCard
                key={practitioner.id}
                practitioner={practitioner}
                onPress={() =>
                  navigation.navigate("PractitionerProfile", { practitionerId: practitioner.id })
                }
              />
            ));
          })()
        )}
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
  subcategoryTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: Colors.light.accent,
    textAlign: "center",
    marginBottom: 8,
    fontFamily: "Nunito_700Bold",
  },
  description: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
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
});
