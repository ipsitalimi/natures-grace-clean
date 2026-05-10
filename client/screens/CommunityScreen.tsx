import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, ImageBackground } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle, Rect } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import ProfileDrawer from "@/components/ProfileDrawer";
import { useDataContext } from "@/context/DataContext";

type CommunityStackParamList = {
  EventDetail: { eventId: string };
  DiscussionThread: { discussionId: string };
  Placeholder: { title: string };
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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { events, discussions } = useDataContext();
  const activeEvents = events.filter((e) => e.status === "Active");

  const navigateToEvent = (eventId: string) => {
    navigation.navigate("EventDetail", { eventId });
  };

  const navigateToDiscussion = (discussionId: string) => {
    navigation.navigate("DiscussionThread", { discussionId });
  };

  const goBackToHome = () => {
    navigation.navigate("HomeTab");
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
      
      <View style={styles.content}>
        <View style={styles.titleSection}>
          <ThemedText style={styles.title}>Community</ThemedText>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
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

        <View style={[styles.sectionHeader, { marginTop: 20 }]}>
          <ThemedText style={styles.sectionTitle}>Discussions</ThemedText>
        </View>

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
  content: {
    paddingHorizontal: Spacing.lg,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  profileButton: {
    padding: 6,
  },
  bellButton: {
    padding: 6,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: Spacing.lg + 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontSize: 34,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    letterSpacing: 0.5,
  },
  heroBanner: {
    height: 160,
    borderRadius: 16,
    backgroundColor: Colors.light.accent,
    overflow: "hidden",
    marginBottom: 20,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: "rgba(6, 46, 3, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    fontFamily: "ui-serif",
    marginBottom: 8,
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
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
  },
});
