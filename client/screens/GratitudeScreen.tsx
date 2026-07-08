import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { BackHeader, BelowHeaderTitle } from "@/components/layout";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useGratitude, GratitudeEntry } from "@/context/GratitudeContext";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";

type RootStackParamList = {
  AddGratitude: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function HeartIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21C12 21 3 13.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 12 5.08C12.09 3.81 13.76 3 15.5 3C18.58 3 21 5.42 21 8.5C21 13.5 12 21 12 21Z"
        fill={color}
        opacity={0.2}
      />
      <Path
        d="M12 21C12 21 3 13.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 12 5.08C12.09 3.81 13.76 3 15.5 3C18.58 3 21 5.42 21 8.5C21 13.5 12 21 12 21Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type TabType = "mine" | "community";

interface MyGratitudeItemProps {
  entry: GratitudeEntry;
  onToggleVisibility: (id: string) => void;
}

function MyGratitudeItem({ entry, onToggleVisibility }: MyGratitudeItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.gratitudeItem, pressed && styles.gratitudeItemPressed]}
    >
      <View style={styles.heartContainer}>
        <HeartIcon size={18} color={Colors.light.accent} />
      </View>
      <View style={styles.gratitudeContent}>
        <ThemedText style={styles.gratitudeText}>{entry.text}</ThemedText>
        <View style={styles.gratitudeMeta}>
          <ThemedText style={styles.gratitudeDate}>{entry.date}</ThemedText>
          <Pressable
            style={styles.visibilityToggle}
            onPress={() => onToggleVisibility(entry.id)}
            testID={`toggle-visibility-${entry.id}`}
          >
            <Feather
              name={entry.isPublic ? "eye" : "eye-off"}
              size={14}
              color={entry.isPublic ? Colors.light.accent : Colors.light.textSecondary}
            />
            <ThemedText style={[styles.visibilityText, entry.isPublic && styles.visibilityTextPublic]}>
              {entry.isPublic ? "Public" : "Private"}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

interface CommunityGratitudeItemProps {
  entry: GratitudeEntry;
  onAddToMine: (entry: GratitudeEntry) => void;
  isOwn: boolean;
}

