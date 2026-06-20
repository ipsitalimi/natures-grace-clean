import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import AppHeader from "@/components/AppHeader";
import ProfileDrawer from "@/components/ProfileDrawer";
import SellerDrawer from "@/components/SellerDrawer";
import PractitionerDrawer from "@/components/PractitionerDrawer";
import { useIsSellerTabContext } from "@/hooks/useIsSellerTabContext";
import { useIsPractitionerTabContext } from "@/hooks/useIsPractitionerTabContext";
import { ResourceItem } from "@/data/mockResources";
import { useDataContext } from "@/context/DataContext";
import { useResourceEnrollments } from "@/context/ResourceEnrollmentsContext";
import { getHeaderPaddingTop, getScrollBottomPadding, getAuthScreenPaddingTop } from "@/lib/layoutInsets";

type RootStackParamList = {
  ResourceDetail: { resourceId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const YOUTUBE_CHANNEL = "https://youtube.com/@drneelamparwani?si=27GqPeIr6pvvMEoc";

function CourseCard({
  resource,
  isEnrolled,
  onPress,
}: {
  resource: ResourceItem;
  isEnrolled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.courseCard} onPress={onPress} testID={`resource-card-${resource.id}`}>
      <View style={styles.courseTop}>
        <View style={styles.courseIconWrap}>
          <Feather
            name={getCourseIcon(resource.id)}
            size={18}
            color={Colors.light.accent}
          />
        </View>
        <View style={styles.courseTitleWrap}>
          <ThemedText style={styles.courseTitle}>{resource.title}</ThemedText>
          {resource.price ? (
            <ThemedText style={styles.coursePrice}>{resource.price}</ThemedText>
          ) : null}
        </View>
      </View>
      <ThemedText style={styles.courseDesc} numberOfLines={2}>{resource.description}</ThemedText>
      <Pressable
        style={[styles.enrollButton, isEnrolled ? styles.enrolledButton : null]}
        onPress={onPress}
      >
        <ThemedText style={styles.enrollText}>
          {isEnrolled ? "Interest recorded" : resource.actionLabel || "Express interest"}
        </ThemedText>
        <Feather name="chevron-right" size={14} color="#FFFFFF" />
      </Pressable>
    </Pressable>
  );
}

function VideoCard({ resource }: { resource: ResourceItem }) {
  const openVideo = () => {
    if (resource.url) {
      Linking.openURL(resource.url);
    }
  };

  return (
    <Pressable style={styles.videoCard} onPress={openVideo} testID={`resource-card-${resource.id}`}>
      <View style={styles.videoLeft}>
        <View style={styles.videoPlayIcon}>
          <Feather name="play" size={14} color="#FFFFFF" />
        </View>
      </View>
      <View style={styles.videoContent}>
        <ThemedText style={styles.videoTitle} numberOfLines={1}>{resource.title}</ThemedText>
        <ThemedText style={styles.videoDesc} numberOfLines={2}>{resource.description}</ThemedText>
      </View>
      <Feather name="external-link" size={16} color={Colors.light.accent} />
    </Pressable>
  );
}

function getCourseIcon(id: string): any {
  if (id.includes("reiki")) return "sun";
  if (id.includes("switchword")) return "zap";
  if (id.includes("tarot")) return "star";
  if (id.includes("sujok")) return "target";
  return "book";
}

function SkeletonCard() {
  return (
    <View style={styles.courseCard}>
      <View style={styles.courseTop}>
        <View style={[styles.courseIconWrap, { opacity: 0.3 }]} />
        <View style={styles.courseTitleWrap}>
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: "40%", marginTop: 4 }]} />
        </View>
      </View>
      <View style={[styles.skeletonLine, { width: "90%", marginTop: 8 }]} />
    </View>
  );
}

