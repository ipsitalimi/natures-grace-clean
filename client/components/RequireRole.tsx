import React, { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth, homeRouteForRole } from "@/context/AuthContext";
import type { UserRole } from "@/types/database";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Colors } from "@/constants/theme";

type Props = {
  role: UserRole;
  children: React.ReactNode;
};

export default function RequireRole({ role, children }: Props) {
  const { profile, session, loading, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    if (loading) return;

    if (!session || !profile) {
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      return;
    }

    const blockedStatus = profile.status as string;
    if (
      blockedStatus === "Suspended" ||
      blockedStatus === "Deletion Requested" ||
      blockedStatus === "Deleted"
    ) {
      void signOut();
      return;
    }

    if (profile.role !== role) {
      navigation.reset({
        index: 0,
        routes: [{ name: homeRouteForRole(profile.role) }],
      });
    }
  }, [loading, session, profile, role, navigation, signOut]);

  const blockedProfile = ["Suspended", "Deletion Requested", "Deleted"].includes(
    (profile?.status as string | undefined) ?? ""
  );

  if (loading || !session || !profile || profile.role !== role || blockedProfile) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundRoot,
  },
});

export function withRequireRole<P extends object>(
  Component: React.ComponentType<P>,
  role: UserRole
): React.ComponentType<P> {
  return function GuardedScreen(props: P) {
    return (
      <RequireRole role={role}>
        <Component {...props} />
      </RequireRole>
    );
  };
}
