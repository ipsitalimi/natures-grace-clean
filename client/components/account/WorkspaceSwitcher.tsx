import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";

export default function WorkspaceSwitcher({ inline = false }: { inline?: boolean }) {
  const {
    session,
    profile,
    workspaces,
    activeWorkspaceProfileId,
    refreshWorkspaces,
    switchWorkspace,
  } = useAuth();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) void refreshWorkspaces();
  }, [session?.user?.id, session?.access_token, refreshWorkspaces]);

  const activeWorkspace = useMemo(
    () => workspaces.find((item) => item.workspace_profile_id === (activeWorkspaceProfileId ?? profile?.id)),
    [workspaces, activeWorkspaceProfileId, profile?.id]
  );

  if (!session || workspaces.length < 2 || (inline && profile?.role !== "Admin") || (!inline && profile?.role === "Admin")) return null;

  const openSwitcher = async () => {
    setVisible(true);
    setError(null);
    setLoading(true);
    await refreshWorkspaces();
    setLoading(false);
  };

  const chooseWorkspace = async (profileId: string) => {
    if (profileId === (activeWorkspaceProfileId ?? profile?.id)) {
      setVisible(false);
      return;
    }
    setSwitchingId(profileId);
    setError(null);
    const result = await switchWorkspace(profileId);
    setSwitchingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setVisible(false);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Switch account workspace"
        onPress={openSwitcher}
        style={inline ? styles.inlineAvatarButton : styles.floatingButton}
      >
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>A</Text>
        </View>
        <Text style={styles.avatarChevron}>⌄</Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.heading}>Switch workspace</Text>
                <Text style={styles.subheading}>Choose which part of Nature’s Grace to open</Text>
              </View>
              <Pressable onPress={() => setVisible(false)} hitSlop={12}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>

            {loading ? (
              <ActivityIndicator style={styles.loader} color="#245B43" />
            ) : (
              workspaces.map((workspace) => {
                const selected = workspace.workspace_profile_id === (activeWorkspaceProfileId ?? profile?.id);
                const disabled = !workspace.available || Boolean(switchingId);
                return (
                  <Pressable
                    key={workspace.id}
                    onPress={() => void chooseWorkspace(workspace.workspace_profile_id)}
                    disabled={disabled}
                    style={[styles.option, selected && styles.optionSelected, disabled && !selected && styles.optionDisabled]}
                  >
                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle}>{workspace.display_name}</Text>
                      <Text style={styles.optionRole}>{workspace.workspace_role}</Text>
                      {!workspace.available ? <Text style={styles.unavailable}>Not currently available</Text> : null}
                    </View>
                    {switchingId === workspace.workspace_profile_id ? (
                      <ActivityIndicator color="#245B43" />
                    ) : selected ? (
                      <Text style={styles.active}>ACTIVE</Text>
                    ) : null}
                  </Pressable>
                );
              })
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Text style={styles.footer}>Your workspaces keep their own profiles and records.</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    top: 48,
    right: 12,
    zIndex: 1000,
    maxWidth: 172,
    minWidth: 112,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#173F31",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  inlineAvatarButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 3, minWidth: 38, minHeight: 38 },
  avatarCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(1, 50, 32, 0.1)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#013220", fontSize: 13, fontWeight: "700" },
  avatarChevron: { color: "#013220", fontSize: 13, fontWeight: "700", marginLeft: -3, marginTop: 11 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.48)", justifyContent: "center", padding: 22 },
  sheet: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 20, maxWidth: 480, width: "100%", alignSelf: "center" },
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 },
  heading: { color: "#183D30", fontSize: 19, fontWeight: "700" },
  subheading: { color: "#65766D", fontSize: 12, marginTop: 5 },
  close: { color: "#53645B", fontSize: 20, paddingHorizontal: 4 },
  loader: { marginVertical: 28 },
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#E1E8E3", borderRadius: 12, padding: 14, marginBottom: 9 },
  optionSelected: { borderColor: "#397A5A", backgroundColor: "#F0F6F1" },
  optionDisabled: { opacity: 0.48 },
  optionText: { flex: 1 },
  optionTitle: { color: "#203D30", fontSize: 14, fontWeight: "700" },
  optionRole: { color: "#718078", fontSize: 11, marginTop: 3 },
  unavailable: { color: "#9A5B3A", fontSize: 10, marginTop: 4 },
  active: { color: "#2E704F", fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  error: { color: "#B33B32", fontSize: 12, marginTop: 8 },
  footer: { color: "#78877F", fontSize: 10, marginTop: 10, lineHeight: 15 },
});
