import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { isBankAccountLinked } from "@/lib/payoutDisclosure";

type Props = {
  bankAccountLabel: string;
  onSave: (input: {
    accountHolder: string;
    bankName: string;
    last4: string;
  }) => Promise<{ error?: string }>;
};

export default function BankDetailsCard({ bankAccountLabel, onSave }: Props) {
  const linked = isBankAccountLinked(bankAccountLabel);
  const [editing, setEditing] = useState(!linked);
  const [accountHolder, setAccountHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [last4, setLast4] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await onSave({ accountHolder, bankName, last4 });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Feather name="credit-card" size={16} color={Colors.light.accent} />
        <ThemedText style={styles.title}>Payout bank account</ThemedText>
      </View>

      {linked && !editing ? (
        <>
          <ThemedText style={styles.linkedLabel}>{bankAccountLabel}</ThemedText>
          <ThemedText style={styles.hint}>
            Withdrawals use this account after admin verification.
          </ThemedText>
          <Pressable style={styles.linkBtn} onPress={() => setEditing(true)}>
            <ThemedText style={styles.linkBtnText}>Update bank details</ThemedText>
          </Pressable>
        </>
      ) : (
        <>
          <ThemedText style={styles.hint}>
            Enter your payout account details. These are stored securely and verified before
            withdrawals are processed.
          </ThemedText>
          <ThemedText style={styles.fieldLabel}>Account holder name</ThemedText>
          <TextInput
            style={styles.input}
            value={accountHolder}
            onChangeText={setAccountHolder}
            placeholder="Name as on bank account"
            placeholderTextColor={Colors.light.textMuted}
            autoCapitalize="words"
          />
          <ThemedText style={styles.fieldLabel}>Bank name</ThemedText>
          <TextInput
            style={styles.input}
            value={bankName}
            onChangeText={setBankName}
            placeholder="e.g. HDFC Bank"
            placeholderTextColor={Colors.light.textMuted}
          />
          <ThemedText style={styles.fieldLabel}>Last 4 digits</ThemedText>
          <TextInput
            style={styles.input}
            value={last4}
            onChangeText={(v) => setLast4(v.replace(/\D/g, "").slice(0, 4))}
            placeholder="1234"
            placeholderTextColor={Colors.light.textMuted}
            keyboardType="number-pad"
            maxLength={4}
          />
          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
          <Pressable
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={() => void handleSave()}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.saveBtnText}>Save bank details</ThemedText>
            )}
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  linkedLabel: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  hint: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginTop: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.divider,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    backgroundColor: Colors.light.backgroundRoot,
  },
  saveBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.light.accent,
    borderRadius: BorderRadius.full,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  linkBtn: {
    alignSelf: "flex-start",
    marginTop: Spacing.xs,
  },
  linkBtnText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#8B3A3A",
  },
});
