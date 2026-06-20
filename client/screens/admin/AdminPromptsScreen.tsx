import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useGratitude, DailyPrompt } from "@/context/GratitudeContext";

interface AdminPromptsScreenProps {
  onBackToDashboard: () => void;
}

export default function AdminPromptsScreen({ onBackToDashboard }: AdminPromptsScreenProps) {
  const { dailyPrompts, addPrompt, removePrompt, togglePromptActive } = useGratitude();
  const [newPromptText, setNewPromptText] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleAddPrompt = () => {
    if (!newPromptText.trim()) return;
    addPrompt(newPromptText.trim());
    setNewPromptText("");
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      removePrompt(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const activeCount = dailyPrompts.filter((p) => p.active).length;
  const todayISO = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;

  const groupedPrompts: Record<string, DailyPrompt[]> = {};
  dailyPrompts.forEach((p) => {
    const key = p.dateISO;
    if (!groupedPrompts[key]) groupedPrompts[key] = [];
    groupedPrompts[key].push(p);
  });
  const sortedDates = Object.keys(groupedPrompts).sort().reverse();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <Pressable style={styles.backButton} onPress={onBackToDashboard} testID="button-back-dashboard">
          <Feather name="arrow-left" size={18} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.pageTitle}>Daily Prompts</ThemedText>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <ThemedText style={styles.statValue}>{dailyPrompts.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Total</ThemedText>
        </View>
        <View style={styles.statChip}>
          <ThemedText style={styles.statValue}>{activeCount}</ThemedText>
          <ThemedText style={styles.statLabel}>Active</ThemedText>
        </View>
        <View style={styles.statChip}>
          <ThemedText style={styles.statValue}>{dailyPrompts.length - activeCount}</ThemedText>
          <ThemedText style={styles.statLabel}>Paused</ThemedText>
        </View>
      </View>

      <ThemedText style={styles.infoText}>
        Active prompts are shown to users in the Guided Reflection feature. Add new prompts daily to keep the experience fresh.
      </ThemedText>

      {showAddForm ? (
        <View style={styles.addForm}>
          <ThemedText style={styles.addFormTitle}>New Reflection Prompt</ThemedText>
          <TextInput
            style={styles.promptInput}
            placeholder="Write a gentle, reflective prompt..."
            placeholderTextColor={`${Colors.light.textSecondary}80`}
            multiline
            value={newPromptText}
            onChangeText={setNewPromptText}
            testID="input-new-prompt"
          />
          <View style={styles.addFormActions}>
            <Pressable style={styles.cancelBtn} onPress={() => { setShowAddForm(false); setNewPromptText(""); }}>
              <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.savePromptBtn, !newPromptText.trim() && styles.savePromptBtnDisabled]}
              onPress={handleAddPrompt}
              disabled={!newPromptText.trim()}
              testID="button-save-prompt"
            >
              <Feather name="plus" size={16} color="#FFFFFF" />
              <ThemedText style={styles.savePromptBtnText}>Add Prompt</ThemedText>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={styles.addButton}
          onPress={() => setShowAddForm(true)}
          testID="button-new-prompt"
        >
          <Feather name="plus" size={18} color="#FFFFFF" />
          <ThemedText style={styles.addButtonText}>Add New Prompt</ThemedText>
        </Pressable>
      )}

      {dailyPrompts.length === 0 ? (
        <View style={styles.emptyCard}>
          <ThemedText style={styles.emptyText}>
            No reflection prompts yet. Add a prompt for Guided Reflection.
          </ThemedText>
        </View>
      ) : null}

      {sortedDates.map((dateISO) => (
        <View key={dateISO}>
          <View style={styles.dateHeader}>
            <ThemedText style={styles.dateHeaderText}>
              {dateISO === todayISO ? "Today" : groupedPrompts[dateISO][0].date}
            </ThemedText>
            <ThemedText style={styles.dateCount}>
              {groupedPrompts[dateISO].length} {groupedPrompts[dateISO].length === 1 ? "prompt" : "prompts"}
            </ThemedText>
          </View>
          {groupedPrompts[dateISO].map((prompt) => (
            <View key={prompt.id} style={styles.promptCard}>
              <View style={styles.promptContent}>
                <ThemedText style={[styles.promptText, !prompt.active && styles.promptTextInactive]}>
                  {prompt.text}
                </ThemedText>
                <View style={styles.promptActions}>
                  <Pressable
                    style={[styles.statusChip, prompt.active ? styles.statusActive : styles.statusPaused]}
                    onPress={() => togglePromptActive(prompt.id)}
                    testID={`toggle-prompt-${prompt.id}`}
                  >
                    <Feather
                      name={prompt.active ? "eye" : "eye-off"}
                      size={12}
                      color={prompt.active ? Colors.light.accent : Colors.light.textSecondary}
                    />
                    <ThemedText style={[styles.statusText, prompt.active && styles.statusTextActive]}>
                      {prompt.active ? "Active" : "Paused"}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.deleteBtn, confirmDeleteId === prompt.id && styles.deleteBtnConfirm]}
                    onPress={() => handleDelete(prompt.id)}
                    testID={`delete-prompt-${prompt.id}`}
                  >
                    <Feather name="trash-2" size={14} color={confirmDeleteId === prompt.id ? "#FFFFFF" : "#C47A7A"} />
                    {confirmDeleteId === prompt.id ? (
                      <ThemedText style={styles.deleteBtnConfirmText}>Confirm</ThemedText>
                    ) : null}
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
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
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: Spacing.lg,
  },
  backButton: {
    padding: 6,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: Spacing.lg,
  },
  statChip: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontFamily: "Nunito_400Regular",
    marginTop: 2,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.light.textSecondary,
    fontFamily: "Nunito_400Regular",
    marginBottom: Spacing.lg,
    opacity: 0.7,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.accent,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginBottom: Spacing.xl,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  addForm: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  addFormTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginBottom: 12,
  },
  promptInput: {
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.light.text,
    fontFamily: "Nunito_400Regular",
    minHeight: 80,
  },
  addFormActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontFamily: "Nunito_400Regular",
  },
  savePromptBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.accent,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    gap: 6,
  },
  savePromptBtnDisabled: {
    opacity: 0.5,
  },
  savePromptBtnText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 6,
  },
  dateHeaderText: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  dateCount: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontFamily: "Nunito_400Regular",
  },
  promptCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    padding: Spacing.lg,
    marginBottom: 10,
  },
  promptContent: {
    gap: 10,
  },
  promptText: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.light.text,
    fontFamily: "Nunito_400Regular",
  },
  promptTextInactive: {
    opacity: 0.5,
  },
  promptActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: `${Colors.light.accent}08`,
  },
  statusActive: {
    backgroundColor: `${Colors.light.accent}12`,
  },
  statusPaused: {
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.light.textSecondary,
    fontFamily: "Nunito_400Regular",
  },
  statusTextActive: {
    color: Colors.light.accent,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 6,
    borderRadius: 8,
  },
  deleteBtnConfirm: {
    backgroundColor: "#C47A7A",
    paddingHorizontal: 10,
  },
  deleteBtnConfirmText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Nunito_700Bold",
  },
  emptyCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});
