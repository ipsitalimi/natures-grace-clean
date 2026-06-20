import React, { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import ApplicationProgressTracker from "@/components/ApplicationProgressTracker";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import type { RoleApplication } from "@/data/roleApplications";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { fetchMyRoleApplications } from "@/services/platform/roleApplicationsService";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";

export default function ApplicationStatusScreen() {
  const insets = useSafeAreaInsets();
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
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Application Status</ThemedText>
        <View style={styles.headerIconButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: getScrollBottomPadding(insets.bottom, 24) },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.light.accent} style={{ marginTop: 40 }} />
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
            <ThemedText style={styles.roleLabel}>
              {latest.targetRole} Application
            </ThemedText>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundRoot },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: 8,
  },
  headerIconButton: { padding: 8, width: 40 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    color: Colors.light.accent,
  },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  roleLabel: { fontSize: 20, fontWeight: "600", color: Colors.light.text },
  submitted: { fontSize: 13, color: Colors.light.textMuted, marginBottom: Spacing.lg },
  hint: { fontSize: 13, color: Colors.light.textMuted, marginTop: Spacing.lg, lineHeight: 18 },
  emptyText: { fontSize: 14, color: Colors.light.textMuted, textAlign: "center", marginTop: 40 },
  errorText: { color: "#8B3A3A", textAlign: "center", marginTop: 40 },
  reapplyBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.light.accent,
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  reapplyText: { color: "#fff", fontWeight: "600" },
});
