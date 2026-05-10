import React, { useState, useRef } from "react";
import { View, StyleSheet, Pressable, Dimensions, ScrollView, Image } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle, Rect, Line } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import ProfileDrawer from "@/components/ProfileDrawer";
import AppHeader from "@/components/AppHeader";
import { useBooking } from "@/context/BookingContext";
import { Practitioner } from "@/data/practitioners";
import { useDataContext } from "@/context/DataContext";
import exploreWellnessIcon from "../../assets/images/icons/explore-wellness-icon.png";
import journalIcon from "../../assets/images/icons/journal-icon.png";
import resourcesIconImg from "../../assets/images/icons/resources-icon.png";
import storeIconImg from "../../assets/images/icons/store-icon.png";
import buddyIcon from "../../assets/images/icons/buddy-icon.png";
import knowAdminIcon from "../../assets/images/icons/know-admin-icon.png";

type RootStackParamList = {
  Main: undefined;
  Placeholder: { title: string };
  Resources: undefined;
  NGStore: undefined;
  KnowYourAdmin: undefined;
};

type MainTabParamList = {
  HomeTab: undefined;
  WellnessTab: undefined;
  CommunityTab: { screen?: string; params?: { eventId: string } } | undefined;
  MoodTab: undefined;
};

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "HomeTab">,
  NativeStackNavigationProp<RootStackParamList>
>;

const { height: screenHeight } = Dimensions.get("window");

function LotusIcon({ size = 24, color = Colors.light.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C12 2 8 6 8 10C8 14 12 16 12 16C12 16 16 14 16 10C16 6 12 2 12 2Z"
        fill={color}
        opacity={0.8}
      />
      <Path
        d="M6 8C6 8 2 10 2 14C2 18 6 20 6 20C6 20 8 18 8 14C8 10 6 8 6 8Z"
        fill={color}
        opacity={0.6}
      />
      <Path
        d="M18 8C18 8 22 10 22 14C22 18 18 20 18 20C18 20 16 18 16 14C16 10 18 8 18 8Z"
        fill={color}
        opacity={0.6}
      />
    </Svg>
  );
}

function JournalIcon({ size = 28, color = Colors.light.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Rect x="5" y="4" width="14" height="20" rx="2" stroke={color} strokeWidth="1.5" fill="none" />
      <Line x1="8" y1="9" x2="16" y2="9" stroke={color} strokeWidth="1.5" />
      <Line x1="8" y1="13" x2="16" y2="13" stroke={color} strokeWidth="1.5" />
      <Line x1="8" y1="17" x2="13" y2="17" stroke={color} strokeWidth="1.5" />
      <Path
        d="M18 8L23 3L25 5L20 10L18 10.5L18 8Z"
        fill={color}
        opacity={0.7}
      />
    </Svg>
  );
}

function CompassIcon({ size = 28, color = Colors.light.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Circle cx="14" cy="14" r="11" stroke={color} strokeWidth="1.5" fill="none" />
      <Path
        d="M14 6L15 8L14 7L13 8L14 6Z"
        fill={color}
      />
      <Path
        d="M10 10L18 18L14 14L10 10Z"
        fill={color}
        opacity={0.8}
      />
      <Path
        d="M18 10L10 18L14 14L18 10Z"
        fill={color}
        opacity={0.4}
      />
      <Circle cx="14" cy="14" r="2" fill={color} opacity={0.6} />
      <Path
        d="M14 3L15.5 6H12.5L14 3Z"
        fill={color}
        opacity={0.5}
      />
    </Svg>
  );
}

function ResourcesIcon({ size = 28, color = Colors.light.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Rect x="4" y="3" width="9" height="12" rx="1.5" stroke={color} strokeWidth="1.5" fill="none" />
      <Rect x="15" y="3" width="9" height="12" rx="1.5" stroke={color} strokeWidth="1.5" fill="none" />
      <Rect x="4" y="17" width="20" height="8" rx="1.5" stroke={color} strokeWidth="1.5" fill="none" />
      <Line x1="7" y1="21" x2="21" y2="21" stroke={color} strokeWidth="1.5" opacity={0.5} />
    </Svg>
  );
}

function StoreIcon({ size = 28, color = Colors.light.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path
        d="M4 10L6 4H22L24 10"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect x="4" y="10" width="20" height="14" rx="2" stroke={color} strokeWidth="1.5" fill="none" />
      <Path
        d="M4 10C4 10 5.5 13 8 13C10.5 13 11.5 10 14 10C16.5 10 17.5 13 20 13C22.5 13 24 10 24 10"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity={0.6}
      />
      <Rect x="10" y="18" width="8" height="6" stroke={color} strokeWidth="1.5" fill="none" opacity={0.8} />
    </Svg>
  );
}

