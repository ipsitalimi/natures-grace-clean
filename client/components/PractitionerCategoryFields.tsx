import React, { useMemo } from "react";
import { View, StyleSheet, Pressable } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { getCategoryNames, getSubcategoryNamesForCategory } from "@/data/practitioners";

type PractitionerCategoryFieldsProps = {
  category: string;
  subcategories: string[];
  onCategoryChange: (category: string) => void;
  onSubcategoriesChange: (subcategories: string[]) => void;
  categoryLabel?: string;
  subcategoryLabel?: string;
  required?: boolean;
  showSingleApplicationHint?: boolean;
};

export default function PractitionerCategoryFields({
  category,
  subcategories,
  onCategoryChange,
  onSubcategoriesChange,
  categoryLabel = "Practice Category",
  subcategoryLabel = "Services / Subcategories",
  required = true,
  showSingleApplicationHint = false,
}: PractitionerCategoryFieldsProps) {
  const categoryNames = useMemo(() => getCategoryNames(), []);
  const subcategoryNames = useMemo(
    () => (category ? getSubcategoryNamesForCategory(category) : []),
    [category]
  );

  const handleCategoryChange = (next: string) => {
    if (category === next) return;
    onCategoryChange(next);
    onSubcategoriesChange([]);
  };

  const toggleSubcategory = (name: string) => {
    if (subcategories.includes(name)) {
      onSubcategoriesChange(subcategories.filter((s) => s !== name));
    } else {
      onSubcategoriesChange([...subcategories, name]);
    }
  };

  return (
    <>
      {showSingleApplicationHint ? (
        <ThemedText style={styles.hint}>
          Each application covers one practice category. Select all services you offer within that
          category. Submit a separate application for each additional category.
        </ThemedText>
      ) : null}

      <ThemedText style={styles.label}>
        {categoryLabel}
        {required ? " *" : ""}
        <ThemedText style={styles.labelHint}> (choose one)</ThemedText>
      </ThemedText>
      <View style={styles.chips}>
        {categoryNames.map((name) => (
          <Pressable
            key={name}
            style={[styles.chip, category === name && styles.chipSelected]}
            onPress={() => handleCategoryChange(name)}
            accessibilityRole="radio"
            accessibilityState={{ selected: category === name }}
            testID={`chip-category-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
          >
            <ThemedText style={[styles.chipText, category === name && styles.chipTextSelected]}>
              {name}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {category ? (
        <>
          <ThemedText style={styles.label}>
            {subcategoryLabel}
            {required ? " *" : ""}
            <ThemedText style={styles.labelHint}> (choose one or more)</ThemedText>
          </ThemedText>
          <View style={styles.chips}>
            {subcategoryNames.map((name) => {
              const selected = subcategories.includes(name);
              return (
                <Pressable
                  key={name}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => toggleSubcategory(name)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ selected }}
                  testID={`chip-subcategory-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                >
                  <ThemedText style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          {required && subcategories.length === 0 ? (
            <ThemedText style={styles.validationHint}>
              Select at least one service in {category}.
            </ThemedText>
          ) : null}
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    lineHeight: 19,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  labelHint: {
    fontSize: 13,
    fontWeight: "400",
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  validationHint: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginTop: Spacing.xs,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    backgroundColor: Colors.light.cardBackground,
  },
  chipSelected: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
});
