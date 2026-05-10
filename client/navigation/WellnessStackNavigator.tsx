import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import WellnessScreen from "@/screens/WellnessScreen";
import SubcategoryScreen from "@/screens/SubcategoryScreen";
import CategoryDetailScreen from "@/screens/CategoryDetailScreen";
import PractitionerProfileScreen from "@/screens/PractitionerProfileScreen";
import BookSessionScreen from "@/screens/BookSessionScreen";
import SessionSummaryScreen from "@/screens/SessionSummaryScreen";
import PractitionerApplicationScreen from "@/screens/PractitionerApplicationScreen";

export type WellnessStackParamList = {
  WellnessMain: undefined;
  Subcategory: { categoryId: string };
  CategoryDetail: { categoryId: string; subcategoryName?: string };
  PractitionerProfile: { practitionerId: string };
  BookSession: { practitionerId: string };
  SessionSummary: {
    practitionerId: string;
    selectedDate: { dayName: string; dayNum: number; monthName: string };
    selectedTime: string;
    duration: number;
  };
  PractitionerApplication: undefined;
};

const Stack = createNativeStackNavigator<WellnessStackParamList>();

export default function WellnessStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WellnessMain" component={WellnessScreen} />
      <Stack.Screen name="Subcategory" component={SubcategoryScreen} />
      <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
      <Stack.Screen name="PractitionerProfile" component={PractitionerProfileScreen} />
      <Stack.Screen name="BookSession" component={BookSessionScreen} />
      <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} />
      <Stack.Screen name="PractitionerApplication" component={PractitionerApplicationScreen} />
    </Stack.Navigator>
  );
}