function AIBuddyIcon({ size = 28, color = Colors.light.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Circle cx="14" cy="14" r="10" stroke={color} strokeWidth="1.5" fill="none" />
      <Circle cx="14" cy="14" r="6" fill={color} opacity={0.15} />
      <Circle cx="10" cy="12" r="1.5" fill={color} opacity={0.8} />
      <Circle cx="18" cy="12" r="1.5" fill={color} opacity={0.8} />
      <Path
        d="M10 17C10 17 12 19 14 19C16 19 18 17 18 17"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Path
        d="M14 4V2"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Circle cx="14" cy="1" r="1" fill={color} opacity={0.6} />
      <Path
        d="M6 8L4 6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity={0.5}
      />
      <Path
        d="M22 8L24 6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity={0.5}
      />
    </Svg>
  );
}

function WriteFreelyIcon({ size = 28, color = Colors.light.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path
        d="M5 22L8 21L22 7L21 6L7 20L5 22Z"
        fill={color}
        opacity={0.3}
      />
      <Path
        d="M19.5 4.5L23.5 8.5L8 24H4V20L19.5 4.5Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Line x1="16" y1="7" x2="21" y2="12" stroke={color} strokeWidth="1.5" />
    </Svg>
  );
}

interface ActionCardProps {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}

function ActionCard({ icon, label, onPress }: ActionCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionCard,
        pressed && styles.actionCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.actionIconContainer}>{icon}</View>
      <ThemedText style={styles.actionLabel}>{label}</ThemedText>
    </Pressable>
  );
}

function getSpecialistLabel(category: string): string {
  switch (category) {
    case "Healings":
      return "Healing Practitioner";
    case "Counseling":
      return "Counselor";
    case "Therapies":
      return "Therapist";
    case "Spiritual Guidance":
      return "Spiritual Guide";
    case "Financial Guidance":
      return "Financial Advisor";
    default:
      return "Specialist";
  }
}

