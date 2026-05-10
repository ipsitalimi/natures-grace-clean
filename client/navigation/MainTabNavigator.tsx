import React from "react";
import { StyleSheet, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle, Rect, Line } from "react-native-svg";

import HomeScreen from "@/screens/HomeScreen";
import WellnessStackNavigator from "@/navigation/WellnessStackNavigator";
import CommunityStackNavigator from "@/navigation/CommunityStackNavigator";
import MoodStackNavigator from "@/navigation/MoodStackNavigator";
import StoreStackNavigator from "@/navigation/StoreStackNavigator";
import ProfileScreen from "@/screens/ProfileScreen";
import { Colors } from "@/constants/theme";

export type MainTabParamList = {
  HomeTab: undefined;
  WellnessTab: undefined;
  CommunityTab: undefined;
  StoreTab: undefined;
  MoodTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

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

function WellnessIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4C12 4 8 8 8 12C8 16 12 18 12 18C12 18 16 16 16 12C16 8 12 4 12 4Z"
        fill={color}
        opacity={0.8}
      />
      <Path
        d="M6 8C6 8 3 10 3 13C3 16 6 18 6 18C6 18 8 16 8 13C8 10 6 8 6 8Z"
        fill={color}
        opacity={0.5}
      />
      <Path
        d="M18 8C18 8 21 10 21 13C21 16 18 18 18 18C18 18 16 16 16 13C16 10 18 8 18 8Z"
        fill={color}
        opacity={0.5}
      />
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

function StoreIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M3 6H21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path
        d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
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
          marginTop: 4 
        }} />
      ) : null}
    </View>
  );
}

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom + 4 : 12;
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        tabBarActiveTintColor: Colors.light.navBarText,
        tabBarInactiveTintColor: Colors.light.navBarText,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: Colors.light.navBar,
          borderTopWidth: 1,
          borderTopColor: Colors.light.brownLight,
          elevation: 0,
          height: 62 + bottomPadding,
          paddingTop: 8,
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
          marginTop: 4,
          paddingBottom: 2,
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
        name="HomeTab"
        component={HomeScreen}
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
        name="WellnessTab"
        component={WellnessStackNavigator}
        options={{
          title: "Wellness",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <WellnessIcon color={color} size={26} />
            </TabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="CommunityTab"
        component={CommunityStackNavigator}
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
        name="StoreTab"
        component={StoreStackNavigator}
        options={{
          title: "Store",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <StoreIcon color={color} size={26} />
            </TabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="MoodTab"
        component={MoodStackNavigator}
        options={{
          title: "Journal",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <JournalIcon color={color} size={26} />
            </TabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarButton: () => null,
          tabBarStyle: { display: "none" },
          tabBarItemStyle: { display: "none", width: 0, height: 0 },
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({});
