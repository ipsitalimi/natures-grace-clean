import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useDataContext, CommunityEvent } from "@/context/DataContext";
import { useEventRegistrations } from "@/context/EventRegistrationsContext";
import type { EventRegistration } from "@/data/eventRegistrations";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { useModeration } from "@/context/ModerationContext";
import { useGratitude } from "@/context/GratitudeContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { formatInr } from "@/lib/formatCurrency";
import { fetchActiveCommunityMemberCount } from "@/services/profileService";

function getReasonBadgeColor(reason: string) {
  switch (reason) {
    case "Spam":
      return "#8B3A3A";
    case "Inappropriate":
      return Colors.light.brownDark;
    case "Misleading":
      return "#B8860B";
    default:
      return Colors.light.accent;
  }
}

function getModeBadgeStyle(mode: string) {
  if (mode === "Online") {
    return { backgroundColor: Colors.light.accent };
  }
  return { backgroundColor: Colors.light.brownDark };
}

function getStatusBadgeStyle(status: CommunityEvent["status"]) {
  switch (status) {
    case "Active":
      return { backgroundColor: "#013220" };
    case "Draft":
      return { backgroundColor: "#AAB494" };
    case "Ended":
      return { backgroundColor: Colors.light.brownDark };
    default:
      return { backgroundColor: Colors.light.accent };
  }
}

