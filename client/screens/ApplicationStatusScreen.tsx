import React, { useCallback, useState } from "react";
import { StyleSheet, Pressable, ActivityIndicator, View } from "react-native";
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

  const handleReapply = (targetRole: RoleApplication["targetRole"]) => {
    if (targetRole === "Practitioner") navigation.navigate("PractitionerApplication" as never);
    else navigation.navigate("SellerApplication" as never);
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
      ) : apps.length === 0 ? (
        <ThemedText style={styles.emptyText}>
          You have not submitted a practitioner or seller application yet.
        </ThemedText>
      ) : (
        <>
          {apps.map((application) => (
            <View key={application.id} style={styles.applicationCard}>
              <ThemedText style={styles.roleLabel}>{application.formData.applicationType === "additional_category" ? "Additional Category Request" : application.formData.applicationType === "product_limit_increase" ? "Product Limit Request" : `${application.targetRole} Application`}</ThemedText>
              <ThemedText style={styles.submitted}>
                Submitted {new Date(application.createdAt).toLocaleDateString()}
              </ThemedText>
              <ApplicationProgressTracker
                stage={application.progressStage}
                rejectionReason={application.rejectionReason}
              />
              {application.status === "Rejected" ? (
                <Pressable style={styles.reapplyBtn} onPress={() => handleReapply(application.targetRole)}>
                  <ThemedText style={styles.reapplyText}>Update & reapply</ThemedText>
                </Pressable>
              ) : null}
              {application.status === "Pending" ? (
                <ThemedText style={styles.hint}>
                  Reviews typically take 5–7 business days. You'll be notified when there is an update.
                </ThemedText>
              ) : null}
            </View>
          ))}
        </>
      )}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  applicationCard: { backgroundColor: Colors.light.cardBackground, borderRadius: BorderRadius.md, padding: 16, marginBottom: 16 },
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
