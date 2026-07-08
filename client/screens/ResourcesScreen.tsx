import React from "react";
import { View, StyleSheet, Pressable, Linking, ActivityIndicator } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, BorderRadius } from "@/constants/theme";
import { LayoutSpacing } from "@/constants/layout";
import { PageLayout } from "@/components/layout";
import { useDrawer } from "@/context/DrawerContext";
import { useIsSellerTabContext } from "@/hooks/useIsSellerTabContext";
import { useIsPractitionerTabContext } from "@/hooks/useIsPractitionerTabContext";
import { ResourceItem } from "@/data/mockResources";
import { useDataContext } from "@/context/DataContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { useResourceEnrollments } from "@/context/ResourceEnrollmentsContext";

type RootStackParamList = {
  ResourceDetail: { resourceId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { openDrawerForRole } = useDrawer();
  const isSellerTab = useIsSellerTabContext();
  const isPractitionerTab = useIsPractitionerTabContext();
  const isRoleTab = isSellerTab || isPractitionerTab;
  const titleInHeader = !isRoleTab || isSellerTab;
  const { resources, dataLoading, dataError, refreshContent } = useDataContext();
  const { settings } = usePlatformConfig();
  const { isEnrolledForResource, enrollmentsLoading, enrollmentsError } = useResourceEnrollments();
  const publishedResources = resources.filter((r) => r.published !== false);

  const courses = publishedResources.filter((r) => r.section === "Courses");
  const videos = publishedResources.filter((r) => r.section === "Video Resources");
  const youtubeChannelUrl = settings.youtubeChannelUrl?.trim() ?? "";

  const openResource = (resourceId: string) => {
    navigation.navigate("ResourceDetail", { resourceId });
  };

  const openYouTubeChannel = () => {
    if (youtubeChannelUrl) {
      void Linking.openURL(youtubeChannelUrl);
    }
  };

  return (
    <PageLayout
      title="Courses & Resources"
      titleInHeader={titleInHeader}
      header={isRoleTab ? "compact" : "back"}
      headerProps={
        isRoleTab
          ? {
              onProfilePress: () =>
                openDrawerForRole({ isSeller: isSellerTab, isPractitioner: isPractitionerTab }),
            }
          : undefined
      }
      footerInset={isSellerTab ? tabBarHeight : 0}
      scrollable={!dataLoading}
    >
      {dataLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.light.accent} />
          <ThemedText style={styles.sectionTitle}>Loading resources…</ThemedText>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : dataError ? (
        <View style={styles.emptyState}>
          <Feather name="alert-circle" size={28} color={Colors.light.textMuted} />
          <ThemedText style={styles.emptyStateText}>{dataError}</ThemedText>
          <Pressable style={styles.retryButton} onPress={() => void refreshContent()}>
            <ThemedText style={styles.retryButtonText}>Try again</ThemedText>
          </Pressable>
        </View>
      ) : (
        <>
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
            {courses.length === 0 ? (
              <ThemedText style={styles.emptySectionText}>No courses published yet.</ThemedText>
            ) : null}
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
            {videos.length === 0 ? (
              <ThemedText style={styles.emptySectionText}>No video resources yet.</ThemedText>
            ) : null}
          </View>

          {youtubeChannelUrl ? (
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
          ) : null}
        </>
      )}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingTop: LayoutSpacing.sm,
  },
  section: {
    marginBottom: LayoutSpacing.lg,
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
    marginBottom: LayoutSpacing.md,
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
    marginBottom: LayoutSpacing.sm,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: LayoutSpacing.lg,
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
    marginTop: LayoutSpacing.sm,
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
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: LayoutSpacing.xl * 2,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
    paddingHorizontal: LayoutSpacing.lg,
  },
  emptySectionText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginTop: LayoutSpacing.sm,
  },
  retryButton: {
    paddingHorizontal: LayoutSpacing.lg,
    paddingVertical: LayoutSpacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.accent,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
});