export default function ResourcesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const isSellerTab = useIsSellerTabContext();
  const isPractitionerTab = useIsPractitionerTabContext();
  const isRoleTab = isSellerTab || isPractitionerTab;
  const [loading, setLoading] = useState(true);
  const { resources } = useDataContext();
  const { isEnrolledForResource, enrollmentsLoading, enrollmentsError } = useResourceEnrollments();
  const publishedResources = resources.filter((r) => r.published !== false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const courses = publishedResources.filter((r) => r.section === "Courses");
  const videos = publishedResources.filter((r) => r.section === "Video Resources");

  const openResource = (resourceId: string) => {
    navigation.navigate("ResourceDetail", { resourceId });
  };

  const openYouTubeChannel = () => {
    Linking.openURL(YOUTUBE_CHANNEL);
  };

  return (
    <View style={styles.container}>
      {isSellerTab ? (
        <SellerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      ) : isPractitionerTab ? (
        <PractitionerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      ) : (
        <ProfileDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      )}
      {isRoleTab ? (
        <AppHeader showLogo={false} onProfilePress={() => setDrawerVisible(true)} />
      ) : (
        <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
          <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color={Colors.light.accent} />
          </Pressable>
          <View style={styles.headerCenter} />
          <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
            <Feather name="bell" size={22} color={Colors.light.accent} />
          </Pressable>
        </View>
      )}

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>Courses & Resources</ThemedText>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.sectionTitle}>Courses</ThemedText>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: getScrollBottomPadding(insets.bottom, 32) }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="book-open" size={18} color={Colors.light.accent} />
              <ThemedText style={styles.sectionTitle}>Courses</ThemedText>
            </View>
            <ThemedText style={styles.sectionSubtitle}>
              Guided wellness courses — express interest to learn more
            </ThemedText>
            {enrollmentsError ? (
              <ThemedText style={styles.enrollmentsErrorText} testID="text-enrollments-error">
                Could not load your course enrollments. Open a course to try again.
              </ThemedText>
            ) : null}
            {courses.map((resource) => (
              <CourseCard
                key={resource.id}
                resource={resource}
                isEnrolled={isEnrolledForResource(resource.id)}
                onPress={() => openResource(resource.id)}
              />
            ))}
            {enrollmentsLoading && courses.length > 0 ? (
              <ThemedText style={styles.enrollmentsLoadingText}>Checking enrollments…</ThemedText>
            ) : null}
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Feather name="play-circle" size={18} color={Colors.light.brownLight} />
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="video" size={18} color={Colors.light.accent} />
              <ThemedText style={styles.sectionTitle}>Video Resources</ThemedText>
            </View>
            <ThemedText style={styles.sectionSubtitle}>
              Free healing videos from our YouTube channel
            </ThemedText>
            {videos.map((resource) => (
              <VideoCard key={resource.id} resource={resource} />
            ))}
          </View>

          <Pressable style={styles.channelCard} onPress={openYouTubeChannel} testID="button-youtube-channel">
            <View style={styles.channelLeft}>
              <View style={styles.channelIconWrap}>
                <Feather name="youtube" size={22} color="#FFFFFF" />
              </View>
              <View>
                <ThemedText style={styles.channelTitle}>Nature&apos;s Grace</ThemedText>
                <ThemedText style={styles.channelSubtitle}>Visit our YouTube channel</ThemedText>
              </View>
            </View>
            <Feather name="external-link" size={18} color="#FFFFFF" />
          </Pressable>
        </ScrollView>
      )}
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
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginBottom: Spacing.md,
  },
  courseCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: 16,
    marginBottom: 10,
  },
  courseTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  courseIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.backgroundRoot,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  courseTitleWrap: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  coursePrice: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginTop: 2,
  },
  courseDesc: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  enrollButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.button,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 4,
  },
  enrollText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  enrolledButton: {
    backgroundColor: Colors.light.accent,
  },
  enrollmentsLoadingText: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
  enrollmentsErrorText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#B33A3A",
    marginBottom: Spacing.sm,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.brownLight,
  },
  videoCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  videoLeft: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.light.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlayIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 2,
  },
  videoContent: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: 2,
  },
  videoDesc: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 16,
  },
  channelCard: {
    backgroundColor: Colors.light.accent,
    borderRadius: BorderRadius.md,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
  },
  channelLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  channelIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  channelTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  channelSubtitle: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  skeletonLine: {
    height: 14,
    width: "80%",
    borderRadius: 6,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
});
