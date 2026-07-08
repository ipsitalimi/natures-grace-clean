import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Image, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";

import appLogo from "../../assets/images/natures-grace-logo.png";
import { getHeaderPaddingTop, getScrollBottomPadding, getAuthScreenPaddingTop } from "@/lib/layoutInsets";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { resetPassword, isConfigured } = useAuth();

  const handleSendLink = async () => {
    setError("");
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    if (!isConfigured) {
      setError("Password reset is unavailable. Supabase is not configured.");
      return;
    }
    setSubmitting(true);
    const result = await resetPassword(email);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSent(true);
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: getAuthScreenPaddingTop(insets.top),
          paddingBottom: getScrollBottomPadding(insets.bottom, 20),
        },
      ]}
    >
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        bottomOffset={insets.bottom}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.content}>
        <View style={styles.logoArea}>
          <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
          <ThemedText style={styles.pageTitle}>Reset Password</ThemedText>
          <ThemedText style={styles.description}>
            Enter your email address and we'll send you a link to reset your password.
          </ThemedText>
        </View>

        <View style={styles.formArea}>
          <View style={styles.inputWrapper}>
            <ThemedText style={styles.inputLabel}>Email</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={Colors.light.textSecondary}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (sent) setSent(false);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="input-email"
            />
          </View>

          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

          <Pressable
            style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
            onPress={handleSendLink}
            disabled={submitting}
            testID="button-send-reset"
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.primaryButtonText}>Send Reset Link</ThemedText>
            )}
          </Pressable>

          {sent ? (
            <View style={styles.confirmationBox}>
              <Feather name="check-circle" size={20} color={Colors.light.accent} />
              <ThemedText style={styles.confirmationText}>
                Password reset link sent.
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.bottomSection}>
        <ThemedText style={styles.switchText}>Remember your password? </ThemedText>
        <Pressable onPress={() => navigation.goBack()} testID="link-back-login">
          <ThemedText style={styles.switchLink}>Login</ThemedText>
        </Pressable>
      </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
    paddingHorizontal: Spacing["2xl"],
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
  },
  logoArea: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.light.accent,
    marginTop: Spacing.md,
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
  },
  formArea: {
    gap: 16,
  },
  inputWrapper: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.text,
    marginLeft: 4,
  },
  input: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  primaryButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: Spacing.sm,
    minHeight: 52,
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  confirmationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: `${Colors.light.accent}10`,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
  },
  confirmationText: {
    fontSize: 15,
    color: Colors.light.accent,
    fontWeight: "500",
    flex: 1,
  },
  errorText: {
    fontSize: 14,
    color: "#C0392B",
    textAlign: "center",
  },
  bottomSection: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  switchText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
  },
  switchLink: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.accent,
  },
});
