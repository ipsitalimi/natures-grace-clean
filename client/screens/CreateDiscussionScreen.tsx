import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useDataContext } from "@/context/DataContext";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import type { CommunityStackParamList } from "@/navigation/CommunityStackNavigator";

type NavigationProp = NativeStackNavigationProp<CommunityStackParamList, "CreateDiscussion">;

export default function CreateDiscussionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { session, profile } = useAuth();
  const { createDiscussion } = useDataContext();
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    const trimmedQuestion = question.trim();
    if (!trimmedTitle || !trimmedQuestion || submitting) return;

    if (!isSupabaseConfigured()) {
      setSubmitError("Discussions are unavailable until Supabase is configured.");
      return;
    }
    if (!session?.user) {
      setSubmitError("Sign in to start a discussion.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    const authorName =
      profile?.full_name?.trim() ||
      profile?.email?.split("@")[0] ||
      "Community member";
    const created = await createDiscussion(
      trimmedTitle,
      trimmedQuestion,
      authorName,
      session.user.id
    );
    setSubmitting(false);

    if (!created) {
      setSubmitError("Could not save your discussion. Please try again.");
      return;
    }

    Alert.alert(
      "Discussion submitted",
      "Your topic was sent for review and will appear once approved.",
      [{ text: "OK", onPress: () => navigation.goBack() }]
    );
  };

  const canSubmit =
    title.trim().length > 0 && question.trim().length > 0 && !submitting;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <View style={styles.headerIconButton} />
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>Start Discussion</ThemedText>
      </View>

      <View style={styles.content}>
        <ThemedText style={styles.label}>Title</ThemedText>
        <TextInput
          style={styles.titleInput}
          placeholder="What would you like to discuss?"
          placeholderTextColor={Colors.light.textSecondary}
          value={title}
          onChangeText={setTitle}
        />

        <ThemedText style={styles.label}>Question</ThemedText>
        <TextInput
          style={styles.textInput}
          placeholder="Share your question with the community..."
          placeholderTextColor={Colors.light.textSecondary}
          multiline
          value={question}
          onChangeText={setQuestion}
          textAlignVertical="top"
        />

        <ThemedText style={styles.hint}>
          Be kind and respectful. New discussions are reviewed before they appear publicly.
        </ThemedText>
        {submitError ? <ThemedText style={styles.errorText}>{submitError}</ThemedText> : null}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: getScrollBottomPadding(insets.bottom, 16) }]}>
        <Pressable
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={canSubmit ? handleSubmit : undefined}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.submitButtonText}>Submit Discussion</ThemedText>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
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
  },
  headerIconButton: {
    padding: 8,
    width: 40,
  },
  headerCenter: {
    flex: 1,
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
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
  },
  titleInput: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: 15,
    color: Colors.light.text,
    marginBottom: Spacing.lg,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
    maxHeight: 220,
    minHeight: 140,
  },
  hint: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontStyle: "italic",
    marginTop: Spacing.md,
    textAlign: "center",
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  submitButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#B8AF6F",
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  errorText: {
    fontSize: 13,
    color: "#8B3A3A",
    marginTop: Spacing.md,
    textAlign: "center",
  },
});
