import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import ProfileDrawer from "@/components/ProfileDrawer";
import { useDataContext } from "@/context/DataContext";

type ParamList = {
  ResourceDetail: { resourceId: string };
};

export default function ResourceDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ParamList, "ResourceDetail">>();
  const { resourceId } = route.params;
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const { resources } = useDataContext();

  const resource = resources.find((r) => r.id === resourceId);

  if (!resource) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()} testID="button-back">
            <Feather name="arrow-left" size={22} color={Colors.light.accent} />
          </Pressable>
          <View style={styles.headerCenter} />
          <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
            <Feather name="bell" size={22} color={Colors.light.accent} />
          </Pressable>
        </View>
        <View style={styles.titleSection}>
          <ThemedText style={styles.pageTitle}>Resource</ThemedText>
        </View>
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>Resource not found.</ThemedText>
        </View>
      </View>
    );
  }

  const isCourse = resource.section === "Courses";

  return (
    <View style={styles.container}>
      <ProfileDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>{resource.section}</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {isCourse ? (
          <>
            <View style={styles.courseHeader}>
              <View style={styles.courseIconLarge}>
                <Feather name={getCourseIcon(resource.id)} size={28} color={Colors.light.accent} />
              </View>
              <ThemedText style={styles.title}>{resource.title}</ThemedText>
              {resource.price ? (
                <View style={styles.priceBadge}>
                  <ThemedText style={styles.priceText}>{resource.price}</ThemedText>
                </View>
              ) : null}
              <ThemedText style={styles.description}>{resource.description}</ThemedText>
            </View>

            <View style={styles.bodyCard}>
              <ThemedText style={styles.bodyTitle}>Course Details</ThemedText>
              <ThemedText style={styles.bodyText}>{resource.body}</ThemedText>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Feather name="user" size={16} color={Colors.light.accent} />
                <ThemedText style={styles.infoText}>Instructor: Dr. Neelam Parwani</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={16} color={Colors.light.accent} />
                <ThemedText style={styles.infoText}>Locations: Jaipur & Gurgaon</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <Feather name="check-circle" size={16} color={Colors.light.accent} />
                <ThemedText style={styles.infoText}>Certificate provided upon completion</ThemedText>
              </View>
            </View>

            <Pressable
              style={[styles.enrollBtn, enrolled ? styles.enrolledBtn : null]}
              onPress={() => setEnrolled(!enrolled)}
              testID="button-enroll"
            >
              <Feather name={enrolled ? "check" : "book-open"} size={18} color="#FFFFFF" />
              <ThemedText style={styles.enrollBtnText}>
                {enrolled ? "Enrolled" : `Enroll Now - ${resource.price}`}
              </ThemedText>
            </Pressable>

            {enrolled ? (
              <View style={styles.enrolledMessage}>
                <Feather name="check-circle" size={16} color={Colors.light.accent} />
                <ThemedText style={styles.enrolledText}>
                  Thank you for your interest! We will contact you shortly with course details.
                </ThemedText>
              </View>
            ) : null}
          </>
        ) : (
          <>
            <View style={styles.headerSection}>
              <ThemedText style={styles.title}>{resource.title}</ThemedText>
              <ThemedText style={styles.sectionLabel}>{resource.section}</ThemedText>
            </View>
            <View style={styles.bodyCard}>
              <ThemedText style={styles.bodyText}>{resource.body}</ThemedText>
            </View>
            {resource.url ? (
              <Pressable
                style={styles.watchBtn}
                onPress={() => Linking.openURL(resource.url!)}
                testID="button-watch"
              >
                <Feather name="play" size={18} color="#FFFFFF" />
                <ThemedText style={styles.enrollBtnText}>Watch on YouTube</ThemedText>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function getCourseIcon(id: string): any {
  if (id.includes("reiki")) return "sun";
  if (id.includes("switchword")) return "zap";
  if (id.includes("tarot")) return "star";
  if (id.includes("sujok")) return "target";
  return "book";
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
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  pageTitle: {
    fontSize: 22,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  courseHeader: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: 24,
    alignItems: "center",
  },
  courseIconLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.backgroundRoot,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: "center",
    lineHeight: 28,
  },
  priceBadge: {
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  priceText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  description: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  headerSection: {
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
  },
  bodyCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: 20,
  },
  bodyTitle: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: 18,
    gap: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    flex: 1,
  },
  enrollBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.button,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  enrolledBtn: {
    backgroundColor: Colors.light.accent,
  },
  enrollBtnText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  enrolledMessage: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.accent,
  },
  enrolledText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    lineHeight: 20,
  },
  watchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.accent,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
});
