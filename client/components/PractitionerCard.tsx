import React from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import type { Practitioner } from "@/data/practitioners";

interface PractitionerCardProps {
  practitioner: Practitioner;
  onPress: () => void;
}

function StarFilled({ size = 12, color = "#E5A93B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2L14.5 9H22L16 14L18 21L12 17L6 21L8 14L2 9H9.5L12 2Z" />
    </Svg>
  );
}

export default function PractitionerCard({ practitioner, onPress }: PractitionerCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image
        source={practitioner.localPhoto || { uri: practitioner.photo }}
        style={styles.photo}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <ThemedText style={styles.name}>{practitioner.name}</ThemedText>
        <ThemedText style={styles.category}>{practitioner.category}</ThemedText>
        <View style={styles.ratingRow}>
          <StarFilled size={14} />
          <ThemedText style={styles.rating}>{practitioner.rating.toFixed(1)}</ThemedText>
          <ThemedText style={styles.reviewCount}>({practitioner.reviewCount})</ThemedText>
        </View>
        <ThemedText style={styles.price}>₹{practitioner.pricePerSession}/session</ThemedText>
      </View>
      <View style={styles.chevronContainer}>
        <Feather name="chevron-right" size={20} color={Colors.light.textSecondary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  rating: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.text,
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginLeft: 2,
  },
  price: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.accent,
  },
  chevronContainer: {
    marginLeft: Spacing.sm,
  },
});
