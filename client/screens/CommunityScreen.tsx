import React from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle, Rect } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors, BorderRadius } from "@/constants/theme";
import { LayoutSpacing } from "@/constants/layout";
import { PageLayout } from "@/components/layout";
import { useDrawer } from "@/context/DrawerContext";
import { useIsSellerTabContext } from "@/hooks/useIsSellerTabContext";
import { useIsPractitionerTabContext } from "@/hooks/useIsPractitionerTabContext";
import { useDataContext } from "@/context/DataContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { useAuth } from "@/context/AuthContext";

type CommunityStackParamList = {
  EventDetail: { eventId: string };
  DiscussionThread: { discussionId: string };
  CreateDiscussion: undefined;
};

type MainTabParamList = {
  HomeTab: undefined;
  CommunityTab: undefined;
};

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<CommunityStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

function MeditationIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="6" r="3" fill={color} opacity={0.8} />
      <Path
        d="M12 10C12 10 8 13 8 16C8 18 10 20 12 20C14 20 16 18 16 16C16 13 12 10 12 10Z"
        fill={color}
        opacity={0.6}
      />
      <Path
        d="M6 18C4 17 3 15 4 13"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Path
        d="M18 18C20 17 21 15 20 13"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ChatIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="14" rx="3" fill={color} opacity={0.2} />
      <Path
        d="M3 7C3 5.34315 4.34315 4 6 4H18C19.6569 4 21 5.34315 21 7V15C21 16.6569 19.6569 18 18 18H8L4 21V18.5C3.38625 17.9344 3 17.0166 3 16V7Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="8" cy="11" r="1" fill={color} />
      <Circle cx="12" cy="11" r="1" fill={color} />
      <Circle cx="16" cy="11" r="1" fill={color} />
    </Svg>
  );
}

interface EventCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
}

function EventCard({ icon, title, description, onPress }: EventCardProps) {
  return (
    <Pressable style={styles.eventCard} onPress={onPress}>
      <View style={styles.eventIconContainer}>
        {icon}
      </View>
      <View style={styles.eventContent}>
        <ThemedText style={styles.eventTitle}>{title}</ThemedText>
        <ThemedText style={styles.eventDescription}>{description}</ThemedText>
      </View>
      <Feather name="chevron-right" size={20} color={Colors.light.textSecondary} />
    </Pressable>
  );
}

