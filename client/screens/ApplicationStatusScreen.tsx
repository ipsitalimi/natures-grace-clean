import React, { useCallback, useState } from "react";
import { StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import ApplicationProgressTracker from "@/components/ApplicationProgressTracker";
import { PageLayout } from "@/components/layout";
import { LayoutSpacing } from "@/constants/layout";
import { Colors, BorderRadius } from "@/constants/theme";
import type { RoleApplication } from "@/data/roleApplications";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { fetchMyRoleApplications } from "@/services/platform/roleApplicationsService";

export default function ApplicationStatusScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [apps, setApps] = useState<RoleApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchMyRoleApplications();
      setApps(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load applications");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const latest = apps[0];

  const handleReapply = () => {
    if (!latest) return;
    if (latest.targetRole === "Practitioner") {
      navigation.navigate("PractitionerApplication" as never);
    } else {
      navigation.navigate("SellerApplication" as never);
    }
  };

  return (
    <PageLayout
      title="Application Status"
      titleInHeader
      header="back"
      contentContainerStyle={styles.content}
    >
      {loading ? (
        <ActivityIndicator color={Colors.light.accent} style={styles.loader} />
      ) : error ? (
        <Pressable onPress={() => void load()}>
          <ThemedText style={styles.errorText}>{error} — tap to retry</ThemedText>
        </Pressable>
      ) : !latest ? (
        <ThemedText style={styles.emptyText}>
          You have not submitted a practitioner or seller application yet.
        </ThemedText>
      ) : (
        <>
          <ThemedText style={styles.roleLabel}>{latest.targetRole} Application</ThemedText>
          <ThemedText style={styles.submitted}>
            Submitted {new Date(latest.createdAt).toLocaleDateString()}
          </ThemedText>

          <ApplicationProgressTracker
            stage={latest.progressStage}
            rejectionReason={latest.rejectionReason}
          />

          {latest.status === "Rejected" ? (
            <Pressable style={styles.reapplyBtn} onPress={handleReapply}>
              <ThemedText style={styles.reapplyText}>Update & reapply</ThemedText>
            </Pressable>
          ) : null}

          {latest.status === "Pending" ? (
            <ThemedText style={styles.hint}>
              Reviews typically take 5–7 business days. You'll be notified when there is an update.
            </ThemedText>
          ) : null}
        </>
      )}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: LayoutSpacing.xs,
  },
  loader: { marginTop: 40 },
  roleLabel: { fontSize: 20, fontWeight: "600", color: Colors.light.text },
  submitted: { fontSize: 13, color: Colors.light.textMuted, marginBottom: LayoutSpacing.lg },
  hint: { fontSize: 13, color: Colors.light.textMuted, marginTop: LayoutSpacing.lg, lineHeight: 18 },
  emptyText: { fontSize: 14, color: Colors.light.textMuted, textAlign: "center", marginTop: 40 },
  errorText: { color: "#8B3A3A", textAlign: "center", marginTop: 40 },
  reapplyBtn: {
    marginTop: LayoutSpacing.lg,
    backgroundColor: Colors.light.accent,
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  reapplyText: { color: "#fff", fontWeight: "600" },
});
