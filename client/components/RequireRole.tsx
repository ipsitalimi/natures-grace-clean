import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth, homeRouteForRole } from "@/context/AuthContext";
import type { UserRole } from "@/types/database";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Colors } from "@/constants/theme";
import { getSupabase } from "@/lib/supabase";
import { resolvePractitionerId } from "@/services/content/practitionerId";
import { resolveSellerIdByProfileId } from "@/services/commerce/sellerId";

type Props = {
  role: UserRole;
  children: React.ReactNode;
};

export default function RequireRole({ role, children }: Props) {
  const { profile, session, loading, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [roleAuthorized, setRoleAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!session || !profile) {
      setRoleAuthorized(false);
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      return;
    }

    let cancelled = false;
    const verifyRoleAccess = async () => {
      if (profile.role === role) {
        if (!cancelled) setRoleAuthorized(true);
        return;
      }
      let hasRoleProfile = false;
      const supabase = getSupabase();
      if (role === "Practitioner") {
        const practitionerId = await resolvePractitionerId(profile.id);
        if (supabase && practitionerId) {
          const { data } = await supabase
            .from("practitioners")
            .select("id")
            .eq("id", practitionerId)
            .eq("is_active", true)
            .maybeSingle();
          hasRoleProfile = Boolean(data);
        }
      } else if (role === "Seller") {
        const sellerId = await resolveSellerIdByProfileId(profile.id);
        if (supabase && sellerId) {
          const { data } = await supabase
            .from("sellers")
            .select("id")
            .eq("id", sellerId)
            .eq("is_active", true)
            .maybeSingle();
          hasRoleProfile = Boolean(data);
        }
      }
      if (cancelled) return;
      setRoleAuthorized(hasRoleProfile);
      if (!hasRoleProfile) {
        navigation.reset({
          index: 0,
          routes: [{ name: homeRouteForRole(profile.role) }],
        });
      }
    };
    void verifyRoleAccess();

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
    return () => { cancelled = true; };
  }, [loading, session, profile, role, navigation, signOut]);

  const blockedProfile = ["Suspended", "Deletion Requested", "Deleted"].includes(
    (profile?.status as string | undefined) ?? ""
  );

  if (loading || !session || !profile || !roleAuthorized || blockedProfile) {
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
