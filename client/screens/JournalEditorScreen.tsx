import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Keyboard,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { BackHeader, BelowHeaderTitle, KeyboardFormLayout } from "@/components/layout";
import { Colors, Spacing } from "@/constants/theme";
import { useJournal } from "@/context/JournalContext";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import {
  formatMoodsForStorage,
  getMoodColor,
  parseMoodsFromStorage,
} from "@/lib/journalMoods";

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
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<EditorRouteParams, "JournalEditor">>();
  const prompt = route.params?.prompt;
  const entryId = route.params?.entryId;

  const {
    selectedMoods,
    clearSelectedMoods,
    setSelectedMoods,
    addEntry,
    updateEntry,
    entries,
  } = useJournal();
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
    setSelectedMoods(parseMoodsFromStorage(editingEntry.mood));
    let body = editingEntry.fullText;
    if (editingEntry.prompt && body.startsWith(editingEntry.prompt)) {
      body = body.slice(editingEntry.prompt.length).replace(/^\s+/, "");
    }
    setEntryText(body);
  }, [editingEntry?.id, setSelectedMoods]);

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const primaryMood = selectedMoods[0];
  const placeholder = primaryMood
    ? moodPlaceholders[primaryMood] || defaultPlaceholder
    : defaultPlaceholder;

  const wordCount = entryText.trim() ? entryText.trim().split(/\s+/).length : 0;
  const moodStorage = formatMoodsForStorage(selectedMoods);

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
            mood: moodStorage,
          });
          setAutoSaveStatus(ok ? "Saved quietly" : null);
        })();
      }, 2000);
    },
    [isEditing, editingEntry, moodStorage, updateEntry]
  );

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);

  const handleSave = async () => {
    Keyboard.dismiss();
    if (!entryText.trim() || saving) return;
    setSaving(true);
    setSaveError(null);

    if (isEditing && editingEntry) {
      const fullBody = editingEntry.prompt
        ? `${editingEntry.prompt}\n\n${entryText.trim()}`
        : entryText.trim();
      const ok = await updateEntry(editingEntry.id, {
        body: fullBody,
        mood: moodStorage,
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

    const ok = await addEntry(entryText.trim(), selectedMoods, prompt);
    setSaving(false);
    if (!ok) {
      setSaveError("Could not save your entry. Sign in and try again.");
      return;
    }
    clearSelectedMoods();
    setSaved(true);
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
  };

  const dismissKeyboard = () => Keyboard.dismiss();

  return (
    <KeyboardFormLayout
      footerInset={tabBarHeight}
      header={
        <>
          <BackHeader
            showNotifications={false}
            center={
              selectedMoods.length > 0 ? (
                <View style={styles.moodBadgeRow}>
                  {selectedMoods.slice(0, 2).map((mood) => (
                    <View key={mood} style={styles.moodBadge}>
                      <View style={[styles.moodDot, { backgroundColor: getMoodColor(mood) }]} />
                      <ThemedText style={styles.moodBadgeText} numberOfLines={1}>
                        {mood}
                      </ThemedText>
                    </View>
                  ))}
                  {selectedMoods.length > 2 ? (
                    <ThemedText style={styles.moodMoreText}>+{selectedMoods.length - 2}</ThemedText>
                  ) : null}
                </View>
              ) : undefined
            }
          />
          <BelowHeaderTitle>{isEditing ? "Edit Entry" : "New Entry"}</BelowHeaderTitle>
        </>
      }
    >
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
          blurOnSubmit
          returnKeyType="done"
          onSubmitEditing={dismissKeyboard}
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

      {saveError ? <ThemedText style={styles.saveErrorText}>{saveError}</ThemedText> : null}

      <View style={styles.bottomArea}>
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
    </KeyboardFormLayout>
  );
}

const styles = StyleSheet.create({
  moodBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "100%",
  },
  moodBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 6,
    maxWidth: 110,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moodBadgeText: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.light.textSecondary,
    flexShrink: 1,
  },
  moodMoreText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: "600",
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
    minHeight: 220,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  textInput: {
    minHeight: 180,
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
    paddingBottom: Spacing.sm,
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
