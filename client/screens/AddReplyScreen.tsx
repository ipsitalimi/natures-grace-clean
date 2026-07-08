import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { BackHeader, BelowHeaderTitle, KeyboardFormLayout } from "@/components/layout";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useDataContext } from "@/context/DataContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";

type RootStackParamList = {
  AddReply: { discussionId: string };
  DiscussionThread: { discussionId: string };
};

type AddReplyRouteProp = RouteProp<RootStackParamList, "AddReply">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AddReplyScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddReplyRouteProp>();
  const { discussionId } = route.params;
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { session, profile } = useAuth();
  const { addDiscussionReply } = useDataContext();

  const handleSubmit = async () => {
    const body = replyText.trim();
    if (!body || submitting) return;

    if (!isSupabaseConfigured()) {
      setSubmitError("Discussions are unavailable until Supabase is configured.");
      return;
    }
    if (!session?.user) {
      setSubmitError("Sign in to post a reply.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    const authorName =
      profile?.full_name?.trim() ||
      profile?.email?.split("@")[0] ||
      "Community member";
    const created = await addDiscussionReply(
      discussionId,
      body,
      authorName,
      session.user.id
    );
    setSubmitting(false);

    if (!created) {
      setSubmitError("Could not save your reply. Please try again.");
      return;
    }
    navigation.goBack();
  };

  const canSubmit = replyText.trim().length > 0 && !submitting;

  return (
    <KeyboardFormLayout
      header={
        <>
          <BackHeader />
          <BelowHeaderTitle>Add Reply</BelowHeaderTitle>
        </>
      }
    >
      <ThemedText style={styles.prompt}>Share your thoughts with the community</ThemedText>

      <TextInput
        style={styles.textInput}
        placeholder="Write your reply here..."
        placeholderTextColor={Colors.light.textSecondary}
        multiline
        value={replyText}
        onChangeText={setReplyText}
        textAlignVertical="top"
        blurOnSubmit
        returnKeyType="done"
      />

      <ThemedText style={styles.hint}>
        Be kind and respectful. Your reply will be visible to everyone.
      </ThemedText>
      {submitError ? <ThemedText style={styles.errorText}>{submitError}</ThemedText> : null}

      <Pressable
        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        onPress={canSubmit ? handleSubmit : undefined}
        disabled={!canSubmit}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <ThemedText style={styles.submitButtonText}>
            {replyText.trim().length > 0 ? "Submit Reply" : "Write something..."}
          </ThemedText>
        )}
      </Pressable>
    </KeyboardFormLayout>
  );
}

const styles = StyleSheet.create({
  prompt: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
  },
  textInput: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
    minHeight: 150,
    maxHeight: 300,
  },
  hint: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontStyle: "italic",
    marginTop: Spacing.md,
    textAlign: "center",
  },
  submitButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: Spacing.xl,
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