export default function HomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeSpecialist, setActiveSpecialist] = useState(0);
  const { upcomingBooking } = useBooking();
  const { practitionerCategories } = useDataContext();
  const featuredSpecialists = practitionerCategories.flatMap((c) => c.practitioners).slice(0, 4);

  const goToNextSpecialist = () => {
    setActiveSpecialist((prev) => (prev + 1) % featuredSpecialists.length);
  };

  const goToPrevSpecialist = () => {
    setActiveSpecialist((prev) => 
      prev === 0 ? featuredSpecialists.length - 1 : prev - 1
    );
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((e) => {
      if (e.translationX < -50) {
        goToNextSpecialist();
      } else if (e.translationX > 50) {
        goToPrevSpecialist();
      }
    })
    .runOnJS(true);

  const affirmations = [
    "I am worthy of love and happiness.",
    "I trust the journey of my life.",
    "I am at peace with who I am.",
    "I choose peace over perfection today.",
    "I am growing and healing every day.",
    "My feelings are valid and I honour them.",
    "I release what no longer serves me.",
  ];

  const getDailyAffirmation = () => {
    const today = new Date();
    const dayIndex = today.getFullYear() * 1000 + today.getMonth() * 31 + today.getDate();
    return affirmations[dayIndex % affirmations.length];
  };

  const userName = "Limi";

  const navigateToPlaceholder = (title: string) => {
    navigation.navigate("Placeholder", { title });
  };

  return (
    <View style={styles.container}>
      <ProfileDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <AppHeader onProfilePress={() => setDrawerVisible(true)} />
      
      <View style={[styles.content, { paddingBottom: 6 }]}>
        <View style={styles.titleSection}>
          <ThemedText style={styles.appTitle}>Nature's Grace</ThemedText>
        </View>

        <View style={styles.greetingSection}>
          <ThemedText style={styles.greetingText}>
            Welcome back, <ThemedText style={styles.userName}>{userName}</ThemedText>
          </ThemedText>
          <ThemedText style={styles.subGreeting}>How are you feeling today?</ThemedText>
        </View>

        <View style={styles.actionsGrid}>
          <View style={styles.actionsRow}>
            <ActionCard
              icon={<Image source={exploreWellnessIcon} style={styles.actionIconImage} resizeMode="contain" />}
              label="Explore Wellness"
              onPress={() => navigation.navigate("WellnessTab")}
            />
            <ActionCard
              icon={<Image source={storeIconImg} style={styles.actionIconImage} resizeMode="contain" />}
              label="Nature's Grace Store"
              onPress={() => navigation.navigate("StoreTab" as never)}
            />
            <ActionCard
              icon={<Image source={resourcesIconImg} style={styles.actionIconImage} resizeMode="contain" />}
              label="Courses & Resources"
              onPress={() => navigation.navigate("Resources")}
            />
          </View>
          <View style={styles.actionsRow}>
            <ActionCard
              icon={<Image source={journalIcon} style={styles.actionIconImage} resizeMode="contain" />}
              label="Reflect & Journal"
              onPress={() => navigation.navigate("MoodTab")}
            />
            <ActionCard
              icon={<Image source={buddyIcon} style={styles.actionIconImage} resizeMode="contain" />}
              label="NG Buddy"
              onPress={() => navigation.navigate("NGBuddy" as never)}
            />
            <ActionCard
              icon={<Image source={knowAdminIcon} style={styles.actionIconImage} resizeMode="contain" />}
              label="Know Your Admin"
              onPress={() => navigation.navigate("KnowYourAdmin")}
            />
          </View>
        </View>

        <View style={styles.affirmationSection}>
          <ThemedText style={styles.affirmationText}>
            Take a deep breath. You are here now.
          </ThemedText>
          <View style={styles.divider} />
        </View>

        <View style={styles.infoCardsRow}>
          <View style={styles.sessionCard}>
            {upcomingBooking ? (
              <>
                <ThemedText style={styles.infoCardTitle}>Your Next Session</ThemedText>
                <ThemedText style={styles.sessionName}>
                  {upcomingBooking.category.split(" ")[0]} with {upcomingBooking.practitionerName.split(" ")[0]}
                </ThemedText>
                <ThemedText style={styles.sessionTime}>
                  {upcomingBooking.date.dayName}, {upcomingBooking.date.dayNum} {upcomingBooking.date.monthName} at {upcomingBooking.time}
                </ThemedText>
                <View style={styles.placeholderImage}>
                  <Image 
                    source={{ uri: upcomingBooking.practitionerPhoto }} 
                    style={styles.sessionImage}
                    resizeMode="cover"
                  />
                </View>
                <Pressable 
                  style={styles.openWellnessButton}
                  onPress={() => navigateToPlaceholder("Session Details")}
                >
                  <ThemedText style={styles.openWellnessText}>View Details</ThemedText>
                  <Feather name="chevron-right" size={12} color="#FFFFFF" />
                </Pressable>
              </>
            ) : (
              <>
                <ThemedText style={styles.infoCardTitle}>Meet Our Specialists</ThemedText>
                <ThemedText style={styles.specialistName} numberOfLines={1}>
                  {featuredSpecialists[activeSpecialist]?.name}
                </ThemedText>
                <ThemedText style={styles.specialistCategory} numberOfLines={1}>
                  {getSpecialistLabel(featuredSpecialists[activeSpecialist]?.category || "")}
                </ThemedText>
                <GestureDetector gesture={swipeGesture}>
                  <View style={styles.placeholderImage}>
                    <Image 
                      source={featuredSpecialists[activeSpecialist]?.localPhoto || { uri: featuredSpecialists[activeSpecialist]?.photo }} 
                      style={styles.sessionImage}
                      resizeMode="cover"
                    />
                  </View>
                </GestureDetector>
                <View style={styles.specialistDots}>
                  {featuredSpecialists.map((_: Practitioner, dotIndex: number) => (
                    <Pressable
                      key={dotIndex}
                      onPress={() => setActiveSpecialist(dotIndex)}
                      style={[
                        styles.carouselDot,
                        activeSpecialist === dotIndex && styles.carouselDotActive,
                      ]}
                    />
                  ))}
                </View>
              </>
            )}
          </View>

          <View style={styles.rightCardsColumn}>
            <View style={styles.affirmationCard}>
              <ThemedText style={styles.carouselTitle}>Daily Affirmation</ThemedText>
              <View style={styles.quoteBar} />
              <ThemedText style={styles.quoteText}>"{getDailyAffirmation()}"</ThemedText>
              <ThemedText style={styles.affirmationDate}>
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
              </ThemedText>
            </View>

            <View style={styles.harGharDhyanCard}>
              <ThemedText style={styles.harGharTitle}>Har Ghar Dhyan</ThemedText>
              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <View style={styles.bullet} />
                  <ThemedText style={styles.bulletText}>Meditation</ThemedText>
                </View>
                <View style={styles.bulletItem}>
                  <View style={styles.bullet} />
                  <ThemedText style={styles.bulletText}>Mudras</ThemedText>
                </View>
                <View style={styles.bulletItem}>
                  <View style={styles.bullet} />
                  <ThemedText style={styles.bulletText}>Breathwork</ThemedText>
                </View>
              </View>
              <Pressable 
                style={styles.joinFreeButton}
                onPress={() => navigation.navigate("CommunityTab", { screen: "EventDetail", params: { eventId: "har-ghar-dhyan" } })}
              >
                <ThemedText style={styles.joinFreeText}>Join Now</ThemedText>
                <Feather name="chevron-right" size={12} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  content: {
    flex: 1,
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
    marginBottom: Spacing["2xl"],
  },
  appTitle: {
    fontSize: 34,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    letterSpacing: 0.5,
  },
  greetingSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  greetingText: {
    fontSize: 20,
    color: Colors.light.text,
    fontFamily: "ui-serif",
    marginBottom: 2,
  },
  userName: {
    fontWeight: "600",
    fontStyle: "italic",
    color: Colors.light.accent,
    fontSize: 20,
  },
  subGreeting: {
    fontSize: 15,
    color: Colors.light.textMuted,
  },
  actionsGrid: {
    gap: 10,
    marginBottom: Spacing.lg,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  actionCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  actionIconContainer: {
    marginBottom: 8,
  },
  actionIconImage: {
    width: 48,
    height: 48,
  },
  actionLabel: {
    fontSize: 11,
    color: Colors.light.text,
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 13,
  },
  affirmationSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  affirmationText: {
    fontSize: 14,
    color: Colors.light.brown,
    fontFamily: "ui-serif",
    fontStyle: "italic",
    marginBottom: 6,
    textAlign: "center",
  },
  divider: {
    width: 50,
    height: 1,
    backgroundColor: Colors.light.brownLight,
  },
  infoCardsRow: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
  },
  sessionCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  rightCardsColumn: {
    flex: 1,
    gap: 10,
  },
  affirmationCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    gap: 8,
  },
  quoteBar: {
    width: 28,
    height: 2,
    backgroundColor: Colors.light.accent,
    borderRadius: 1,
    opacity: 0.35,
  },
  affirmationDate: {
    fontSize: 10,
    color: Colors.light.textMuted,
    textAlign: "center",
    fontStyle: "italic",
    opacity: 0.75,
  },
  carouselTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 6,
    textAlign: "center",
  },
  breathingTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 6,
    textAlign: "center",
  },
  exerciseName: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.light.text,
    textAlign: "center",
    marginBottom: 6,
  },
  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.button,
    borderRadius: 8,
    paddingVertical: 8,
    width: "100%",
  },
  viewMoreText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "500",
    marginRight: 4,
  },
  carouselDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.accent,
    opacity: 0.3,
    marginHorizontal: 3,
  },
  carouselDotActive: {
    opacity: 1,
  },
  getStartedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.button,
    borderRadius: 8,
    paddingVertical: 8,
    width: "100%",
  },
  getStartedText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "500",
    marginRight: 4,
  },
  harGharDhyanCard: {
    width: 160,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    padding: 12,
    justifyContent: "space-between",
  },
  harGharTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 6,
    textAlign: "center",
  },
  bulletList: {
    marginBottom: 10,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.light.brown,
    marginRight: 8,
    opacity: 0.7,
  },
  bulletText: {
    fontSize: 12,
    color: Colors.light.text,
  },
  joinFreeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.button,
    borderRadius: 8,
    paddingVertical: 8,
    width: "100%",
  },
  joinFreeText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "500",
    marginRight: 4,
  },
  placeholderImage: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 10,
    marginVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    overflow: "hidden",
  },
  sessionImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 4,
    textAlign: "center",
  },
  sessionName: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.text,
    marginBottom: 2,
    textAlign: "center",
  },
  sessionTime: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  cardSpacer: {
    flex: 1,
  },
  quoteText: {
    fontSize: 13,
    color: Colors.light.brown,
    fontStyle: "italic",
    lineHeight: 18,
  },
  openWellnessButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.button,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 4,
  },
  openWellnessText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  specialistName: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.text,
    marginBottom: 2,
  },
  specialistCategory: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  specialistDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 4,
  },
});