function EventCard({
  event,
  attendeeCount,
  attendees,
  onDelete,
}: {
  event: CommunityEvent;
  attendeeCount: number | null;
  attendees: EventRegistration[];
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <ThemedText style={styles.cardTitle} numberOfLines={1}>{event.title}</ThemedText>
        <View style={[styles.badge, getStatusBadgeStyle(event.status)]}>
          <ThemedText style={styles.badgeText}>{event.status}</ThemedText>
        </View>
      </View>
      <ThemedText style={styles.cardDate}>{event.date}</ThemedText>
      <View style={styles.cardRow}>
        <View style={[styles.badge, getModeBadgeStyle(event.mode)]}>
          <ThemedText style={styles.badgeText}>{event.mode}</ThemedText>
        </View>
        <ThemedText style={styles.cardPrice}>{event.price}</ThemedText>
        <Pressable style={styles.deleteIconBtn} onPress={onDelete} testID={`button-delete-event-${event.id}`}>
          <Feather name="trash-2" size={14} color="#8B3A3A" />
        </Pressable>
      </View>
      <ThemedText style={styles.cardMeta} testID={`text-attendee-count-${event.id}`}>
        {attendeeCount === null
          ? "Registrations: sync event to Supabase to track attendees"
          : `${attendeeCount} registered attendee${attendeeCount === 1 ? "" : "s"}`}
      </ThemedText>
      {attendees.length > 0 ? (
        <View style={styles.attendeeList}>
          {attendees.map((reg) => (
            <View key={reg.id} style={styles.attendeeRow}>
              <ThemedText style={styles.attendeeName} numberOfLines={1}>
                {reg.attendeeName || "Attendee"}
              </ThemedText>
              <ThemedText style={styles.attendeeMeta} numberOfLines={1}>
                {reg.attendeeEmail}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : attendeeCount === 0 ? (
        <ThemedText style={styles.cardMeta}>No registrations yet</ThemedText>
      ) : null}
    </View>
  );
}

function getModerationBadgeStyle(status: string) {
  switch (status) {
    case "Approved":
      return { backgroundColor: "#013220" };
    case "Pending":
      return { backgroundColor: "#AAB494" };
    case "Flagged":
      return { backgroundColor: "#8B3A3A" };
    default:
      return { backgroundColor: Colors.light.brownDark };
  }
}

export default function AdminCommunityScreen({ onBackToDashboard }: { onBackToDashboard: () => void }) {
  const {
    events,
    addEvent,
    deleteEvent,
    setEventVisibility,
    moderationDiscussions,
    discussionsLoading,
    setDiscussionModeration,
    refreshContent,
  } = useDataContext();
  const {
    registrations,
    registrationsLoading,
    registrationsError,
    getAttendeeCount,
  } = useEventRegistrations();
  const { logActivity, refreshRemoteConfig } = usePlatformConfig();
  const {
    flaggedItems,
    openFlaggedCount,
    moderationLoading,
    moderationError,
    refreshModerationQueue,
    dismissReport,
    removeReportedContent,
    banFromReport,
  } = useModeration();
  const { refreshGratitude } = useGratitude();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [mode, setMode] = useState("Online");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [saved, setSaved] = useState(false);
  const [activeMembersCount, setActiveMembersCount] = useState<number | null>(null);
  const [activeMembersLoading, setActiveMembersLoading] = useState(() => isSupabaseConfigured());
  const [activeMembersError, setActiveMembersError] = useState<string | null>(null);
  const openFlagged = flaggedItems.filter((f) => !f.resolved);

  useEffect(() => {
    let cancelled = false;

    async function loadActiveMembers() {
      if (!isSupabaseConfigured()) {
        setActiveMembersCount(null);
        setActiveMembersError(null);
        setActiveMembersLoading(false);
        return;
      }
      setActiveMembersLoading(true);
      setActiveMembersError(null);
      const result = await fetchActiveCommunityMemberCount();
      if (cancelled) return;
      setActiveMembersLoading(false);
      if (result.ok) {
        setActiveMembersCount(result.count);
        setActiveMembersError(null);
      } else {
        setActiveMembersCount(null);
        setActiveMembersError(result.error);
      }
    }

    void loadActiveMembers();
    return () => {
      cancelled = true;
    };
  }, []);

  const afterModerationAction = async (ok: boolean) => {
    if (!ok) return;
    await Promise.all([refreshContent(), refreshRemoteConfig(), refreshGratitude()]);
  };

  const resetForm = () => {
    setTitle("");
    setDate("");
    setTime("");
    setMode("Online");
    setPrice("");
    setDescription("");
  };

  const handleCreateEvent = () => {
    if (!title.trim()) return;
    addEvent({
      title: title.trim(),
      description: description.trim() || `${title.trim()} - a community wellness event.`,
      date: date.trim() || "TBD",
      time: time.trim() || "TBD",
      mode,
      pricing: price.trim() ? [{ label: "Per Session", amount: price.trim() }] : [],
      whatToExpect: ["A nurturing and supportive environment", "Expert guidance and facilitation"],
      ctaText: "Join Event",
      bottomNote: "",
      status: "Active",
      price: price.trim() ? formatInr(Number(price.trim()) || 0) : "Free",
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setShowForm(false);
      resetForm();
    }, 1500);
  };

  const handleDismissFlag = async (id: string) => {
    const ok = await dismissReport(id);
    await afterModerationAction(ok);
    if (ok) {
      logActivity(`Flagged item ${id} dismissed`, "event");
    } else {
      Alert.alert("Moderation", "Could not dismiss this report. Please try again.");
    }
  };

  const handleRemoveFlag = async (id: string) => {
    const ok = await removeReportedContent(id);
    await afterModerationAction(ok);
    if (ok) {
      logActivity(`Flagged content ${id} removed`, "event");
    } else {
      Alert.alert("Moderation", "Could not remove this content. Please try again.");
    }
  };

  const handleBanUser = async (id: string) => {
    const ok = await banFromReport(id);
    await afterModerationAction(ok);
    if (ok) {
      logActivity(`User banned from flagged report ${id}`, "user");
    } else {
      Alert.alert("Moderation", "Could not ban this user. Please try again.");
    }
  };

  const handleHideEvent = (eventId: string) => {
    setEventVisibility(eventId, false);
    logActivity(`Event ${eventId} hidden from community`, "event");
  };

  return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.titleRow}>
        <Pressable style={styles.backButton} onPress={onBackToDashboard} testID="button-back-dashboard">
          <Feather name="arrow-left" size={16} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.sectionTitle}>Community Management</ThemedText>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Feather name="calendar" size={16} color={Colors.light.accent} />
          <ThemedText style={styles.statValue} testID="text-active-events">{events.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Active Events</ThemedText>
        </View>
        <View style={styles.statCard}>
          <Feather name="message-circle" size={16} color={Colors.light.accent} />
          <ThemedText style={styles.statValue} testID="text-total-discussions">{moderationDiscussions.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Total Discussions</ThemedText>
        </View>
        <View style={styles.statCard}>
          <Feather name="flag" size={16} color="#8B3A3A" />
          <ThemedText style={styles.statValue} testID="text-flagged-content">
            {moderationLoading ? "…" : openFlaggedCount}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Flagged Content</ThemedText>
        </View>
        <View style={styles.statCard}>
          <Feather name="users" size={16} color={Colors.light.accent} />
          <ThemedText style={styles.statValue} testID="text-active-members">
            {activeMembersLoading
              ? "…"
              : !isSupabaseConfigured() || activeMembersError || activeMembersCount === null
                ? "—"
                : String(activeMembersCount)}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Active Members</ThemedText>
        </View>
      </View>

      {activeMembersError && isSupabaseConfigured() ? (
        <ThemedText style={styles.cardMeta}>Active members count could not be loaded.</ThemedText>
      ) : null}

      <View style={styles.subHeaderRow}>
        <ThemedText style={styles.subSectionTitle}>Events ({events.length})</ThemedText>
        <Pressable style={styles.addButton} onPress={() => setShowForm(true)} testID="button-create-event">
          <Feather name="plus" size={16} color="#FFFFFF" />
          <ThemedText style={styles.addButtonText}>Create Event</ThemedText>
        </Pressable>
      </View>

      {registrationsLoading ? (
        <ThemedText style={styles.cardMeta}>Loading event registrations…</ThemedText>
      ) : null}
      {registrationsError ? (
        <ThemedText style={styles.errorText}>{registrationsError}</ThemedText>
      ) : null}

      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          attendeeCount={event.dbId ? getAttendeeCount(event.dbId) : null}
          attendees={
            event.dbId
              ? registrations.filter(
                  (r) => r.eventId === event.dbId && r.status === "Registered"
                )
              : []
          }
          onDelete={() => {
            handleHideEvent(event.id);
            deleteEvent(event.id);
          }}
        />
      ))}

      <ThemedText style={styles.subSectionTitle}>
        Flagged Content ({moderationLoading ? "…" : openFlagged.length})
      </ThemedText>

      {moderationLoading ? (
        <View style={styles.moderationLoading}>
          <ActivityIndicator color={Colors.light.accent} />
          <ThemedText style={styles.cardMeta}>Loading moderation queue…</ThemedText>
        </View>
      ) : null}

      {moderationError ? (
        <View style={styles.moderationErrorBlock}>
          <ThemedText style={styles.errorText}>{moderationError}</ThemedText>
          <Pressable style={styles.retryBtn} onPress={() => refreshModerationQueue()}>
            <ThemedText style={styles.retryBtnText}>Try again</ThemedText>
          </Pressable>
        </View>
      ) : null}

      {!moderationLoading && !moderationError && !isSupabaseConfigured() ? (
        <ThemedText style={styles.cardMeta}>
          Connect Supabase to persist the moderation queue.
        </ThemedText>
      ) : null}

      {!moderationLoading && !moderationError && isSupabaseConfigured() && openFlagged.length === 0 ? (
        <ThemedText style={styles.cardMeta}>No open reports in the queue.</ThemedText>
      ) : null}

      {openFlagged.map((item) => (
        <View key={item.id} style={styles.card} testID={`card-flagged-${item.id}`}>
          <View style={styles.cardHeader}>
            <View style={styles.flaggedHeaderLeft}>
              <Feather name="flag" size={14} color="#8B3A3A" />
              <ThemedText style={styles.flaggedReporter}>Reported by {item.reporter}</ThemedText>
            </View>
            <View style={[styles.badge, { backgroundColor: getReasonBadgeColor(item.reason) }]}>
              <ThemedText style={styles.badgeText}>{item.reason}</ThemedText>
            </View>
          </View>
          <ThemedText style={styles.flaggedPreview} numberOfLines={2}>{item.contentPreview}</ThemedText>
          <ThemedText style={styles.cardDate}>
            {item.date}
            {item.targetType ? ` · ${item.targetType.replace(/_/g, " ")}` : ""}
          </ThemedText>
          <View style={styles.flaggedActions}>
            <Pressable
              style={styles.flagActionButton}
              onPress={() => handleDismissFlag(item.id)}
              testID={`button-dismiss-flag-${item.id}`}
            >
              <Feather name="x-circle" size={14} color={Colors.light.accent} />
              <ThemedText style={styles.flagActionText}>Dismiss</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.flagActionButton, styles.flagActionRemove]}
              onPress={() => handleRemoveFlag(item.id)}
              testID={`button-remove-flag-${item.id}`}
            >
              <Feather name="trash-2" size={14} color="#8B3A3A" />
              <ThemedText style={[styles.flagActionText, { color: "#8B3A3A" }]}>Remove</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.flagActionButton, styles.flagActionBan]}
              onPress={() => handleBanUser(item.id)}
              testID={`button-ban-user-${item.id}`}
            >
              <Feather name="slash" size={14} color="#FFFFFF" />
              <ThemedText style={[styles.flagActionText, { color: "#FFFFFF" }]}>Ban User</ThemedText>
            </Pressable>
          </View>
        </View>
      ))}

      <ThemedText style={styles.subSectionTitle}>
        Discussion Moderation ({moderationDiscussions.length})
      </ThemedText>

      {discussionsLoading ? (
        <ThemedText style={styles.cardMeta}>Loading discussions…</ThemedText>
      ) : null}

      {moderationDiscussions.map((discussion) => (
        <View key={discussion.id} style={styles.card} testID={`card-discussion-${discussion.id}`}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardTitle} numberOfLines={1}>{discussion.title}</ThemedText>
            <View style={[styles.badge, getModerationBadgeStyle(discussion.moderationStatus)]}>
              <ThemedText style={styles.badgeText}>{discussion.moderationStatus}</ThemedText>
            </View>
          </View>
          <ThemedText style={styles.cardMeta}>{discussion.date} · {discussion.visibility}</ThemedText>
          <ThemedText style={styles.flaggedPreview} numberOfLines={2}>{discussion.question}</ThemedText>
          <View style={styles.cardRow}>
            <ThemedText style={styles.cardMeta}>
              {discussion.replies.length} {discussion.replies.length === 1 ? "reply" : "replies"}
            </ThemedText>
          </View>
          <View style={styles.flaggedActions}>
            {discussion.moderationStatus !== "Approved" ? (
              <Pressable
                style={styles.flagActionButton}
                onPress={() => setDiscussionModeration(discussion.id, { moderationStatus: "Approved" })}
                testID={`button-approve-discussion-${discussion.id}`}
              >
                <Feather name="check-circle" size={14} color={Colors.light.accent} />
                <ThemedText style={styles.flagActionText}>Approve</ThemedText>
              </Pressable>
            ) : null}
            {discussion.visibility !== "Hidden" ? (
              <Pressable
                style={styles.flagActionButton}
                onPress={() => setDiscussionModeration(discussion.id, { visibility: "Hidden" })}
                testID={`button-hide-discussion-${discussion.id}`}
              >
                <Feather name="eye-off" size={14} color={Colors.light.accent} />
                <ThemedText style={styles.flagActionText}>Hide</ThemedText>
              </Pressable>
            ) : (
              <Pressable
                style={styles.flagActionButton}
                onPress={() => setDiscussionModeration(discussion.id, { visibility: "Visible" })}
                testID={`button-show-discussion-${discussion.id}`}
              >
                <Feather name="eye" size={14} color={Colors.light.accent} />
                <ThemedText style={styles.flagActionText}>Show</ThemedText>
              </Pressable>
            )}
            <Pressable
              style={[styles.flagActionButton, styles.flagActionRemove]}
              onPress={() => setDiscussionModeration(discussion.id, { moderationStatus: "Removed" })}
              testID={`button-remove-discussion-${discussion.id}`}
            >
              <Feather name="trash-2" size={14} color="#8B3A3A" />
              <ThemedText style={[styles.flagActionText, { color: "#8B3A3A" }]}>Remove</ThemedText>
            </Pressable>
          </View>
        </View>
      ))}

      {!discussionsLoading && moderationDiscussions.length === 0 ? (
        <ThemedText style={styles.cardMeta}>No discussion threads yet.</ThemedText>
      ) : null}

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Create Event</ThemedText>
              <Pressable onPress={() => { setShowForm(false); resetForm(); }} testID="button-close-event-form">
                <Feather name="x" size={22} color={Colors.light.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.inputLabel}>Title *</ThemedText>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Event title"
                placeholderTextColor={Colors.light.textSecondary}
                testID="input-event-title"
              />

              <ThemedText style={styles.inputLabel}>Description</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Event description"
                placeholderTextColor={Colors.light.textSecondary}
                multiline
                numberOfLines={3}
                testID="input-event-description"
              />

              <ThemedText style={styles.inputLabel}>Date</ThemedText>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="e.g., Every Saturday"
                placeholderTextColor={Colors.light.textSecondary}
                testID="input-event-date"
              />

              <ThemedText style={styles.inputLabel}>Time</ThemedText>
              <TextInput
                style={styles.input}
                value={time}
                onChangeText={setTime}
                placeholder="e.g., 6:00 PM - 7:00 PM"
                placeholderTextColor={Colors.light.textSecondary}
                testID="input-event-time"
              />

              <ThemedText style={styles.inputLabel}>Mode</ThemedText>
              <View style={styles.modeRow}>
                <Pressable
                  style={[styles.modeButton, mode === "Online" ? styles.modeButtonActive : null]}
                  onPress={() => setMode("Online")}
                  testID="button-mode-online"
                >
                  <ThemedText style={[styles.modeButtonText, mode === "Online" ? styles.modeButtonTextActive : null]}>Online</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.modeButton, mode === "In Person" ? styles.modeButtonActive : null]}
                  onPress={() => setMode("In Person")}
                  testID="button-mode-inperson"
                >
                  <ThemedText style={[styles.modeButtonText, mode === "In Person" ? styles.modeButtonTextActive : null]}>In Person</ThemedText>
                </Pressable>
              </View>

              <ThemedText style={styles.inputLabel}>Price (leave empty for Free)</ThemedText>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="e.g., 199"
                placeholderTextColor={Colors.light.textSecondary}
                keyboardType="numeric"
                testID="input-event-price"
              />

              <Pressable style={styles.saveButton} onPress={handleCreateEvent} testID="button-save-event">
                <ThemedText style={styles.saveButtonText}>Create Event</ThemedText>
              </Pressable>

              {saved ? (
                <View style={styles.confirmationBanner}>
                  <Feather name="check-circle" size={16} color="#013220" />
                  <ThemedText style={styles.confirmationText}>Event created successfully</ThemedText>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  backButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: 70,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  subHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  addButtonText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  cardDate: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#8B3A3A",
    marginBottom: Spacing.md,
  },
  moderationLoading: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  moderationErrorBlock: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  retryBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.xs,
  },
  retryBtnText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  attendeeList: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  attendeeRow: {
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  attendeeName: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  attendeeMeta: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
  },
  cardMeta: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  cardPrice: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    flex: 1,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  deleteIconBtn: {
    padding: Spacing.xs,
  },
  flaggedHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flex: 1,
  },
  flaggedReporter: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  flaggedPreview: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
  },
  flaggedActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    flexWrap: "wrap",
  },
  flagActionButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.accent,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  flagActionRemove: {
    borderColor: "#8B3A3A",
  },
  flagActionBan: {
    borderColor: "#8B3A3A",
    backgroundColor: "#8B3A3A",
  },
  flagActionText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.light.backgroundRoot,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  modeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: Colors.light.accent,
  },
  modeButtonText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  modeButtonTextActive: {
    color: "#FFFFFF",
  },
  saveButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  confirmationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(1, 50, 32, 0.15)",
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  confirmationText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#013220",
  },
});
