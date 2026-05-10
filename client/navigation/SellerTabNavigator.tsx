import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle, Rect, Line } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import SellerHomeScreen from "@/screens/seller/SellerHomeScreen";
import SellerProductsScreen from "@/screens/seller/SellerProductsScreen";
import CommunityStackNavigator from "@/navigation/CommunityStackNavigator";
import MoodStackNavigator from "@/navigation/MoodStackNavigator";
import { Colors, Spacing } from "@/constants/theme";
import ResourcesScreen from "@/screens/ResourcesScreen";

function FloatingHomeButton() {
  const navigation = useNavigation();
  return (
    <View style={[wrapperStyles.floatingWrap, { top: 8 }]} pointerEvents="box-none">
      <Pressable
        style={wrapperStyles.floatingBtn}
        onPress={() => (navigation as any).navigate("SellerHomeTab")}
        testID="button-back-home"
      >
        <Feather name="arrow-left" size={14} color="#FFFFFF" />
        <ThemedText style={wrapperStyles.floatingText}>Home</ThemedText>
      </Pressable>
    </View>
  );
}

function SellerCommunityWrapper() {
  return (
    <View style={wrapperStyles.wrapper}>
      <CommunityStackNavigator />
      <FloatingHomeButton />
    </View>
  );
}

function SellerResourcesWrapper() {
  return (
    <View style={wrapperStyles.wrapper}>
      <ResourcesScreen />
      <FloatingHomeButton />
    </View>
  );
}

function SellerJournalWrapper() {
  return (
    <View style={wrapperStyles.wrapper}>
      <MoodStackNavigator />
      <FloatingHomeButton />
    </View>
  );
}

const wrapperStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  floatingWrap: {
    position: "absolute",
    left: Spacing.lg,
    zIndex: 100,
  },
  floatingBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    opacity: 0.9,
  },
  floatingText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
});

export type SellerTabParamList = {
  SellerHomeTab: undefined;
  SellerProductsTab: undefined;
  SellerCommunityTab: undefined;
  SellerResourcesTab: undefined;
  SellerJournalTab: undefined;
};

const Tab = createBottomTabNavigator<SellerTabParamList>();

function HomeIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function ProductsIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 16V8C20.9996 7.6493 20.9071 7.30483 20.7315 7.00017C20.556 6.69552 20.3037 6.44136 20 6.26L13 2.26C12.696 2.08926 12.3511 2 12 2C11.6489 2 11.304 2.08926 11 2.26L4 6.26C3.69626 6.44136 3.44398 6.69552 3.26846 7.00017C3.09294 7.30483 3.00036 7.6493 3 8V16C3.00036 16.3507 3.09294 16.6952 3.26846 16.9998C3.44398 17.3045 3.69626 17.5586 4 17.74L11 21.74C11.304 21.9107 11.6489 22 12 22C12.3511 22 12.696 21.9107 13 21.74L20 17.74C20.3037 17.5586 20.556 17.3045 20.7315 16.9998C20.9071 16.6952 20.9996 16.3507 21 16Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M3.27 6.96L12 12.01L20.73 6.96" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 22.08V12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CommunityIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="3" fill={color} />
      <Circle cx="6" cy="10" r="2.5" fill={color} opacity={0.6} />
      <Circle cx="18" cy="10" r="2.5" fill={color} opacity={0.6} />
      <Path
        d="M12 14C8 14 5 16 5 19V20H19V19C19 16 16 14 12 14Z"
        fill={color}
        opacity={0.8}
      />
    </Svg>
  );
}

function ResourcesIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="3" width="16" height="18" rx="2" stroke={color} strokeWidth="1.8" fill="none" />
      <Line x1="8" y1="7" x2="16" y2="7" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="8" y1="11" x2="16" y2="11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="8" y1="15" x2="12" y2="15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function JournalIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="3" width="16" height="18" rx="2" stroke={color} strokeWidth="1.8" fill="none" />
      <Line x1="8" y1="7" x2="16" y2="7" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="8" y1="11" x2="16" y2="11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="8" y1="15" x2="12" y2="15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function TabIcon({ children, focused }: { children: React.ReactNode; focused: boolean }) {
  return (
    <View style={{ alignItems: "center" }}>
      {children}
      {focused ? (
        <View style={{
          width: 20,
          height: 3,
          backgroundColor: Colors.light.navBarText,
          borderRadius: 2,
          marginTop: 4,
        }} />
      ) : null}
    </View>
  );
}

export default function SellerTabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;
  return (
    <Tab.Navigator
      initialRouteName="SellerHomeTab"
      screenOptions={{
        tabBarActiveTintColor: Colors.light.navBarText,
        tabBarInactiveTintColor: Colors.light.navBarText,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: Colors.light.navBar,
          borderTopWidth: 1,
          borderTopColor: Colors.light.brownLight,
          elevation: 0,
          height: 56 + bottomPadding,
          paddingTop: 6,
          paddingBottom: bottomPadding,
        },
        tabBarItemStyle: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
          width: 28,
          height: 28,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="SellerHomeTab"
        component={SellerHomeScreen}
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <HomeIcon color={color} size={26} />
            </TabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="SellerProductsTab"
        component={SellerProductsScreen}
        options={{
          title: "Products",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <ProductsIcon color={color} size={26} />
            </TabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="SellerCommunityTab"
        component={SellerCommunityWrapper}
        options={{
          title: "Community",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <CommunityIcon color={color} size={26} />
            </TabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="SellerResourcesTab"
        component={SellerResourcesWrapper}
        options={{
          title: "Resources",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <ResourcesIcon color={color} size={26} />
            </TabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="SellerJournalTab"
        component={SellerJournalWrapper}
        options={{
          title: "Journal",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <JournalIcon color={color} size={26} />
            </TabIcon>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
