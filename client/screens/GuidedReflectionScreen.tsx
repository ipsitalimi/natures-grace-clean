import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Alert,
  ScrollView,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { BackHeader, BelowHeaderTitle } from "@/components/layout";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useJournal } from "@/context/JournalContext";
import { useGratitude } from "@/context/GratitudeContext";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { getMoodColor } from "@/lib/journalMoods";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";

type MoodStackParamList = {
  JournalEditor: { prompt?: string };
  GuidedReflection: undefined;
};

export default function GuidedReflectionScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { scrollPaddingBottom } = useLayoutInsets(tabBarHeight);
  const navigation = useNavigation<NativeStackNavigationProp<MoodStackParamList>>();
  const { selectedMoods } = useJournal();
  const { getActivePrompts, promptsLoading } = useGratitude();
  const { session } = useAuth();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    if (session?.user) return;
    Alert.alert("Sign in required", "Please sign in to use guided reflection.", [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
  }, [session?.user, navigation]);

  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  const activePrompts = getActivePrompts();
  const prompts =
    activePrompts.length >= 3
      ? activePrompts.slice(0, 3).map((p) => p.text)
      : activePrompts.map((p) => p.text);
  const hasEnoughPrompts = prompts.length >= 3;

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
  }, [breatheAnim]);

  const handleStartWriting = () => {
    navigation.replace("JournalEditor", {
      prompt: selectedPrompt || undefined,
    });
  };

  return (
    <View style={styles.container}>
      <BackHeader showNotifications={false} />
      <BelowHeaderTitle>Guided Reflection</BelowHeaderTitle>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.breatheCircle, { transform: [{ scale: breatheAnim }] }]}>
          <View style={styles.breatheInner}>
            <Feather name="wind" size={28} color={Colors.light.accent} />
          </View>
        </Animated.View>

        <ThemedText style={styles.subtitle}>
          Take a deep breath. Choose a prompt that speaks to you.
        </ThemedText>

        {selectedMoods.length > 0 ? (
          <View style={styles.moodChipRow}>
            {selectedMoods.map((mood) => (
              <View key={mood} style={styles.moodChip}>
                <View style={[styles.moodDot, { backgroundColor: getMoodColor(mood) }]} />
                <ThemedText style={styles.moodChipText}>{mood}</ThemedText>
              </View>
            ))}
          </View>
        ) : null}

        {promptsLoading ? (
          <ThemedText style={styles.subtitle}>Loading prompts…</ThemedText>
        ) : !hasEnoughPrompts ? (
          <View style={styles.emptyPrompts}>
            <ThemedText style={styles.subtitle}>
              Reflection prompts are not available yet. You can still write freely, or check back once
              prompts are published.
            </ThemedText>
          </View>
        ) : (
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
                  <ThemedText
                    style={[
                      styles.promptNumberText,
                      selectedPrompt === prompt && styles.promptNumberTextSelected,
                    ]}
                  >
                    {index + 1}
                  </ThemedText>
                </View>
                <ThemedText
                  style={[
                    styles.promptText,
                    selectedPrompt === prompt && styles.promptTextSelected,
                  ]}
                >
                  {prompt}
                </ThemedText>
                {selectedPrompt === prompt ? (
                  <Feather name="check-circle" size={18} color={Colors.light.accent} />
                ) : null}
              </Pressable>
            ))}
          </View>
        )}

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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
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
    marginBottom: Spacing.lg,
  },
  breatheInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${Colors.light.accent}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
    opacity: 0.7,
  },
  moodChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: Spacing.lg,
  },
  moodChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    gap: 8,
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
  emptyPrompts: {
    width: "100%",
    marginBottom: Spacing["2xl"],
    paddingHorizontal: Spacing.sm,
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