function CommunityGratitudeItem({ entry, onAddToMine, isOwn, resetKey }: CommunityGratitudeItemProps & { resetKey: string }) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setAdded(false);
  }, [resetKey, entry.id]);

  const handleAdd = () => {
    onAddToMine(entry);
    setAdded(true);
  };

  return (
    <View style={styles.communityItem}>
      <View style={styles.communityTop}>
        <View style={styles.authorAvatar}>
          <ThemedText style={styles.authorInitial}>{entry.authorInitial}</ThemedText>
        </View>
        <View style={styles.communityContent}>
          <ThemedText style={styles.authorName}>{entry.author}</ThemedText>
          <ThemedText style={styles.communityText}>{entry.text}</ThemedText>
          <ThemedText style={styles.communityDate}>{entry.date}</ThemedText>
        </View>
      </View>
      {!isOwn ? (
        <Pressable
          style={[styles.addToMineBtn, added && styles.addToMineBtnDone]}
          onPress={handleAdd}
          disabled={added}
          testID={`add-to-mine-${entry.id}`}
        >
          <Feather name={added ? "check" : "plus"} size={14} color={added ? Colors.light.accent : Colors.light.textSecondary} />
          <ThemedText style={[styles.addToMineText, added && styles.addToMineTextDone]}>
            {added ? "Added" : "Add to mine"}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function GratitudeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { scrollPaddingBottom } = useLayoutInsets(tabBarHeight);
  const navigation = useNavigation<NavigationProp>();
  const {
    myGratitudes,
    communityGratitudes,
    toggleVisibility,
    addCommunityToMine,
    gratitudeLoading,
    gratitudeError,
  } = useGratitude();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("mine");
  const communityResetKey = session?.user?.id ?? "guest";

  return (
    <View style={styles.container}>
      <BackHeader />

      <BelowHeaderTitle>Gratitude Log</BelowHeaderTitle>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, activeTab === "mine" && styles.tabActive]}
          onPress={() => setActiveTab("mine")}
          testID="tab-mine"
        >
          <Feather name="heart" size={14} color={activeTab === "mine" ? "#FFFFFF" : Colors.light.accent} />
          <ThemedText
            style={[styles.tabText, activeTab === "mine" && styles.tabTextActive]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            My Gratitudes
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "community" && styles.tabActive]}
          onPress={() => setActiveTab("community")}
          testID="tab-community"
        >
          <Feather name="users" size={14} color={activeTab === "community" ? "#FFFFFF" : Colors.light.accent} />
          <ThemedText
            style={[styles.tabText, activeTab === "community" && styles.tabTextActive]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            Community
          </ThemedText>
        </Pressable>
      </View>

      {activeTab === "mine" ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.introCard}>
            <HeartIcon size={24} color={Colors.light.accent} />
            <ThemedText style={styles.introText}>
              Taking time to appreciate the little things can transform your perspective.
            </ThemedText>
          </View>

          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Things you're thankful for</ThemedText>
            <ThemedText style={styles.countBadge}>{myGratitudes.length}</ThemedText>
          </View>

          {gratitudeLoading ? (
            <View style={styles.emptyInline}>
              <ActivityIndicator size="small" color={Colors.light.accent} />
              <ThemedText style={styles.emptyInlineText}>Loading gratitudes…</ThemedText>
            </View>
          ) : gratitudeError ? (
            <View style={styles.emptyInline}>
              <ThemedText style={styles.emptyInlineText}>{gratitudeError}</ThemedText>
            </View>
          ) : myGratitudes.length > 0 ? (
            myGratitudes.map((item) => (
              <MyGratitudeItem key={item.id} entry={item} onToggleVisibility={toggleVisibility} />
            ))
          ) : (
            <View style={styles.emptyInline}>
              <ThemedText style={styles.emptyInlineText}>No gratitudes yet. Add your first one!</ThemedText>
            </View>
          )}

          <Pressable
            style={styles.addButton}
            onPress={() => {
              if (!session?.user && isSupabaseConfigured()) {
                Alert.alert("Sign in required", "Please sign in to add a gratitude entry.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Sign in", onPress: () => navigation.navigate("Login" as never) },
                ]);
                return;
              }
              navigation.navigate("AddGratitude");
            }}
            testID="button-add-gratitude"
          >
            <Feather name="plus" size={20} color="#FFFFFF" />
            <ThemedText style={styles.addButtonText}>Add Gratitude</ThemedText>
          </Pressable>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.communityIntro}>
            <Feather name="globe" size={16} color={Colors.light.accent} />
            <ThemedText style={styles.communityIntroText}>
              See what others are grateful for. Add any that resonate with you.
            </ThemedText>
          </View>

          {gratitudeLoading ? (
            <View style={styles.emptyInline}>
              <ActivityIndicator size="small" color={Colors.light.accent} />
              <ThemedText style={styles.emptyInlineText}>Loading community feed…</ThemedText>
            </View>
          ) : gratitudeError ? (
            <View style={styles.emptyInline}>
              <ThemedText style={styles.emptyInlineText}>{gratitudeError}</ThemedText>
            </View>
          ) : communityGratitudes.length > 0 ? (
            communityGratitudes.map((item) => (
              <CommunityGratitudeItem
                key={item.id}
                entry={item}
                onAddToMine={addCommunityToMine}
                isOwn={item.isOwn ?? item.author === "You"}
                resetKey={communityResetKey}
              />
            ))
          ) : (
            <View style={styles.emptyInline}>
              <ThemedText style={styles.emptyInlineText}>No community gratitudes yet.</ThemedText>
            </View>
          )}
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
  tabRow: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 12,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.light.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.accent,
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  introCard: {
    backgroundColor: `${Colors.light.accent}10`,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: Spacing.lg,
  },
  introText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.text,
    fontStyle: "italic",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
  countBadge: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.accent,
  },
  gratitudeItem: {
    flexDirection: "row",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: 10,
  },
  gratitudeItemPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  heartContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  gratitudeContent: {
    flex: 1,
  },
  gratitudeText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.text,
    marginBottom: 8,
  },
  gratitudeMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gratitudeDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    opacity: 0.7,
  },
  visibilityToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${Colors.light.accent}08`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  visibilityText: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.light.textSecondary,
  },
  visibilityTextPublic: {
    color: Colors.light.accent,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    marginTop: Spacing.md,
    gap: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  communityIntro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: `${Colors.light.accent}08`,
    borderRadius: 12,
    padding: 14,
    marginBottom: Spacing.lg,
  },
  communityIntroText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.light.textSecondary,
  },
  communityItem: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: 10,
  },
  communityTop: {
    flexDirection: "row",
    gap: 12,
  },
  authorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: `${Colors.light.accent}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  authorInitial: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.accent,
  },
  communityContent: {
    flex: 1,
  },
  authorName: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.accent,
    marginBottom: 4,
  },
  communityText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.text,
    marginBottom: 4,
  },
  communityDate: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    opacity: 0.6,
  },
  addToMineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: `${Colors.light.accent}08`,
    borderWidth: 1,
    borderColor: `${Colors.light.accent}20`,
  },
  addToMineBtnDone: {
    backgroundColor: `${Colors.light.accent}12`,
    borderColor: Colors.light.accent,
  },
  addToMineText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.light.textSecondary,
  },
  addToMineTextDone: {
    color: Colors.light.accent,
    fontWeight: "600",
  },
  emptyInline: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  emptyInlineText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    opacity: 0.7,
  },
});
