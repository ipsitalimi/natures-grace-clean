import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import type { LocalFile } from "@/lib/storageUpload";

type Props = {
  files: LocalFile[];
  onChange: (files: LocalFile[]) => void;
  disabled?: boolean;
  title?: string;
  hint?: string;
};

export default function ApplicationDocumentsSection({
  files,
  onChange,
  disabled = false,
  title = "Supporting documents",
  hint = "Upload ID, certifications, or business registration (PDF or image, max 10 MB each).",
}: Props) {
  const handlePick = async () => {
    if (disabled) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const picked: LocalFile[] = result.assets.map((asset) => ({
      uri: asset.uri,
      name: asset.name ?? "document",
      mimeType: asset.mimeType ?? "application/octet-stream",
    }));
    onChange([...files, ...picked]);
  };

  const removeAt = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Feather name="paperclip" size={18} color={Colors.light.accent} />
        <ThemedText style={styles.title}>{title}</ThemedText>
      </View>
      <ThemedText style={styles.hint}>{hint}</ThemedText>

      {files.map((file, index) => (
        <View key={`${file.uri}-${index}`} style={styles.fileRow}>
          <Feather name="file" size={16} color={Colors.light.accent} />
          <ThemedText style={styles.fileName} numberOfLines={1}>
            {file.name}
          </ThemedText>
          <Pressable
            onPress={() => removeAt(index)}
            disabled={disabled}
            hitSlop={8}
            testID={`button-remove-doc-${index}`}
          >
            <Feather name="x" size={18} color={Colors.light.textMuted} />
          </Pressable>
        </View>
      ))}

      <Pressable
        style={[styles.addButton, disabled && styles.addButtonDisabled]}
        onPress={() => void handlePick()}
        disabled={disabled}
        testID="button-pick-application-documents"
      >
        <Feather name="upload" size={16} color={Colors.light.accent} />
        <ThemedText style={styles.addButtonText}>
          {files.length ? "Add more documents" : "Upload documents"}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  hint: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginBottom: Spacing.md,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: 12,
    borderStyle: "dashed",
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
});
