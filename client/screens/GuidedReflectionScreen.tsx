import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Animated, Easing } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useJournal } from "@/context/JournalContext";
import { useGratitude } from "@/context/GratitudeContext";

type MoodStackParamList = {
  JournalEditor: { prompt?: string };
  GuidedReflection: undefined;
};

const fallbackPrompts = [
  "What moment today made you pause and feel something?",
  "If your body could speak right now, what would it say?",
  "What's one thing you'd like to gently release today?",
];

export default function GuidedReflectionScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MoodStackParamList>>();
  const { selectedMood } = useJournal();
  const { getActivePrompts } = useGratitude();

  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  const activePrompts = getActivePrompts();
  const promptTexts = activePrompts.length >= 3
    ? activePrompts.slice(0, 3).map((p) => p.text)
    : fallbackPrompts;
  const prompts = promptTexts;

  const breatheAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0.85,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const handleStartWriting = () => {
    navigation.replace("JournalEditor", {
      prompt: selectedPrompt || undefined,
    });
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

      <View style={[styles.content, { paddingBottom: tabBarHeight + 20 }]}>
        <Animated.View style={[styles.breatheCircle, { transform: [{ scale: breatheAnim }] }]}>
          <View style={styles.breatheInner}>
            <Feather name="wind" size={28} color={Colors.light.accent} />
          </View>
        </Animated.View>

        <ThemedText style={styles.title}>Guided Reflection</ThemedText>
        <ThemedText style={styles.subtitle}>
          Take a deep breath. Choose a prompt that speaks to you.
        </ThemedText>

        {selectedMood ? (
          <View style={styles.moodChip}>
            <View style={[styles.moodDot, { backgroundColor: getMoodColor(selectedMood) }]} />
            <ThemedText style={styles.moodChipText}>Feeling {selectedMood.toLowerCase()}</ThemedText>
          </View>
        ) : null}

        <View style={styles.promptsContainer}>
          {prompts.map((prompt, index) => (
            <Pressable
              key={index}
              style={[
                styles.promptCard,
                selectedPrompt === prompt && styles.promptCardSelected,
              ]}
              onPress={() => setSelectedPrompt(selectedPrompt === prompt ? null : prompt)}
              testID={`prompt-card-${index}`}
            >
              <View style={styles.promptNumber}>
                <ThemedText style={[
                  styles.promptNumberText,
                  selectedPrompt === prompt && styles.promptNumberTextSelected,
                ]}>
                  {index + 1}
                </ThemedText>
              </View>
              <ThemedText style={[
                styles.promptText,
                selectedPrompt === prompt && styles.promptTextSelected,
              ]}>
                {prompt}
              </ThemedText>
              {selectedPrompt === prompt ? (
                <Feather name="check-circle" size={18} color={Colors.light.accent} />
              ) : null}
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.startButton, !selectedPrompt && styles.startButtonMuted]}
          onPress={handleStartWriting}
          testID="button-start-writing"
        >
          <Feather name="edit-3" size={18} color="#FFFFFF" />
          <ThemedText style={styles.startButtonText}>
            {selectedPrompt ? "Start Writing" : "Write Freely"}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function getMoodColor(mood: string): string {
  switch (mood) {
    case "Peaceful": return "#7BA68A";
    case "Grateful": return "#C4A97A";
    case "Anxious": return "#C47A7A";
    case "Hopeful": return "#7AAEC4";
    default: return Colors.light.accent;
  }
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
  },
  headerIconButton: {
    padding: 8,
    width: 40,
  },
  headerCenter: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
  },
  breatheCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.light.accent}10`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  breatheInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${Colors.light.accent}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
    opacity: 0.7,
  },
  moodChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: Spacing.xl,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moodChipText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },
  promptsContainer: {
    width: "100%",
    gap: 12,
    marginBottom: Spacing["2xl"],
  },
  promptCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    padding: Spacing.lg,
    gap: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  promptCardSelected: {
    borderColor: Colors.light.accent,
    backgroundColor: `${Colors.light.accent}08`,
  },
  promptNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${Colors.light.accent}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  promptNumberText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.accent,
    opacity: 0.6,
  },
  promptNumberTextSelected: {
    opacity: 1,
  },
  promptText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.light.text,
    fontFamily: "ui-serif",
  },
  promptTextSelected: {
    color: Colors.light.accent,
    fontWeight: "500",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.button,
    borderRadius: 14,
    paddingVertical: 16,
    width: "100%",
    gap: 10,
  },
  startButtonMuted: {
    opacity: 0.6,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
