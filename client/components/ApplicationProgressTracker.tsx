import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing } from "@/constants/theme";

export type ApplicationProgressStage =
  | "submitted"
  | "documents_received"
  | "under_review"
  | "verification"
  | "approved"
  | "rejected";

const STAGES: { key: ApplicationProgressStage; label: string }[] = [
  { key: "submitted", label: "Submitted" },
  { key: "documents_received", label: "Documents Received" },
  { key: "under_review", label: "Under Review" },
  { key: "verification", label: "Verification" },
  { key: "approved", label: "Approved" },
];

const STAGE_ORDER: ApplicationProgressStage[] = [
  "submitted",
  "documents_received",
  "under_review",
  "verification",
  "approved",
];

function stageIndex(stage: ApplicationProgressStage): number {
  if (stage === "rejected") return -1;
  return STAGE_ORDER.indexOf(stage);
}

export default function ApplicationProgressTracker({
  stage,
  rejectionReason,
}: {
  stage: ApplicationProgressStage;
  rejectionReason?: string | null;
}) {
  if (stage === "rejected") {
    return (
      <View style={styles.rejectedBox}>
        <Feather name="alert-circle" size={20} color="#8B3A3A" />
        <View style={styles.rejectedText}>
          <ThemedText style={styles.rejectedTitle}>Application not approved</ThemedText>
          {rejectionReason ? (
            <ThemedText style={styles.rejectedReason}>{rejectionReason}</ThemedText>
          ) : (
            <ThemedText style={styles.rejectedReason}>
              Please contact support if you need more information.
            </ThemedText>
          )}
        </View>
      </View>
    );
  }

  const current = stageIndex(stage);

  return (
    <View style={styles.container}>
      {STAGES.map((s, i) => {
        const done = i <= current;
        const active = i === current;
        return (
          <View key={s.key} style={styles.stepRow}>
            <View style={styles.stepLeft}>
              <View
                style={[
                  styles.dot,
                  done && styles.dotDone,
                  active && styles.dotActive,
                ]}
              >
                {done ? <Feather name="check" size={12} color="#fff" /> : null}
              </View>
              {i < STAGES.length - 1 ? (
                <View style={[styles.line, done && styles.lineDone]} />
              ) : null}
            </View>
            <ThemedText
              style={[
                styles.stepLabel,
                done && styles.stepLabelDone,
                active && styles.stepLabelActive,
              ]}
            >
              {s.label}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 44,
  },
  stepLeft: {
    alignItems: "center",
    width: 28,
    marginRight: Spacing.md,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.light.divider,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.backgroundRoot,
  },
  dotDone: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
  },
  dotActive: {
    borderColor: Colors.light.accent,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: Colors.light.divider,
    marginVertical: 2,
  },
  lineDone: {
    backgroundColor: Colors.light.accent,
  },
  stepLabel: {
    fontSize: 14,
    color: Colors.light.textMuted,
    paddingTop: 2,
  },
  stepLabelDone: {
    color: Colors.light.text,
  },
  stepLabelActive: {
    fontWeight: "600",
    color: Colors.light.accent,
  },
  rejectedBox: {
    flexDirection: "row",
    gap: Spacing.md,
    backgroundColor: "rgba(139, 58, 58, 0.08)",
    padding: Spacing.lg,
    borderRadius: 8,
  },
  rejectedText: { flex: 1 },
  rejectedTitle: {
    fontWeight: "600",
    color: "#8B3A3A",
    marginBottom: 4,
  },
  rejectedReason: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
});