export default function CommunityScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { openDrawerForRole } = useDrawer();
  const isSellerTab = useIsSellerTabContext();
  const isPractitionerTab = useIsPractitionerTabContext();
  const isRoleTab = isSellerTab || isPractitionerTab;
  const { events, discussions, discussionsLoading, discussionsError, dataError, dataLoading, refreshContent } =
    useDataContext();
  const { settings } = usePlatformConfig();
  const { session } = useAuth();
  const activeEvents = events.filter(
    (e) => e.status === "Active" && e.isVisible !== false
  );

  const navigateToEvent = (eventId: string) => {
    navigation.navigate("EventDetail", { eventId });
  };

  const navigateToDiscussion = (discussionId: string) => {
    navigation.navigate("DiscussionThread", { discussionId });
  };

  const navigateToCreateDiscussion = () => {
    if (!session?.user) {
      return;
    }
    navigation.navigate("CreateDiscussion");
  };

  const goBackToHome = () => {
    navigation.navigate("HomeTab");
  };

  return (
    <PageLayout
      title="Community"
      titleInHeader
      header={isRoleTab ? "compact" : "title"}
      headerProps={
        isRoleTab
          ? {
              onProfilePress: () =>
                openDrawerForRole({ isSeller: isSellerTab, isPractitioner: isPractitionerTab }),
            }
          : { onBackPress: goBackToHome }
      }
      footerInset={tabBarHeight}
    >
        <View style={styles.heroBanner}>
          <View style={styles.heroOverlay}>
            <ThemedText style={styles.heroTitle}>
              Join Wellness Events{"\n"}and Discussions
            </ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              Connect with others and enrich{"\n"}your wellness journey
            </ThemedText>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Events ({activeEvents.length})</ThemedText>
        </View>

        {dataLoading ? (
          <View style={styles.emptySection}>
            <ActivityIndicator size="small" color={Colors.light.accent} />
            <ThemedText style={styles.emptyText}>Loading events…</ThemedText>
          </View>
        ) : dataError ? (
          <View style={styles.emptySection}>
            <ThemedText style={styles.emptyText}>{dataError}</ThemedText>
            <Pressable style={styles.retryButton} onPress={() => void refreshContent()}>
              <ThemedText style={styles.retryButtonText}>Try again</ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
        {activeEvents.map((event) => (
          <EventCard
            key={event.id}
            icon={<MeditationIcon size={28} color={Colors.light.accent} />}
            title={event.title}
            description={event.description.substring(0, 60) + (event.description.length > 60 ? "..." : "")}
            onPress={() => navigateToEvent(event.id)}
          />
        ))}

        {activeEvents.length === 0 ? (
          <View style={styles.emptySection}>
            <ThemedText style={styles.emptyText}>No events available right now.</ThemedText>
          </View>
        ) : null}
          </>
        )}

        <View style={[styles.sectionHeader, { marginTop: LayoutSpacing.lg }]}>
          <ThemedText style={styles.sectionTitle}>Discussions</ThemedText>
          {session?.user ? (
            <Pressable style={styles.startDiscussionButton} onPress={navigateToCreateDiscussion}>
              <Feather name="plus" size={14} color="#FFFFFF" />
              <ThemedText style={styles.startDiscussionText}>Start Discussion</ThemedText>
            </Pressable>
          ) : null}
        </View>

        {discussionsLoading ? (
          <View style={styles.emptySection}>
            <ActivityIndicator size="small" color={Colors.light.accent} />
            <ThemedText style={styles.emptyText}>Loading discussions…</ThemedText>
          </View>
        ) : discussionsError ? (
          <View style={styles.emptySection}>
            <ThemedText style={styles.emptyText}>{discussionsError}</ThemedText>
            <Pressable style={styles.retryButton} onPress={() => void refreshContent()}>
              <ThemedText style={styles.retryButtonText}>Try again</ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            {discussions.map((discussion) => (
              <Pressable
                key={discussion.id}
                style={styles.discussionCard}
                onPress={() => navigateToDiscussion(discussion.id)}
              >
                <View style={styles.discussionHeader}>
                  <ThemedText style={styles.discussionTitle}>{discussion.title}</ThemedText>
                  <View style={styles.todayBadge}>
                    <ThemedText style={styles.todayBadgeText}>{discussion.date}</ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.discussionDate}>{discussion.date}</ThemedText>
                <ThemedText style={styles.discussionQuestion}>
                  {discussion.question}
                </ThemedText>
                <View style={styles.discussionFooter}>
                  <ThemedText style={styles.repliesCount}>{discussion.replies.length} Replies</ThemedText>
                  <View style={styles.viewThreadButton}>
                    <ThemedText style={styles.viewThreadText}>View Thread</ThemedText>
                    <Feather name="chevron-right" size={14} color={Colors.light.accent} />
                  </View>
                </View>
              </Pressable>
            ))}

            {discussions.length === 0 ? (
              <View style={styles.emptySection}>
                <ThemedText style={styles.emptyText}>
                  More discussions will appear here soon.
                </ThemedText>
              </View>
            ) : null}
          </>
        )}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  heroBanner: {
    height: 160,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.accent,
    overflow: "hidden",
    marginBottom: LayoutSpacing.lg,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: "rgba(6, 46, 3, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: LayoutSpacing.lg,
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    fontFamily: "ui-serif",
    marginBottom: 8,
    flexShrink: 1,
    includeFontPadding: false,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
    flex: 1,
  },
  startDiscussionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.light.button,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  startDiscussionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.light.accent,
    fontWeight: "500",
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  eventIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${Colors.light.accent}10`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  eventDescription: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    lineHeight: 16,
  },
  discussionCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  discussionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  discussionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    flex: 1,
  },
  todayBadge: {
    backgroundColor: Colors.light.backgroundRoot,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  todayBadgeText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },
  discussionDate: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginBottom: 8,
  },
  discussionQuestion: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: 14,
  },
  discussionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  repliesCount: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  addReplyButton: {
    backgroundColor: Colors.light.button,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addReplyText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  viewThreadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewThreadText: {
    fontSize: 13,
    color: Colors.light.accent,
    fontWeight: "500",
  },
  emptySection: {
    paddingVertical: LayoutSpacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
  },
  retryButton: {
    marginTop: LayoutSpacing.sm,
    paddingHorizontal: LayoutSpacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.accent,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
