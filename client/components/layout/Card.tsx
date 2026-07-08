import React from "react";
import { View, Pressable, StyleSheet, type ViewStyle, type StyleProp } from "react-native";

import { CardTokens, LayoutSpacing } from "@/constants/layout";

type CardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Shared card surface — radius, shadow, padding from design tokens. */
export default function Card({ children, onPress, compact, style, testID }: CardProps) {
  const surfaceStyle = [styles.card, compact && styles.cardCompact, style];

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [surfaceStyle, pressed && styles.pressed]}
        onPress={onPress}
        testID={testID}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={surfaceStyle} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CardTokens.backgroundColor,
    borderRadius: CardTokens.radius,
    padding: CardTokens.padding,
    shadowColor: CardTokens.shadowColor,
    shadowOffset: CardTokens.shadowOffset,
    shadowOpacity: CardTokens.shadowOpacity,
    shadowRadius: CardTokens.shadowRadius,
    elevation: CardTokens.elevation,
  },
  cardCompact: {
    padding: CardTokens.paddingCompact,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

export const cardGapStyle = { gap: LayoutSpacing.sm } as const;
