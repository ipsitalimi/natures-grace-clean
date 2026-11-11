import React, { useCallback, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert, TextInput } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { fetchAdminBookingSchedule, updateAdminBookingSchedule, type AdminScheduledBooking } from "@/services/adminBookingScheduleApi";

export default function AdminBookingScheduleScreen({ onBackToDashboard }: { onBackToDashboard: () => void }) {
  const { session } = useAuth();
  const [sessions, setSessions] = useState<AdminScheduledBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { date: string; time: string; link: string }>>({});

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    const result = await fetchAdminBookingSchedule(session.access_token);
    setSessions(result.sessions ?? []);
    setError(result.error ?? null);
    setDrafts(Object.fromEntries((result.sessions ?? []).map((s) => [s.id, {
      date: s.session_date ?? "", time: s.session_time ?? "", link: s.meeting_link ?? "",
    }])));
    setLoading(false);
  }, [session?.access_token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const save = async (booking: AdminScheduledBooking) => {
    if (!session?.access_token) return;
    const draft = drafts[booking.id];
    if (!draft?.date || !draft?.time) {
      Alert.alert("Missing details", "Enter the session date and time.");
      return;
    }
    setBusyId(booking.id);
    const result = await updateAdminBookingSchedule(booking.id, session.access_token, {
      sessionDate: draft.date, sessionTime: draft.time, meetingLink: draft.link.trim() || null,
    });
    setBusyId(null);
    if (!result.ok) {
      Alert.alert("Could not save", result.error ?? "Please try again.");
      return;
    }
    Alert.alert("Saved", "Session schedule and link updated.");
    await load();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={onBackToDashboard}><Feather name="arrow-left" size={17} color={Colors.light.accent} /></Pressable>
        <ThemedText style={styles.title}>Session Scheduling</ThemedText>
      </View>
      <ThemedText style={styles.helper}>Admin-managed date, time and HTTPS meeting link. Date format: YYYY-MM-DD; time: 24-hour HH:MM.</ThemedText>
      {loading ? <ActivityIndicator color={Colors.light.accent} style={{ marginTop: 32 }} /> : error ? <ThemedText style={styles.error}>{error}</ThemedText> : sessions.length === 0 ? <ThemedText style={styles.empty}>No upcoming bookings found.</ThemedText> : sessions.map((s) => {
        const draft = drafts[s.id] ?? { date: s.session_date, time: s.session_time, link: s.meeting_link ?? "" };
        return <View key={s.id} style={styles.card}>
          <ThemedText style={styles.name}>{s.client_name || "Client"} · {s.service_name || "Session"}</ThemedText>
          <ThemedText style={styles.meta}>{s.booking_number ? `Booking #${s.booking_number} · ` : ""}{s.booking_status} · {s.duration_minutes} min</ThemedText>
          <TextInput style={styles.input} value={draft.date} placeholder="YYYY-MM-DD" onChangeText={(date) => setDrafts((prev) => ({ ...prev, [s.id]: { ...draft, date } }))} />
          <TextInput style={styles.input} value={draft.time} placeholder="HH:MM" onChangeText={(time) => setDrafts((prev) => ({ ...prev, [s.id]: { ...draft, time } }))} />
          <TextInput style={styles.input} value={draft.link} placeholder="https://meeting-link (optional)" autoCapitalize="none" keyboardType="url" onChangeText={(link) => setDrafts((prev) => ({ ...prev, [s.id]: { ...draft, link } }))} />
          <Pressable style={[styles.save, busyId === s.id && styles.disabled]} disabled={busyId === s.id} onPress={() => void save(s)}>
            <ThemedText style={styles.saveText}>{busyId === s.id ? "Saving…" : "Save schedule"}</ThemedText>
          </Pressable>
        </View>;
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  back: { padding: 8 },
  title: { fontSize: 20, fontWeight: "700", color: Colors.light.text },
  helper: { color: Colors.light.textMuted, fontSize: 12, lineHeight: 18, marginBottom: Spacing.md },
  card: { backgroundColor: Colors.light.cardBackground, borderRadius: BorderRadius.sm, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.light.divider },
  name: { fontSize: 15, fontWeight: "700", color: Colors.light.text },
  meta: { fontSize: 12, color: Colors.light.textMuted, marginTop: 4, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: Colors.light.divider, borderRadius: BorderRadius.sm, padding: 10, marginTop: 8, color: Colors.light.text },
  save: { backgroundColor: Colors.light.accent, borderRadius: BorderRadius.sm, padding: 12, alignItems: "center", marginTop: 10 },
  saveText: { color: "#fff", fontWeight: "600" },
  disabled: { opacity: 0.5 },
  empty: { textAlign: "center", color: Colors.light.textMuted, marginTop: 32 },
  error: { color: "#8B3A3A", marginTop: 24 },
});
