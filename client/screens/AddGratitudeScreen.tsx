import React, { useState } from "react";
import { View, StyleSheet, Pressable, TextInput } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing } from "@/constants/theme";
import { useGratitude } from "@/context/GratitudeContext";

function HeartIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21C12 21 3 13.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 12 5.08C12.09 3.81 13.76 3 15.5 3C18.58 3 21 5.42 21 8.5C21 13.5 12 21 12 21Z"
        fill={color}
        opacity={0.2}
      />
      <Path
        d="M12 21C12 21 3 13.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 12 5.08C12.09 3.81 13.76 3 15.5 3C18.58 3 21 5.42 21 8.5C21 13.5 12 21 12 21Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function AddGratitudeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { addGratitude } = useGratitude();
  const [gratitudeText, setGratitudeText] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = () => {
    if (!gratitudeText.trim()) return;
    addGratitude(gratitudeText.trim(), isPublic);
    setSaved(true);
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <View style={styles.headerIconButton} />
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>Add Gratitude</ThemedText>
      </View>

      <View style={[styles.content, { paddingBottom: tabBarHeight + 20 }]}>
        <View style={styles.iconContainer}>
          <HeartIcon size={40} color={Colors.light.accent} />
        </View>

        <ThemedText style={styles.prompt}>
          What are you grateful for today?
        </ThemedText>

        <TextInput
          style={styles.textInput}
          placeholder="I'm thankful for..."
          placeholderTextColor={`${Colors.light.textSecondary}80`}
          multiline
          textAlignVertical="top"
          value={gratitudeText}
          onChangeText={setGratitudeText}
          testID="input-gratitude"
        />

        <View style={styles.visibilitySection}>
          <ThemedText style={styles.visibilityLabel}>Who can see this?</ThemedText>
          <View style={styles.visibilityOptions}>
            <Pressable
              style={[styles.visibilityOption, !isPublic && styles.visibilityOptionActive]}
              onPress={() => setIsPublic(false)}
              testID="option-private"
            >
              <Feather name="eye-off" size={16} color={!isPublic ? "#FFFFFF" : Colors.light.accent} />
              <ThemedText style={[styles.visibilityOptionText, !isPublic && styles.visibilityOptionTextActive]}>
                Private
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.visibilityOption, isPublic && styles.visibilityOptionActive]}
              onPress={() => setIsPublic(true)}
              testID="option-public"
            >
              <Feather name="eye" size={16} color={isPublic ? "#FFFFFF" : Colors.light.accent} />
              <ThemedText style={[styles.visibilityOptionText, isPublic && styles.visibilityOptionTextActive]}>
                Public
              </ThemedText>
            </Pressable>
          </View>
          <ThemedText style={styles.visibilityHint}>
            {isPublic
              ? "Others in the community will see this gratitude"
              : "Only you can see this gratitude"}
          </ThemedText>
        </View>

        {saved ? (
          <View style={styles.successMessage}>
            <Feather name="check-circle" size={20} color={Colors.light.accent} />
            <ThemedText style={styles.successText}>Gratitude added</ThemedText>
          </View>
        ) : (
          <Pressable
            style={[styles.submitButton, !gratitudeText.trim() && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!gratitudeText.trim()}
            testID="button-save-gratitude"
          >
            <ThemedText style={styles.submitButtonText}>Save Gratitude</ThemedText>
          </Pressable>
        )}
      </View>
    </View>
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
  iconContainer: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  prompt: {
    fontSize: 18,
    fontWeight: "500",
    color: Colors.light.text,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  textInput: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.light.text,
    minHeight: 120,
    maxHeight: 200,
  },
  visibilitySection: {
    marginTop: Spacing.xl,
  },
  visibilityLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 10,
  },
  visibilityOptions: {
    flexDirection: "row",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 12,
    padding: 3,
  },
  visibilityOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  visibilityOptionActive: {
    backgroundColor: Colors.light.accent,
  },
  visibilityOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.accent,
  },
  visibilityOptionTextActive: {
    color: "#FFFFFF",
  },
  visibilityHint: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: 8,
    opacity: 0.7,
  },
  submitButton: {
    backgroundColor: Colors.light.button,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  successMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: Spacing.xl,
  },
  successText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.light.accent,
  },
});
