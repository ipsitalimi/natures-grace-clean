import React, { useCallback, useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Image, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { getAuthScreenPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import {
  LOGIN_TAGLINE_KEY,
  fetchSupportCopyMap,
  getSupportCopyKey,
} from "@/services/content/helpSupportService";

import appLogo from "../../assets/images/natures-grace-logo.png";

import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Login">;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { isConfigured, signIn, loading: authLoading, emailConfirmedMessage, consumeEmailConfirmedMessage, resendVerificationEmail } = useAuth();
  const { syncSessionFromProfile, isAccountSuspended, refreshRemoteConfig } = usePlatformConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copyMap, setCopyMap] = useState<Record<string, string> | null>(null);

  const loadLoginCopy = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setCopyMap(null);
      return;
    }
    const res = await fetchSupportCopyMap();
    if (res.ok) setCopyMap(res.map);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadLoginCopy();
    }, [loadLoginCopy])
  );

  useFocusEffect(
    useCallback(() => {
      if (!emailConfirmedMessage) return;
      const timer = setTimeout(() => consumeEmailConfirmedMessage(), 8000);
      return () => clearTimeout(timer);
    }, [emailConfirmedMessage, consumeEmailConfirmedMessage])
  );

  const taglineRaw = getSupportCopyKey(copyMap, LOGIN_TAGLINE_KEY);
  const taglineDisplay = taglineRaw.trim();

  const handleLogin = async () => {
    setError("");
    setNeedsVerification(false);
    setResent(false);
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setError("Enter email and password.");
      return;
    }

    if (isAccountSuspended(trimmedEmail)) {
      setError("This account has been suspended. Contact support.");
      return;
    }

    setSubmitting(true);

    if (!isConfigured || !isSupabaseConfigured()) {
      setSubmitting(false);
      setError("Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to sign in.");
      return;
    }

    const result = await signIn(trimmedEmail, password);
    setSubmitting(false);
    if (result.needsEmailVerification) {
      setNeedsVerification(true);
      setVerificationEmail(result.email ?? trimmedEmail);
      setError(result.error ?? "Please verify your email before signing in.");
      return;
    }
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.profile) {
      syncSessionFromProfile(result.profile);
      if (result.profile.role === "Admin") {
        await refreshRemoteConfig({ includeProfiles: true });
      }
    }
    // RootNavigation handles post-login routing when session is restored.
  };

  const handleResendVerification = async () => {
    const targetEmail = verificationEmail || email.trim().toLowerCase();
    if (!targetEmail) return;
    setResending(true);
    setResent(false);
    const result = await resendVerificationEmail(targetEmail);
    setResending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setResent(true);
  };

  const busy = submitting || authLoading;

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
      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        bottomOffset={insets.bottom}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.topSection}>
        <View style={styles.logoArea}>
          <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
          {taglineDisplay ? (
            <ThemedText style={styles.tagline} testID="text-login-tagline">
              {taglineDisplay}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.formArea}>
          <View style={styles.inputWrapper}>
            <ThemedText style={styles.inputLabel}>Email</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={Colors.light.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="input-email"
            />
          </View>

          <View style={styles.inputWrapper}>
            <ThemedText style={styles.inputLabel}>Password</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={Colors.light.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              testID="input-password"
            />
          </View>

          <Pressable
            style={styles.forgotLink}
            onPress={() => navigation.navigate("ForgotPassword")}
            testID="link-forgot-password"
          >
            <ThemedText style={styles.forgotText}>Forgot password?</ThemedText>
          </Pressable>

          {!isSupabaseConfigured() ? (
            <ThemedText style={styles.configHint} testID="text-supabase-required">
              Supabase env vars are required for sign-in.
            </ThemedText>
          ) : null}

          {emailConfirmedMessage ? (
            <View style={styles.confirmationBox}>
              <ThemedText style={styles.confirmationText}>{emailConfirmedMessage}</ThemedText>
            </View>
          ) : null}

          {error ? (
            <ThemedText style={needsVerification ? styles.verifyText : styles.errorText}>
              {error}
            </ThemedText>
          ) : null}

          {needsVerification ? (
            <>
              {resent ? (
                <ThemedText style={styles.confirmationText} testID="text-resend-success">
                  Verification email sent again.
                </ThemedText>
              ) : null}
              <Pressable
                style={[styles.secondaryButton, resending && styles.primaryButtonDisabled]}
                onPress={() => void handleResendVerification()}
                disabled={resending}
                testID="button-resend-verification-login"
              >
                {resending ? (
                  <ActivityIndicator color={Colors.light.accent} />
                ) : (
                  <ThemedText style={styles.secondaryButtonText}>Resend verification email</ThemedText>
                )}
              </Pressable>
              <Pressable
                style={styles.verifyLink}
                onPress={() =>
                  navigation.navigate("VerifyEmail", {
                    email: verificationEmail || email.trim().toLowerCase(),
                  })
                }
                testID="link-verify-email-screen"
              >
                <ThemedText style={styles.forgotText}>Open verify email screen</ThemedText>
              </Pressable>
            </>
          ) : null}

          <Pressable
            style={[styles.primaryButton, busy && styles.primaryButtonDisabled]}
            onPress={handleLogin}
            disabled={busy || !isSupabaseConfigured()}
            testID="button-login"
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.primaryButtonText}>Login</ThemedText>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.bottomSection}>
        <ThemedText style={styles.switchText}>Don't have an account? </ThemedText>
        <Pressable onPress={() => navigation.navigate("Signup")} testID="link-create-account">
          <ThemedText style={styles.switchLink}>Create account</ThemedText>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  topSection: {
    flexGrow: 1,
    justifyContent: "center",
  },
  logoArea: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  tagline: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
    color: Colors.light.textMuted,
    marginTop: 10,
    textAlign: "center",
    includeFontPadding: false,
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
  forgotLink: {
    alignSelf: "flex-end",
    marginTop: -4,
  },
  forgotText: {
    fontSize: 14,
    color: Colors.light.accent,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 14,
    color: "#C0392B",
    textAlign: "center",
  },
  verifyText: {
    fontSize: 14,
    color: Colors.light.accent,
    textAlign: "center",
    fontWeight: "600",
  },
  secondaryButton: {
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.divider,
    minHeight: 48,
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.accent,
  },
  verifyLink: {
    alignSelf: "center",
    marginTop: -4,
  },
  confirmationBox: {
    backgroundColor: "#E8F5EE",
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  confirmationText: {
    fontSize: 14,
    color: Colors.light.accent,
    textAlign: "center",
    fontWeight: "600",
  },
  configHint: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.xs,
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
