import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import ProfileDrawer from "@/components/ProfileDrawer";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";
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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddReplyRouteProp>();
  const { discussionId } = route.params;
  const [drawerVisible, setDrawerVisible] = useState(false);
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
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ProfileDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>Add Reply</ThemedText>
      </View>

      <View style={styles.content}>
        <ThemedText style={styles.prompt}>Share your thoughts with the community</ThemedText>
        
        <TextInput
          style={styles.textInput}
          placeholder="Write your reply here..."
          placeholderTextColor={Colors.light.textSecondary}
          multiline
          value={replyText}
          onChangeText={setReplyText}
          textAlignVertical="top"
        />

        <ThemedText style={styles.hint}>
          Be kind and respectful. Your reply will be visible to everyone.
        </ThemedText>
        {submitError ? (
          <ThemedText style={styles.errorText}>{submitError}</ThemedText>
        ) : null}
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
            <ThemedText style={styles.submitButtonText}>
              {replyText.trim().length > 0 ? "Submit Reply" : "Write something..."}
            </ThemedText>
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
    backgroundColor: Colors.light.backgroundRoot,
  },
  headerIconButton: {
    padding: 8,
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
  prompt: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
    maxHeight: 300,
    minHeight: 150,
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
