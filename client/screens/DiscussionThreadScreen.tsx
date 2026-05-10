import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Svg, { Circle, Path } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import ProfileDrawer from "@/components/ProfileDrawer";
import { useDataContext } from "@/context/DataContext";

type RootStackParamList = {
  DiscussionThread: { discussionId: string };
  AddReply: { discussionId: string };
};

type DiscussionThreadRouteProp = RouteProp<RootStackParamList, "DiscussionThread">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function PersonIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" fill={Colors.light.accent} opacity={0.6} />
      <Path
        d="M4 20C4 16 8 14 12 14C16 14 20 16 20 20"
        fill={Colors.light.accent}
        opacity={0.3}
      />
    </Svg>
  );
}

export default function DiscussionThreadScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DiscussionThreadRouteProp>();
  const { discussionId } = route.params;
  const [drawerVisible, setDrawerVisible] = useState(false);

  const { discussions } = useDataContext();
  const discussion = discussions.find((d) => d.id === discussionId);

  if (!discussion) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color={Colors.light.accent} />
          </Pressable>
          <View style={styles.headerCenter} />
          <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
            <Feather name="bell" size={22} color={Colors.light.accent} />
          </Pressable>
        </View>
        <View style={styles.titleSection}>
          <ThemedText style={styles.pageTitle}>Discussion</ThemedText>
        </View>
        <View style={styles.emptyState}>
          <Feather name="message-circle" size={36} color={Colors.light.textSecondary} />
          <ThemedText style={styles.emptyText}>Nothing here yet.</ThemedText>
        </View>
      </View>
    );
  }

  const handleAddReply = () => {
    navigation.navigate("AddReply", { discussionId });
  };

  return (
    <View style={styles.container}>
      <ProfileDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>Discussion</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.questionCard}>
          <ThemedText style={styles.questionTitle}>{discussion.title}</ThemedText>
          <ThemedText style={styles.questionDate}>{discussion.date}</ThemedText>
          <ThemedText style={styles.questionText}>{discussion.question}</ThemedText>
        </View>

        <View style={styles.repliesSection}>
          <ThemedText style={styles.repliesHeader}>
            {discussion.replies.length} {discussion.replies.length === 1 ? "Reply" : "Replies"}
          </ThemedText>

          {discussion.replies.map((reply) => (
            <View key={reply.id} style={styles.replyCard}>
              <View style={styles.replyHeader}>
                <View style={styles.avatarContainer}>
                  <PersonIcon size={32} />
                </View>
                <View style={styles.replyMeta}>
                  <ThemedText style={styles.replyAuthor}>{reply.author}</ThemedText>
                  <ThemedText style={styles.replyTime}>{reply.timeAgo}</ThemedText>
                </View>
              </View>
              <ThemedText style={styles.replyText}>{reply.text}</ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={styles.addReplyButton} onPress={handleAddReply}>
          <Feather name="message-circle" size={18} color="#FFFFFF" />
          <ThemedText style={styles.addReplyText}>Add Reply</ThemedText>
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
  questionCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
  },
  questionDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
  },
  questionText: {
    fontSize: 16,
    color: Colors.light.accent,
    fontWeight: "500",
    lineHeight: 24,
    fontStyle: "italic",
  },
  repliesSection: {
    marginBottom: Spacing.lg,
  },
  repliesHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  replyCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: 10,
  },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${Colors.light.accent}10`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  replyMeta: {
    flex: 1,
  },
  replyAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  replyTime: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  replyText: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 21,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.backgroundRoot,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  addReplyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    gap: 8,
  },
  addReplyText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
