import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { useSignOut } from "@/hooks/useSignOut";

export default function MaintenanceOverlay() {
  const signOut = useSignOut();
  const { isMaintenanceBlocking } = usePlatformConfig();

  if (!isMaintenanceBlocking) return null;

  return (
    <View style={styles.overlay} testID="maintenance-overlay">
      <View style={styles.card}>
        <Feather name="tool" size={40} color={Colors.light.accent} />
        <ThemedText style={styles.title}>Under Maintenance</ThemedText>
        <ThemedText style={styles.message}>
          Nature&apos;s Grace is temporarily unavailable while we make improvements. Please check
          back soon.
        </ThemedText>
        <Pressable
          style={styles.button}
          onPress={() => {
            void signOut();
          }}
          testID="button-maintenance-login"
        >
          <ThemedText style={styles.buttonText}>Back to Login</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(1, 50, 32, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    padding: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    maxWidth: 340,
    width: "100%",
    gap: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "Nunito_400Regular",
  },
  button: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.light.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
});
