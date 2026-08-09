import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { BackHeader, BelowHeaderTitle } from "@/components/layout";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useDataContext } from "@/context/DataContext";
import { useEventRegistrations } from "@/context/EventRegistrationsContext";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";
import { formatInr } from "@/lib/formatCurrency";
import { eventRegistrationNote, isEventRegistrationFree } from "@/lib/eventPricing";

type RootStackParamList = {
  EventDetail: { eventId: string };
  EventRegistration: { eventId: string };
  Placeholder: { title: string };
};

type EventDetailRouteProp = RouteProp<RootStackParamList, "EventDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function CalendarIcon({ size = 20, color = Colors.light.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Path d="M16 2V6M8 2V6M3 10H21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function ClockIcon({ size = 20, color = Colors.light.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
      <Path d="M12 7V12L15 14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function CheckIcon({ size = 16, color = Colors.light.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12L10 17L20 7"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function EventDetailScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { scrollPaddingBottom } = useLayoutInsets(tabBarHeight);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EventDetailRouteProp>();
  const { eventId } = route.params;
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const { events } = useDataContext();
  const { isRegisteredForEvent, registrationsLoading } = useEventRegistrations();
  const { session } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  const event = events.find((e) => e.id === eventId);
  const registered = event?.dbId ? isRegisteredForEvent(event.dbId) : false;
  const favorited = event ? isFavorite("event", eventId) : false;

  const handleToggleFavorite = async () => {
    if (!event || !isSupabaseConfigured() || !session?.user) return;
    setFavoriteBusy(true);
    await toggleFavorite({
      itemType: "event",
      itemId: eventId,
      itemDbId: event.dbId ?? null,
      displayName: event.title,
      displaySubtitle: event.date,
    });
    setFavoriteBusy(false);
  };

  if (!event) {
    return (
      <View style={styles.container}>
        <BackHeader />
        <BelowHeaderTitle>Event</BelowHeaderTitle>
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>Event details not available.</ThemedText>
        </View>
      </View>
    );
  }

  const handleJoin = () => {
    navigation.navigate("EventRegistration", { eventId });
  };

  const registrationFree = isEventRegistrationFree(event.pricing);
  const registrationNote = eventRegistrationNote(event.pricing);

  return (
    <View style={styles.container}>
      <BackHeader
        showNotifications={false}
        rightAction={
          <View style={styles.headerActions}>
            <Pressable
              style={styles.headerIconButton}
              onPress={() => void handleToggleFavorite()}
              disabled={favoriteBusy}
              testID="button-toggle-favorite"
            >
              {favoriteBusy ? (
                <ActivityIndicator size="small" color={Colors.light.accent} />
              ) : (
                <Feather
                  name="heart"
                  size={22}
                  color={favorited ? "#D4534A" : Colors.light.accent}
                />
              )}
            </Pressable>
            <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
              <Feather name="bell" size={22} color={Colors.light.accent} />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.eventTitle}>{event.title}</ThemedText>
        <ThemedText style={styles.eventDescription}>{event.description}</ThemedText>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <CalendarIcon size={20} />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoLabel}>Date</ThemedText>
              <ThemedText style={styles.infoValue}>{event.date}</ThemedText>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <ClockIcon size={20} />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoLabel}>Time</ThemedText>
              <ThemedText style={styles.infoValue}>{event.time}</ThemedText>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Feather name={event.mode === "Online" ? "wifi" : "map-pin"} size={20} color={Colors.light.accent} />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoLabel}>Mode</ThemedText>
              <ThemedText style={styles.infoValue}>{event.mode}</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.registrationBanner}>
          <Feather name="info" size={16} color={Colors.light.accent} />
          <ThemedText style={styles.registrationBannerText}>{registrationNote}</ThemedText>
        </View>

        {registrationFree ? (
          <View style={styles.pricingCard}>
            <ThemedText style={styles.pricingSectionTitle}>Registration</ThemedText>
            <ThemedText style={styles.freeRegistrationText}>Free — RSVP in the app</ThemedText>
          </View>
        ) : (
          <View style={styles.pricingCard}>
            <ThemedText style={styles.pricingSectionTitle}>Reference pricing</ThemedText>
            <ThemedText style={styles.pricingDisclaimer}>
              Shown for information only. You will not be charged when you register below.
            </ThemedText>
            {event.pricing.map((item, index) => (
              <View key={index} style={styles.pricingRow}>
                <ThemedText style={styles.pricingLabel}>{item.label}</ThemedText>
                <ThemedText style={styles.pricingAmount}>
                  {formatInr(Number(item.amount) || 0)}/-
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>What to Expect</ThemedText>
          {event.whatToExpect.map((item, index) => (
            <View key={index} style={styles.expectItem}>
              <View style={styles.checkContainer}>
                <CheckIcon size={14} />
              </View>
              <ThemedText style={styles.expectText}>{item}</ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.actionSection}>
          {registered ? (
            <ThemedText style={styles.registeredLabel} testID="text-event-registered">
              You&apos;re registered for this event
            </ThemedText>
          ) : null}
          <Pressable style={styles.ctaButton} onPress={handleJoin}>
            <ThemedText style={styles.ctaButtonText}>
              {registered ? "View registration" : event.ctaText}
            </ThemedText>
          </Pressable>
          {registrationsLoading && !registered ? (
            <ThemedText style={styles.bottomNote}>Checking registration…</ThemedText>
          ) : null}
          {event.bottomNote ? (
            <ThemedText style={styles.bottomNote}>{event.bottomNote}</ThemedText>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconButton: {
    padding: 8,
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
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  eventTitle: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    marginBottom: Spacing.md,
    flexShrink: 1,
    includeFontPadding: false,
  },
  eventDescription: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  infoCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.light.text,
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.light.divider,
    marginVertical: Spacing.md,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  expectItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${Colors.light.accent}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  expectText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 22,
    paddingTop: 2,
  },
  actionSection: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  ctaButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  registeredLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.accent,
    textAlign: "center",
  },
  bottomNote: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  registrationBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: `${Colors.light.accent}10`,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  registrationBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.text,
  },
  pricingCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  pricingSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  pricingDisclaimer: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  freeRegistrationText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.accent,
  },
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  pricingLabel: {
    fontSize: 14,
    color: Colors.light.text,
  },
  pricingAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.accent,
  },
});
