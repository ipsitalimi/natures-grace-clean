import React, { useEffect, useState } from "react";
import { View, FlatList, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { BackHeader, BelowHeaderTitle } from "@/components/layout";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type IntroMessage = { id: string; booking_id: string; sender_id: string; message: string; created_at: string };

export default function PractitionerBookingIntroChatScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const bookingId = String(route.params?.bookingId ?? "");
  const { session } = useAuth();
  const [messages, setMessages] = useState<IntroMessage[]>([]);
  const [message, setMessage] = useState("");
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const refreshMessages = async () => {
    const supabase = getSupabase();
    if (!supabase || !bookingId) return;
    const { data, error: fetchError } = await supabase
      .from("practitioner_booking_intro_messages")
      .select("id, booking_id, sender_id, message, created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });
    if (fetchError) setError(fetchError.message);
    else setMessages((data ?? []) as IntroMessage[]);
  };

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      const supabase = getSupabase();
      if (!supabase || !bookingId) {
        setError("Intro chat is unavailable. Please check your connection.");
        setLoading(false);
        return;
      }
      const { data, error: startError } = await supabase.rpc("start_practitioner_booking_intro_chat", { p_booking_id: bookingId });
      if (!mounted) return;
      const result = data as { ok?: boolean; error?: string; ends_at?: string } | null;
      if (startError || !result?.ok || !result.ends_at) {
        setError(result?.error ?? startError?.message ?? "Could not start intro chat.");
        setLoading(false);
        return;
      }
      setEndsAt(result.ends_at);
      await refreshMessages();
      if (mounted) setLoading(false);
    };
    void start();
    return () => { mounted = false; };
  }, [bookingId]);

  useEffect(() => {
    if (!endsAt) return;
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    const poll = setInterval(() => void refreshMessages(), 2500);
    return () => { clearInterval(timer); clearInterval(poll); };
  }, [endsAt]);

  const send = async () => {
    const supabase = getSupabase();
    const text = message.trim();
    if (!supabase || !session?.user?.id || !text || sending || secondsLeft <= 0) return;
    setSending(true);
    setError("");
    const { error: sendError } = await supabase.from("practitioner_booking_intro_messages").insert({
      booking_id: bookingId,
      sender_id: session.user.id,
      message: text,
    });
    setSending(false);
    if (sendError) {
      setError(sendError.message);
      return;
    }
    setMessage("");
    await refreshMessages();
  };

  const expired = secondsLeft <= 0;
  const timerLabel = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <View style={styles.container}>
      <BackHeader showNotifications={false} />
      <BelowHeaderTitle>Introductory Chat</BelowHeaderTitle>
      <View style={styles.banner}>
        <ThemedText style={styles.bannerTitle}>7-minute introductory chat</ThemedText>
        <ThemedText style={styles.bannerText}>This is a brief pre-session introduction. It does not count toward your paid session duration.</ThemedText>
        <ThemedText style={styles.timer}>{loading ? "Starting…" : expired ? "Intro chat ended" : `Time remaining: ${timerLabel}`}</ThemedText>
      </View>
      {loading ? <ActivityIndicator color={Colors.light.accent} style={{ marginTop: 24 }} /> : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            renderItem={({ item }) => {
              const own = item.sender_id === session?.user?.id;
              return <View style={[styles.messageBubble, own ? styles.ownBubble : styles.otherBubble]}><ThemedText style={own ? styles.ownText : styles.otherText}>{item.message}</ThemedText></View>;
            }}
            ListEmptyComponent={<ThemedText style={styles.empty}>No messages yet. Say hello!</ThemedText>}
          />
          {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
          <View style={styles.composer}>
            <TextInput value={message} onChangeText={setMessage} placeholder={expired ? "Intro chat has ended" : "Message…"} editable={!expired && !sending} maxLength={2000} style={styles.input} />
            <Pressable onPress={() => void send()} disabled={expired || sending || !message.trim()} style={[styles.sendButton, (expired || sending || !message.trim()) && styles.disabled]}>
              {sending ? <ActivityIndicator color="#fff" /> : <Feather name="send" size={18} color="#fff" />}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundRoot },
  flex: { flex: 1 },
  banner: { marginHorizontal: Spacing.lg, padding: Spacing.md, backgroundColor: "#E8F0E9", borderRadius: BorderRadius.md },
  bannerTitle: { color: Colors.light.accent, fontWeight: "700", fontSize: 16 },
  bannerText: { color: Colors.light.text, marginTop: 4 },
  timer: { color: Colors.light.accent, fontWeight: "700", marginTop: 8 },
  messageList: { padding: Spacing.lg, flexGrow: 1 },
  messageBubble: { maxWidth: "82%", padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  ownBubble: { alignSelf: "flex-end", backgroundColor: Colors.light.accent },
  otherBubble: { alignSelf: "flex-start", backgroundColor: Colors.light.cardBackground },
  ownText: { color: "#FFFFFF" },
  otherText: { color: Colors.light.text },
  empty: { color: Colors.light.textMuted, textAlign: "center", marginTop: 24 },
  error: { color: "#B3261E", marginHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  composer: { flexDirection: "row", alignItems: "center", padding: Spacing.md, borderTopWidth: 1, borderTopColor: "#E3E3E3", gap: 8 },
  input: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 10, color: Colors.light.text },
  sendButton: { backgroundColor: Colors.light.accent, width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.45 },
});
