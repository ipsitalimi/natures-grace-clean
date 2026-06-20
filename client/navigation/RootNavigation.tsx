import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { NavigationContainerRef } from "@react-navigation/native";

import RootStackNavigator, { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useAuth, homeRouteForRole } from "@/context/AuthContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { clearPractitionerIdCache } from "@/services/content/practitionerId";
import {
  fetchSellerStorefrontByProfileId,
  isSellerOnboardingComplete,
} from "@/services/commerce/sellerStorefrontService";
import {
  fetchLegalVersions,
  getPendingUserLegalKeys,
  parseProfileLegalAcceptance,
} from "@/services/legal/legalAcceptanceService";
import { DEFAULT_LEGAL_VERSIONS, type LegalVersions } from "@/types/legal";
import { Colors } from "@/constants/theme";
import type { UserRole } from "@/types/database";

type Props = {
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>;
};

const AUTH_FLOW_ROUTES = new Set<keyof RootStackParamList | string>([
  "Login",
  "Signup",
  "SignupLegal",
  "ForgotPassword",
]);

export default function RootNavigation({ navigationRef }: Props) {
  const {
    loading: authLoading,
    session,
    profile,
    isConfigured,
    refreshProfile,
    pendingPasswordRecovery,
  } = useAuth();
  const { configLoading, syncSessionFromProfile, clearSession, refreshRemoteConfig } =
    usePlatformConfig();
  const restoredRef = useRef(false);
  const lastRoleRef = useRef<UserRole | null>(null);
  const [legalVersions, setLegalVersions] = useState<LegalVersions | null>(null);
  const [sellerOnboardingPending, setSellerOnboardingPending] = useState<boolean | null>(null);

  const bootLoading = isConfigured && (authLoading || configLoading);

  const pendingUserLegalKeys = useMemo(() => {
    if (!profile) return [];
    const versions = legalVersions ?? DEFAULT_LEGAL_VERSIONS;
    return getPendingUserLegalKeys(parseProfileLegalAcceptance(profile), versions);
  }, [profile, legalVersions]);

  const needsLegalReacceptance = pendingUserLegalKeys.length > 0;

  const sellerHomeRoute = useMemo((): keyof RootStackParamList => {
    if (profile?.role !== "Seller") return "SellerMain";
    if (sellerOnboardingPending === true) return "SellerOnboarding";
    return "SellerMain";
  }, [profile?.role, sellerOnboardingPending]);

  useEffect(() => {
    if (!isConfigured || !session?.user?.id || profile?.role !== "Seller") {
      setSellerOnboardingPending(null);
      return;
    }

    let cancelled = false;

    const refreshOnboarding = () => {
      void fetchSellerStorefrontByProfileId(session.user.id).then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setSellerOnboardingPending(true);
          return;
        }
        setSellerOnboardingPending(!isSellerOnboardingComplete(res.storefront.settings));
      });
    };

    refreshOnboarding();

    const unsubscribe = navigationRef.current?.addListener("state", refreshOnboarding);

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [isConfigured, session?.user?.id, profile?.role, navigationRef]);

  useEffect(() => {
    if (!isConfigured || !session?.user?.id || !profile) {
      setLegalVersions(null);
      return;
    }

    let cancelled = false;
    void fetchLegalVersions().then((versions) => {
      if (!cancelled) {
        setLegalVersions(versions);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isConfigured, session?.user?.id, profile?.id, profile?.updated_at]);

  useEffect(() => {
    if (!isConfigured || bootLoading || !navigationRef.current) return;

    if (!session || !profile) {
      if (restoredRef.current) {
        restoredRef.current = false;
        lastRoleRef.current = null;
      }
      clearSession();
      const currentRoute = navigationRef.current.getCurrentRoute()?.name;
      if (currentRoute && !AUTH_FLOW_ROUTES.has(currentRoute)) {
        navigationRef.current.reset({ index: 0, routes: [{ name: "Login" }] });
      }
      return;
    }

    syncSessionFromProfile(profile);

    if (pendingPasswordRecovery) {
      const currentRoute = navigationRef.current.getCurrentRoute()?.name;
      if (currentRoute !== "ChangePassword") {
        navigationRef.current.reset({ index: 0, routes: [{ name: "ChangePassword" }] });
      }
      return;
    }

    if (needsLegalReacceptance) {
      const currentRoute = navigationRef.current.getCurrentRoute()?.name;
      const allowedDuringLegal =
        currentRoute === "LegalReacceptance" || currentRoute === "SignupLegal";
      if (!allowedDuringLegal) {
        navigationRef.current.reset({ index: 0, routes: [{ name: "LegalReacceptance" }] });
      }
      return;
    }

    if (profile.role === "Seller" && sellerOnboardingPending === null) {
      return;
    }

    if (profile.role === "Seller" && sellerOnboardingPending === true) {
      const currentRoute = navigationRef.current.getCurrentRoute()?.name;
      if (currentRoute !== "SellerOnboarding") {
        navigationRef.current.reset({ index: 0, routes: [{ name: "SellerOnboarding" }] });
      }
      return;
    }

    const homeRoute =
      profile.role === "Seller" ? sellerHomeRoute : homeRouteForRole(profile.role);

    const currentRoute = navigationRef.current.getCurrentRoute()?.name;
    if (currentRoute === "LegalReacceptance") {
      navigationRef.current.reset({
        index: 0,
        routes: [{ name: homeRoute }],
      });
      restoredRef.current = true;
      lastRoleRef.current = profile.role;
      return;
    }

    if (currentRoute === "SellerOnboarding" && sellerOnboardingPending === false) {
      navigationRef.current.reset({
        index: 0,
        routes: [{ name: "SellerMain" }],
      });
      restoredRef.current = true;
      lastRoleRef.current = profile.role;
      return;
    }

    if (!restoredRef.current) {
      restoredRef.current = true;
      lastRoleRef.current = profile.role;
      navigationRef.current.reset({ index: 0, routes: [{ name: homeRoute }] });
      return;
    }

    if (lastRoleRef.current !== profile.role) {
      lastRoleRef.current = profile.role;
      clearPractitionerIdCache();
      navigationRef.current.reset({ index: 0, routes: [{ name: homeRoute }] });
      return;
    }

    if (
      profile.role === "Seller" &&
      sellerOnboardingPending === false &&
      currentRoute === "SellerOnboarding"
    ) {
      navigationRef.current.reset({ index: 0, routes: [{ name: "SellerMain" }] });
    }
  }, [
    isConfigured,
    bootLoading,
    needsLegalReacceptance,
    sellerOnboardingPending,
    sellerHomeRoute,
    session,
    profile,
    pendingPasswordRecovery,
    navigationRef,
    syncSessionFromProfile,
    clearSession,
  ]);

  useEffect(() => {
    if (!isConfigured || !pendingPasswordRecovery || !session || !profile || !navigationRef.current) {
      return;
    }

    const unsubscribe = navigationRef.current.addListener("state", () => {
      const route = navigationRef.current?.getCurrentRoute()?.name;
      if (route && route !== "ChangePassword") {
        navigationRef.current?.reset({ index: 0, routes: [{ name: "ChangePassword" }] });
      }
    });

    return unsubscribe;
  }, [isConfigured, pendingPasswordRecovery, session, profile, navigationRef]);

  useEffect(() => {
    if (!isConfigured || !needsLegalReacceptance || !session || !profile || !navigationRef.current) {
      return;
    }

    const unsubscribe = navigationRef.current.addListener("state", () => {
      const route = navigationRef.current?.getCurrentRoute()?.name;
      const allowed = route === "LegalReacceptance" || route === "SignupLegal";
      if (route && !allowed) {
        navigationRef.current?.reset({ index: 0, routes: [{ name: "LegalReacceptance" }] });
      }
    });

    return unsubscribe;
  }, [isConfigured, needsLegalReacceptance, session, profile, navigationRef]);

  useEffect(() => {
    if (!isConfigured || authLoading || !session?.user?.id || !profile) return;
    if (profile.role === "Admin") {
      void refreshRemoteConfig({ includeProfiles: true });
    }
  }, [isConfigured, authLoading, session?.user?.id, profile?.role, refreshRemoteConfig]);

  useEffect(() => {
    if (!isConfigured || !session?.user?.id) return;

    const interval = setInterval(() => {
      void refreshProfile();
    }, 60_000);

    return () => clearInterval(interval);
  }, [isConfigured, session?.user?.id, refreshProfile]);

  if (bootLoading) {
    return (
      <View style={styles.boot} testID="auth-boot-loader">
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </View>
    );
  }

  return <RootStackNavigator />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundRoot,
  },
});
