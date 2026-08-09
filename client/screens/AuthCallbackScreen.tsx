import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList, "AuthCallback">;

/** Shown while Supabase email / recovery deep links establish a session. */
export default function AuthCallbackScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { session, loading, authCallbackError } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 15000);
    return () => clearTimeout(timer);
  }, []);

  const showError = (timedOut && !session && !loading) || Boolean(authCallbackError);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, Spacing.xl),
          paddingBottom: Math.max(insets.bottom, Spacing.xl),
        },
      ]}
      testID="screen-auth-callback"
    >
      {showError ? (
        <>
          <ThemedText style={styles.title}>Could not complete sign-in</ThemedText>
          <ThemedText style={styles.message}>
            {authCallbackError ??
              "The link may have expired. Request a new verification email and try again."}
          </ThemedText>
          <Pressable
            style={styles.button}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: "Login" }] })}
            testID="button-auth-callback-login"
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
          >
            <ThemedText style={styles.buttonText}>Back to sign in</ThemedText>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={Colors.light.accent} />
          <ThemedText style={styles.message}>Signing you in…</ThemedText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.light.backgroundRoot,
    gap: Spacing.lg,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: Colors.light.text,
    textAlign: "center",
    includeFontPadding: false,
  },
  message: {
    fontSize: 15,
    color: Colors.light.textMuted,
    textAlign: "center",
    lineHeight: 22,
    includeFontPadding: false,
  },
  button: {
    marginTop: Spacing.md,
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    minHeight: 48,
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
