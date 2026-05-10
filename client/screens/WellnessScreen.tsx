import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Image, ActivityIndicator, ImageSourcePropType } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import ProfileDrawer from "@/components/ProfileDrawer";
import { useDataContext } from "@/context/DataContext";

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
  spiritual_guidance: spiritualIcon,
  counseling: counselingIcon,
  financial_guidance: financialIcon,
  "nutrition-diet": nutritionIcon,
  diet_nutrition: nutritionIcon,
  "animal-healing": animalHealingIcon,
};

const CATEGORY_ORDER: string[] = [
  "healings",
  "spiritual_guidance",
  "spiritual-guidance",
  "counseling",
  "therapies",
  "animal-healing",
  "diet_nutrition",
  "nutrition-diet",
  "financial_guidance",
  "financial-guidance",
];

function getCategoryOrder(id: string): number {
  const idx = CATEGORY_ORDER.indexOf(id);
  return idx === -1 ? 99 : idx;
}

const BUTTON_TEXT_MAP: Record<string, string> = {
  healings: "Explore",
  spiritual_guidance: "Seek Now",
  counseling: "Find Help",
  therapies: "View All",
  financial_guidance: "Get Advice",
  "nutrition-diet": "Learn More",
  diet_nutrition: "Learn More",
  "animal-healing": "Explore",
};

interface FirestoreCategory {
  id: string;
  name: string;
  subtitle?: string;
  description?: string;
  order?: number;
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
  buttonText: string;
  onPress: () => void;
}

function CategoryCard({ icon, title, buttonText, onPress }: CategoryCardProps) {
  return (
    <View style={styles.categoryCard}>
      <View style={styles.categoryIconContainer}>
        {icon}
      </View>
      <ThemedText style={styles.categoryTitle} numberOfLines={2}>{title}</ThemedText>
      <Pressable style={styles.categoryButton} onPress={onPress}>
        <ThemedText style={styles.categoryButtonText}>{buttonText}</ThemedText>
        <Feather name="chevron-right" size={10} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

export default function WellnessScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<WellnessNavigationProp>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [firestoreCategories, setFirestoreCategories] = useState<FirestoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { practitionerCategories } = useDataContext();

  useEffect(() => {
    getDocs(collection(db, "categories"))
      .then((snapshot) => {
        const docs: FirestoreCategory[] = [];
        snapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() } as FirestoreCategory);
        });
        docs.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
        setFirestoreCategories(docs);
      })
      .catch((err) => {
        console.error("[Wellness] Failed to fetch categories:", err?.message || err);
      })
      .finally(() => setLoading(false));
  }, []);

  const categories: FirestoreCategory[] = React.useMemo(() => {
    const firestoreIds = new Set(firestoreCategories.map((c) => c.id));
    const localOnly = practitionerCategories
      .filter((c) => !firestoreIds.has(c.id))
      .map((c) => ({
        id: c.id,
        name: c.name,
        subtitle: c.subtitle,
        description: c.description,
        order: 99,
      }));
    const merged = [...firestoreCategories, ...localOnly];
    return merged.sort((a, b) => getCategoryOrder(a.id) - getCategoryOrder(b.id));
  }, [firestoreCategories, practitionerCategories]);

  const navigateToCategory = (categoryId: string) => {
    navigation.navigate("Subcategory", { categoryId });
  };

  const goBackToHome = () => {
    navigation.navigate("HomeTab");
  };

  const renderCategoryRows = () => {
    const rows: FirestoreCategory[][] = [];
    for (let i = 0; i < categories.length; i += 2) {
      rows.push(categories.slice(i, i + 2));
    }
    return rows.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.categoriesRow}>
        {row.map((cat) => (
          <CategoryCard
            key={cat.id}
            icon={
              <Image
                source={ICON_MAP[cat.id] || healingsIcon}
                style={styles.categoryIconImage}
                resizeMode="contain"
              />
            }
            title={cat.name}
            buttonText={BUTTON_TEXT_MAP[cat.id] || "Explore"}
            onPress={() => navigateToCategory(cat.id)}
          />
        ))}
        {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <ProfileDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerIconButton} onPress={goBackToHome} testID="button-back-home">
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>

      <View style={[styles.mainContent, { paddingBottom: tabBarHeight + 8 }]}>
        <View style={styles.titleSection}>
          <ThemedText style={styles.title}>Wellness</ThemedText>
          <ThemedText style={styles.subtitle}>What kind of support feels right for you today?</ThemedText>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.accent} />
          </View>
        ) : (
          <View style={styles.categoriesGrid}>
            {renderCategoryRows()}
          </View>
        )}

        <Pressable
          style={styles.becomePractitionerButton}
          onPress={() => navigation.navigate("PractitionerApplication" as never)}
          testID="button-become-practitioner"
        >
          <Feather name="briefcase" size={15} color={Colors.light.accent} />
          <ThemedText style={styles.becomePractitionerText}>Become a Practitioner</ThemedText>
        </Pressable>
      </View>
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
    paddingBottom: 4,
    backgroundColor: Colors.light.backgroundRoot,
  },
  headerIconButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.light.textMuted,
    textAlign: "center",
  },
  categoriesGrid: {
    flex: 1,
    marginBottom: 8,
  },
  categoriesRow: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
    overflow: "hidden",
  },
  categoryIconImage: {
    width: 54,
    height: 54,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 5,
    textAlign: "center",
    lineHeight: 17,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.button,
    borderRadius: 8,
    paddingVertical: 5,
    width: "100%",
    gap: 3,
  },
  categoryButtonText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "500",
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
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    marginTop: 4,
  },
  becomePractitionerText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
});
