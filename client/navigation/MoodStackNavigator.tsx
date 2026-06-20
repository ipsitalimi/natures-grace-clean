import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MoodScreen from "@/screens/MoodScreen";
import JournalEditorScreen from "@/screens/JournalEditorScreen";
import JournalEntriesListScreen from "@/screens/JournalEntriesListScreen";
import JournalEntryViewScreen from "@/screens/JournalEntryViewScreen";
import GratitudeScreen from "@/screens/GratitudeScreen";
import AddGratitudeScreen from "@/screens/AddGratitudeScreen";
import MonthlyOverviewScreen from "@/screens/MonthlyOverviewScreen";
import GuidedReflectionScreen from "@/screens/GuidedReflectionScreen";

export type MoodStackParamList = {
  MoodMain: undefined;
  JournalEditor: { prompt?: string; entryId?: string } | undefined;
  JournalEntriesList: undefined;
  JournalEntryView: { entryId: string };
  Gratitude: undefined;
  AddGratitude: undefined;
  MonthlyOverview: undefined;
  GuidedReflection: undefined;
};

const Stack = createNativeStackNavigator<MoodStackParamList>();

export default function MoodStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoodMain" component={MoodScreen} />
      <Stack.Screen name="JournalEditor" component={JournalEditorScreen} />
      <Stack.Screen name="JournalEntriesList" component={JournalEntriesListScreen} />
      <Stack.Screen name="JournalEntryView" component={JournalEntryViewScreen} />
      <Stack.Screen name="Gratitude" component={GratitudeScreen} />
      <Stack.Screen name="AddGratitude" component={AddGratitudeScreen} />
      <Stack.Screen name="MonthlyOverview" component={MonthlyOverviewScreen} />
      <Stack.Screen name="GuidedReflection" component={GuidedReflectionScreen} />
    </Stack.Navigator>
  );
}
