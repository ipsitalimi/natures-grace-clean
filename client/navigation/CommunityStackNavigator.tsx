import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import CommunityScreen from "@/screens/CommunityScreen";
import EventDetailScreen from "@/screens/EventDetailScreen";
import EventRegistrationScreen from "@/screens/EventRegistrationScreen";
import DiscussionThreadScreen from "@/screens/DiscussionThreadScreen";
import AddReplyScreen from "@/screens/AddReplyScreen";

export type CommunityStackParamList = {
  CommunityMain: undefined;
  EventDetail: { eventId: string };
  EventRegistration: { eventId: string };
  DiscussionThread: { discussionId: string };
  AddReply: { discussionId: string };
};

const Stack = createNativeStackNavigator<CommunityStackParamList>();

export default function CommunityStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CommunityMain" component={CommunityScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="EventRegistration" component={EventRegistrationScreen} />
      <Stack.Screen name="DiscussionThread" component={DiscussionThreadScreen} />
      <Stack.Screen name="AddReply" component={AddReplyScreen} />
    </Stack.Navigator>
  );
}
