import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

import appLogo from "../../assets/images/natures-grace-logo.png";

type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  Main: undefined;
  AdminDashboard: undefined;
  PractitionerMain: undefined;
  SellerMain: undefined;
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

const ADMIN_EMAIL = "naturesgrace.reiki@gmail.com";
const ADMIN_PASS = "admins@123";
const PRACTITIONER_EMAIL = "practitioner@naturesgrace.com";
const PRACTITIONER_PASS = "pract@123";
const SELLER_EMAIL = "seller@naturesgrace.com";
const SELLER_PASS = "seller@123";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <View style={[styles.container, { paddingTop: 40, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.topSection}>
        <View style={styles.logoArea}>
          <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
          <ThemedText style={styles.tagline}>Your calm wellness companion</ThemedText>
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

          {error ? (
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          ) : null}

          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              setError("");
              const trimmedEmail = email.trim().toLowerCase();
              if (trimmedEmail === ADMIN_EMAIL && password === ADMIN_PASS) {
                navigation.reset({ index: 0, routes: [{ name: "AdminDashboard" }] });
              } else if (trimmedEmail === PRACTITIONER_EMAIL && password === PRACTITIONER_PASS) {
                navigation.reset({ index: 0, routes: [{ name: "PractitionerMain" }] });
              } else if (trimmedEmail === SELLER_EMAIL && password === SELLER_PASS) {
                navigation.reset({ index: 0, routes: [{ name: "SellerMain" }] });
              } else {
                navigation.reset({ index: 0, routes: [{ name: "Main" }] });
              }
            }}
            testID="button-login"
          >
            <ThemedText style={styles.primaryButtonText}>Login</ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.bottomSection}>
        <ThemedText style={styles.switchText}>Don't have an account? </ThemedText>
        <Pressable
          onPress={() => navigation.navigate("Signup")}
          testID="link-create-account"
        >
          <ThemedText style={styles.switchLink}>Create account</ThemedText>
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
  topSection: {
    flex: 1,
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
    fontWeight: "700",
    color: Colors.light.textMuted,
    marginTop: 10,
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
  primaryButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: Spacing.sm,
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
