import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

import appLogo from "../../assets/images/natures-grace-logo.png";
import { getScrollBottomPadding, getAuthScreenPaddingTop } from "@/lib/layoutInsets";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Signup">;

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { isConfigured } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleContinue = () => {
    setError("");

    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!isConfigured) {
      setError("Account creation requires a configured backend. Contact support.");
      return;
    }

    navigation.navigate("SignupLegal", {
      name: name.trim(),
      email: email.trim(),
      password,
    });
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
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoArea}>
          <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
          <ThemedText style={styles.appTitle}>Create Account</ThemedText>
          <ThemedText style={styles.tagline}>Begin your wellness journey</ThemedText>
        </View>

        <View style={styles.formArea}>
          <View style={styles.inputWrapper}>
            <ThemedText style={styles.inputLabel}>Full Name</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={Colors.light.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              testID="input-name"
            />
          </View>

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
              placeholder="Create a password"
              placeholderTextColor={Colors.light.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              testID="input-password"
            />
          </View>

          <View style={styles.inputWrapper}>
            <ThemedText style={styles.inputLabel}>Confirm Password</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              placeholderTextColor={Colors.light.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              testID="input-confirm-password"
            />
          </View>

          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

          <Pressable
            style={styles.primaryButton}
            onPress={handleContinue}
            testID="button-create-account"
          >
            <ThemedText style={styles.primaryButtonText}>Continue</ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.bottomSection}>
        <ThemedText style={styles.switchText}>Already have an account? </ThemedText>
        <Pressable onPress={() => navigation.navigate("Login")} testID="link-login">
          <ThemedText style={styles.switchLink}>Login</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
    paddingHorizontal: Spacing["2xl"],
  },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center" },
  logoArea: { alignItems: "center", marginBottom: 32 },
  logoImage: { width: 90, height: 90, borderRadius: 45 },
  appTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.light.accent,
    marginTop: Spacing.md,
    letterSpacing: 0.3,
  },
  tagline: { fontSize: 15, color: Colors.light.textMuted, marginTop: 6 },
  formArea: { gap: 16 },
  inputWrapper: { gap: 6 },
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
  errorText: { fontSize: 14, color: "#C0392B", textAlign: "center" },
  infoText: { fontSize: 14, color: Colors.light.accent, textAlign: "center" },
  primaryButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: Spacing.sm,
    minHeight: 52,
    justifyContent: "center",
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  bottomSection: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  switchText: { fontSize: 15, color: Colors.light.textSecondary },
  switchLink: { fontSize: 15, fontWeight: "600", color: Colors.light.accent },
});
