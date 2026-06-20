import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing } from "@/constants/theme";
import { useJournal } from "@/context/JournalContext";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { getHeaderPaddingTop, getScrollBottomPadding, getAuthScreenPaddingTop } from "@/lib/layoutInsets";

type EditorRouteParams = {
  JournalEditor: { prompt?: string; entryId?: string } | undefined;
};

const moodPlaceholders: Record<string, string> = {
  Peaceful: "In this calm moment, what comes to mind...",
  Grateful: "Today I'm thankful for...",
  Anxious: "Let the worry pour out here, gently...",
  Hopeful: "What's lighting up inside you today...",
};

const defaultPlaceholder = "Let whatever needs to come out, come out...";

export default function JournalEditorScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<EditorRouteParams, "JournalEditor">>();
  const prompt = route.params?.prompt;
  const entryId = route.params?.entryId;

  const { selectedMood, setSelectedMood, addEntry, updateEntry, entries } = useJournal();
  const { session } = useAuth();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    if (session?.user) return;
    Alert.alert("Sign in required", "Please sign in to write in your journal.", [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
  }, [session?.user, navigation]);

  const [entryText, setEntryText] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editingEntry = entryId ? entries.find((e) => e.id === entryId) : undefined;
  const isEditing = Boolean(editingEntry);

  useEffect(() => {
    if (!editingEntry) return;
    setSelectedMood(editingEntry.mood);
    let body = editingEntry.fullText;
    if (editingEntry.prompt && body.startsWith(editingEntry.prompt)) {
      body = body.slice(editingEntry.prompt.length).replace(/^\s+/, "");
    }
    setEntryText(body);
  }, [editingEntry, setSelectedMood]);

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const placeholder = selectedMood
    ? moodPlaceholders[selectedMood] || defaultPlaceholder
    : defaultPlaceholder;

  const wordCount = entryText.trim() ? entryText.trim().split(/\s+/).length : 0;

  const handleTextChange = useCallback(
    (text: string) => {
      setEntryText(text);
      setAutoSaveStatus(null);

      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }

      if (!isEditing || !editingEntry || text.trim().length <= 10) return;

      autoSaveTimer.current = setTimeout(() => {
        void (async () => {
          const fullBody = editingEntry.prompt
            ? `${editingEntry.prompt}\n\n${text.trim()}`
            : text.trim();
          const ok = await updateEntry(editingEntry.id, {
            body: fullBody,
            mood: selectedMood,
          });
          setAutoSaveStatus(ok ? "Saved quietly" : null);
        })();
      }, 2000);
    },
    [isEditing, editingEntry, selectedMood, updateEntry]
  );

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);

  const handleSave = async () => {
    if (!entryText.trim() || saving) return;
    setSaving(true);
    setSaveError(null);

    if (isEditing && editingEntry) {
      const fullBody = editingEntry.prompt
        ? `${editingEntry.prompt}\n\n${entryText.trim()}`
        : entryText.trim();
      const ok = await updateEntry(editingEntry.id, {
        body: fullBody,
        mood: selectedMood,
      });
      setSaving(false);
      if (!ok) {
        setSaveError("Could not update your entry. Sign in and try again.");
        return;
      }
      setSaved(true);
      setTimeout(() => {
        navigation.goBack();
      }, 600);
      return;
    }

    const ok = await addEntry(entryText.trim(), selectedMood, prompt);
    setSaving(false);
    if (!ok) {
      setSaveError("Could not save your entry. Sign in and try again.");
      return;
    }
    setSelectedMood(null);
    setSaved(true);
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter}>
          {selectedMood ? (
            <View style={styles.moodBadge}>
              <View style={[styles.moodDot, { backgroundColor: getMoodColor(selectedMood) }]} />
              <ThemedText style={styles.moodBadgeText}>{selectedMood}</ThemedText>
            </View>
          ) : null}
        </View>
        <View style={styles.headerIconButton} />
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>{isEditing ? "Edit Entry" : "New Entry"}</ThemedText>
      </View>

      <View style={styles.content}>
        <View style={styles.dateContainer}>
          <ThemedText style={styles.dateText}>{todayDate}</ThemedText>
        </View>
        
        <View style={styles.divider} />

        {prompt ? (
          <View style={styles.promptContainer}>
            <Feather name="compass" size={14} color={Colors.light.accent} />
            <ThemedText style={styles.promptText}>{prompt}</ThemedText>
          </View>
        ) : null}

        <View style={styles.writingContainer}>
          <TextInput
            style={styles.textInput}
            placeholder={placeholder}
            placeholderTextColor={`${Colors.light.textSecondary}60`}
            multiline
            textAlignVertical="top"
            value={entryText}
            onChangeText={handleTextChange}
            testID="input-journal-entry"
          />
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusLeft}>
            {autoSaveStatus ? (
              <View style={styles.autoSaveIndicator}>
                <Feather name="check" size={12} color={Colors.light.textSecondary} />
                <ThemedText style={styles.autoSaveText}>{autoSaveStatus}</ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText style={styles.wordCount} testID="text-word-count">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </ThemedText>
        </View>

        {saveError ? (
          <ThemedText style={styles.saveErrorText}>{saveError}</ThemedText>
        ) : null}

        <View style={[styles.bottomArea, { paddingBottom: tabBarHeight + 16 }]}>
          {saved ? (
            <View style={styles.successMessage}>
              <Feather name="check" size={18} color={Colors.light.accent} />
              <ThemedText style={styles.successText}>Entry saved</ThemedText>
            </View>
          ) : (
            <Pressable
              style={[styles.saveButton, (!entryText.trim() || saving) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!entryText.trim() || saving}
              testID="button-save-entry"
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.saveButtonText}>Save Entry</ThemedText>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function getMoodColor(mood: string): string {
  switch (mood) {
    case "Peaceful": return "#7BA68A";
    case "Grateful": return "#C4A97A";
    case "Anxious": return "#C47A7A";
    case "Hopeful": return "#7AAEC4";
    default: return Colors.light.accent;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: 8,
    backgroundColor: Colors.light.backgroundRoot,
  },
  headerIconButton: {
    padding: 8,
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  moodBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    gap: 6,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moodBadgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.light.textSecondary,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  dateContainer: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  dateText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: "400",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.divider,
    marginBottom: Spacing.lg,
    opacity: 0.6,
  },
  promptContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${Colors.light.accent}08`,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.accent,
  },
  promptText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    fontWeight: "500",
  },
  writingContainer: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    lineHeight: 28,
    color: Colors.light.text,
    paddingTop: 0,
    letterSpacing: 0.2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.sm,
    paddingHorizontal: 4,
    minHeight: 28,
  },
  statusLeft: {
    flex: 1,
  },
  autoSaveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  autoSaveText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    opacity: 0.6,
    fontStyle: "italic",
  },
  wordCount: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    opacity: 0.5,
  },
  bottomArea: {
    paddingTop: Spacing.md,
  },
  saveButton: {
    backgroundColor: Colors.light.button,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  successMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  successText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.light.accent,
  },
  saveErrorText: {
    fontSize: 13,
    color: "#8B3A3A",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
});
