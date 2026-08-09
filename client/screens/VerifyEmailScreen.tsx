import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getScrollBottomPadding, getAuthScreenPaddingTop } from "@/lib/layoutInsets";

import appLogo from "../../assets/images/natures-grace-logo.png";

type RouteProps = RouteProp<RootStackParamList, "VerifyEmail">;
type NavProp = NativeStackNavigationProp<RootStackParamList, "VerifyEmail">;

export default function VerifyEmailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { email } = route.params;
  const { resendVerificationEmail } = useAuth();

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");

  const handleResend = async () => {
    setError("");
    setResending(true);
    setResent(false);
    const result = await resendVerificationEmail(email);
    setResending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setResent(true);
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoArea}>
          <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
          <View style={styles.iconBadge}>
            <Feather name="mail" size={28} color={Colors.light.accent} />
          </View>
        </View>

        <ThemedText style={styles.title}>Verify your email</ThemedText>
        <ThemedText style={styles.subtitle}>
          We sent a confirmation link to:
        </ThemedText>
        <ThemedText style={styles.emailText} testID="text-verify-email">
          {email}
        </ThemedText>
        <ThemedText style={styles.body}>
          Open the link in that email to activate your account. You cannot sign in until
          verification is complete.
        </ThemedText>

        <View style={styles.tipCard}>
          <Feather name="info" size={16} color={Colors.light.accent} />
          <ThemedText style={styles.tipText}>
            Check your spam folder if you do not see the message within a few minutes.
          </ThemedText>
        </View>

        {resent ? (
          <ThemedText style={styles.successText} testID="text-resend-success">
            Verification email sent again.
          </ThemedText>
        ) : null}
        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        <Pressable
          style={[styles.primaryButton, resending && styles.primaryButtonDisabled]}
          onPress={() => void handleResend()}
          disabled={resending}
          testID="button-resend-verification"
        >
          {resending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.primaryButtonText}>Resend verification email</ThemedText>
          )}
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Signup")}
          testID="button-change-email"
        >
          <ThemedText style={styles.secondaryButtonText}>Use a different email</ThemedText>
        </Pressable>

        <Pressable
          style={styles.linkRow}
          onPress={() => navigation.navigate("Login")}
          testID="link-back-to-login"
        >
          <ThemedText style={styles.linkText}>Already verified? Sign in</ThemedText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
    paddingHorizontal: Spacing["2xl"],
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: Spacing.xl,
  },
  logoArea: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  iconBadge: {
    position: "absolute",
    bottom: -4,
    right: "35%",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.cardBackground,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.light.backgroundRoot,
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "700",
    color: Colors.light.accent,
    textAlign: "center",
    marginBottom: Spacing.sm,
    includeFontPadding: false,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.light.textMuted,
    textAlign: "center",
    includeFontPadding: false,
  },
  emailText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
    textAlign: "center",
    marginTop: 6,
    marginBottom: Spacing.lg,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: `${Colors.light.accent}10`,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.text,
  },
  successText: {
    fontSize: 14,
    color: Colors.light.accent,
    textAlign: "center",
    marginBottom: Spacing.sm,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 14,
    color: "#C0392B",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  secondaryButton: {
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.divider,
    marginBottom: Spacing.lg,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.accent,
  },
  linkRow: { alignItems: "center" },
  linkText: { fontSize: 14, color: Colors.light.textMuted },
});
