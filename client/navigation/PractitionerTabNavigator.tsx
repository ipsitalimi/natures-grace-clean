import React from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle, Rect, Line } from "react-native-svg";

import PractitionerHomeScreen from "@/screens/practitioner/PractitionerHomeScreen";
import PractitionerSessionsScreen from "@/screens/practitioner/PractitionerSessionsScreen";
import CommunityStackNavigator from "@/navigation/CommunityStackNavigator";
import MoodStackNavigator from "@/navigation/MoodStackNavigator";
import { Colors } from "@/constants/theme";
import ResourcesScreen from "@/screens/ResourcesScreen";

export type PractitionerTabParamList = {
  PractitionerHomeTab: undefined;
  SessionsTab: undefined;
  PractCommunityTab: undefined;
  PractResourcesTab: undefined;
  PractJournalTab: undefined;
};

const Tab = createBottomTabNavigator<PractitionerTabParamList>();

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

function SessionsIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth="1.8" fill="none" />
      <Path d="M8 2V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M16 2V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M3 10H21" stroke={color} strokeWidth="1.5" />
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

export default function PractitionerTabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;
  return (
    <Tab.Navigator
      initialRouteName="PractitionerHomeTab"
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
        name="PractitionerHomeTab"
        component={PractitionerHomeScreen}
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
        name="SessionsTab"
        component={PractitionerSessionsScreen}
        options={{
          title: "Sessions",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <SessionsIcon color={color} size={26} />
            </TabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="PractCommunityTab"
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
        name="PractResourcesTab"
        component={ResourcesScreen}
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
        name="PractJournalTab"
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
    </Tab.Navigator>
  );
}
