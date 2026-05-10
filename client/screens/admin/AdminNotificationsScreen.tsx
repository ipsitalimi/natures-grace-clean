import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface Announcement {
  id: string;
  title: string;
  preview: string;
  status: "Active" | "Expired";
  target: string;
  date: string;
}

const initialAnnouncements: Announcement[] = [
  {
    id: "a1",
    title: "Wellness Week Special",
    preview: "Join us for a week of guided sessions...",
    status: "Active",
    target: "All Users",
    date: "Feb 15",
  },
  {
    id: "a2",
    title: "New Practitioner Onboarding",
    preview: "Welcome our new counselors...",
    status: "Active",
    target: "Practitioners",
    date: "Feb 12",
  },
  {
    id: "a3",
    title: "Store Update",
    preview: "Check out our new collection...",
    status: "Expired",
    target: "All Users",
    date: "Feb 5",
  },
];

const scheduledNotifications = [
  {
    id: "s1",
    title: "March Wellness Challenge",
    preview: "Get ready for our monthly wellness challenge...",
    scheduledDate: "Mar 1",
    target: "All Users",
  },
  {
    id: "s2",
    title: "Practitioner Review Reminder",
    preview: "Reminder to complete your monthly reviews...",
    scheduledDate: "Feb 25",
    target: "Practitioners",
  },
];

export default function AdminNotificationsScreen({ onBackToDashboard }: { onBackToDashboard: () => void }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState("All Users");
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!title.trim() || !message.trim()) return;
    const newAnnouncement: Announcement = {
      id: `a${Date.now()}`,
      title: title.trim(),
      preview: message.trim().substring(0, 40) + "...",
      status: "Active",
      target: targetAudience,
      date: "Feb 19",
    };
    setAnnouncements([newAnnouncement, ...announcements]);
    setTitle("");
    setMessage("");
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  };

  const handleDelete = (id: string) => {
    setAnnouncements(announcements.filter((a) => a.id !== id));
  };

  const targets = ["All Users", "Practitioners", "Sellers"];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleRow}>
        <Pressable style={styles.backButton} onPress={onBackToDashboard} testID="button-back-dashboard">
          <Feather name="arrow-left" size={16} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.sectionTitle}>Notifications</ThemedText>
      </View>

      <ThemedText style={styles.subSectionTitle}>Send Notification</ThemedText>
      <View style={styles.formCard}>
        <ThemedText style={styles.inputLabel}>Title</ThemedText>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Notification title"
          placeholderTextColor={`${Colors.light.textSecondary}80`}
          testID="input-notification-title"
        />

        <ThemedText style={styles.inputLabel}>Message</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={message}
          onChangeText={setMessage}
          placeholder="Write your message..."
          placeholderTextColor={`${Colors.light.textSecondary}80`}
          multiline
          numberOfLines={4}
          testID="input-notification-message"
        />

        <ThemedText style={styles.inputLabel}>Target Audience</ThemedText>
        <View style={styles.targetRow}>
          {targets.map((t) => (
            <Pressable
              key={t}
              style={[styles.targetButton, targetAudience === t ? styles.targetButtonActive : null]}
              onPress={() => setTargetAudience(t)}
              testID={`button-target-${t.toLowerCase().replace(/\s/g, "-")}`}
            >
              <ThemedText
                style={[styles.targetButtonText, targetAudience === t ? styles.targetButtonTextActive : null]}
              >
                {t}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.sendButton} onPress={handleSend} testID="button-send-notification">
          <Feather name="send" size={16} color="#FFFFFF" />
          <ThemedText style={styles.sendButtonText}>Send Notification</ThemedText>
        </Pressable>

        {sent ? (
          <View style={styles.confirmationBanner}>
            <Feather name="check-circle" size={16} color="#013220" />
            <ThemedText style={styles.confirmationText}>Notification sent successfully</ThemedText>
          </View>
        ) : null}
      </View>

      <ThemedText style={styles.subSectionTitle}>Active Announcements</ThemedText>
      {announcements.map((announcement) => (
        <View key={announcement.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardTitle} numberOfLines={1}>{announcement.title}</ThemedText>
            <View
              style={[
                styles.statusBadge,
                announcement.status === "Active" ? styles.statusActive : styles.statusExpired,
              ]}
            >
              <ThemedText style={styles.statusBadgeText}>{announcement.status}</ThemedText>
            </View>
          </View>
          <ThemedText style={styles.cardPreview} numberOfLines={2}>{announcement.preview}</ThemedText>
          <View style={styles.cardFooter}>
            <View style={styles.audienceChip}>
              <Feather name="users" size={10} color={Colors.light.accent} />
              <ThemedText style={styles.audienceChipText}>{announcement.target}</ThemedText>
            </View>
            <ThemedText style={styles.cardDate}>{announcement.date}</ThemedText>
            <Pressable
              style={styles.deleteBtn}
              onPress={() => handleDelete(announcement.id)}
              testID={`button-delete-announcement-${announcement.id}`}
            >
              <Feather name="trash-2" size={14} color="#8B3A3A" />
            </Pressable>
          </View>
        </View>
      ))}

      <ThemedText style={styles.subSectionTitle}>Scheduled</ThemedText>
      {scheduledNotifications.map((notif) => (
        <View key={notif.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardTitle} numberOfLines={1}>{notif.title}</ThemedText>
            <View style={styles.scheduledBadge}>
              <Feather name="clock" size={10} color={Colors.light.accent} />
              <ThemedText style={styles.scheduledBadgeText}>{notif.scheduledDate}</ThemedText>
            </View>
          </View>
          <ThemedText style={styles.cardPreview} numberOfLines={2}>{notif.preview}</ThemedText>
          <View style={styles.cardFooter}>
            <View style={styles.audienceChip}>
              <Feather name="users" size={10} color={Colors.light.accent} />
              <ThemedText style={styles.audienceChipText}>{notif.target}</ThemedText>
            </View>
          </View>
        </View>
      ))}
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
  subSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  formCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.light.backgroundRoot,
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
  targetRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  targetButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  targetButtonActive: {
    backgroundColor: Colors.light.accent,
  },
  targetButtonText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  targetButtonTextActive: {
    color: "#FFFFFF",
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  sendButtonText: {
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
  cardPreview: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cardDate: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  statusActive: {
    backgroundColor: "#013220",
  },
  statusExpired: {
    backgroundColor: "#AAB494",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  audienceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${Colors.light.accent}12`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  audienceChipText: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.accent,
  },
  scheduledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${Colors.light.accent}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scheduledBadgeText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  deleteBtn: {
    padding: Spacing.xs,
  },
});
