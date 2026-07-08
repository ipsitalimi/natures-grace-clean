import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View, StyleSheet, Image } from "react-native";
import { NavigationContainerRef } from "@react-navigation/native";

import RootStackNavigator, { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useAuth, homeRouteForRole } from "@/context/AuthContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { isAuthCallbackUrl, readAuthCallbackUrl } from "@/lib/authSessionFromUrl";
import { clearPractitionerIdCache } from "@/services/content/practitionerId";
import {
  fetchSellerStorefrontByProfileId,
  isSellerOnboardingComplete,
} from "@/services/commerce/sellerStorefrontService";
import {
  fetchPractitionerOnboardingState,
  isPractitionerOnboardingComplete,
} from "@/services/content/practitionerOnboardingService";
import {
  fetchLegalVersions,
  getPendingUserLegalKeys,
  parseProfileLegalAcceptance,
} from "@/services/legal/legalAcceptanceService";
import { DEFAULT_LEGAL_VERSIONS, type LegalVersions } from "@/types/legal";
import { Colors } from "@/constants/theme";
import appLogo from "../../assets/images/natures-grace-logo.png";
import type { UserRole } from "@/types/database";

type Props = {
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>;
};

const AUTH_FLOW_ROUTES = new Set<keyof RootStackParamList | string>([
  "Login",
  "Signup",
  "SignupLegal",
  "VerifyEmail",
  "AuthCallback",
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
    justVerifiedEmail,
    consumeJustVerifiedEmail,
    authCallbackError,
  } = useAuth();
  const { configLoading, syncSessionFromProfile, clearSession, refreshRemoteConfig } =
    usePlatformConfig();
  const restoredRef = useRef(false);
  const lastRoleRef = useRef<UserRole | null>(null);
  const [legalVersions, setLegalVersions] = useState<LegalVersions | null>(null);
  const [sellerOnboardingPending, setSellerOnboardingPending] = useState<boolean | null>(null);
  const [practitionerOnboardingPending, setPractitionerOnboardingPending] = useState<boolean | null>(
    null
  );

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

  const practitionerHomeRoute = useMemo((): keyof RootStackParamList => {
    if (profile?.role !== "Practitioner") return "PractitionerMain";
    if (practitionerOnboardingPending === true) return "PractitionerOnboarding";
    return "PractitionerMain";
  }, [profile?.role, practitionerOnboardingPending]);

  useEffect(() => {
    if (!isConfigured || !session?.user?.id || profile?.role !== "Seller") {
      setSellerOnboardingPending(null);
      return;
    }

    let cancelled = false;

    void fetchSellerStorefrontByProfileId(session.user.id).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        return;
      }
      setSellerOnboardingPending(!isSellerOnboardingComplete(res.storefront.settings));
    });

    return () => {
      cancelled = true;
    };
  }, [isConfigured, session?.user?.id, profile?.role]);

  useEffect(() => {
    if (!isConfigured || !session?.user?.id || profile?.role !== "Practitioner") {
      setPractitionerOnboardingPending(null);
      return;
    }

    let cancelled = false;

    void fetchPractitionerOnboardingState(session.user.id).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        return;
      }
      setPractitionerOnboardingPending(!isPractitionerOnboardingComplete(res.state));
    });

    return () => {
      cancelled = true;
    };
  }, [isConfigured, session?.user?.id, profile?.role]);

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

    const callbackUrl =
      typeof window !== "undefined" ? readAuthCallbackUrl() : null;
    const onAuthCallbackRoute =
      isAuthCallbackUrl(callbackUrl ?? "") &&
      navigationRef.current.getCurrentRoute()?.name !== "AuthCallback";

    if (onAuthCallbackRoute && (authLoading || !session)) {
      navigationRef.current.reset({ index: 0, routes: [{ name: "AuthCallback" }] });
      return;
    }

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
        currentRoute === "LegalReacceptance" ||
        currentRoute === "SignupLegal" ||
        currentRoute === "AuthCallback";
      if (!allowedDuringLegal) {
        navigationRef.current.reset({ index: 0, routes: [{ name: "LegalReacceptance" }] });
      }
      if (justVerifiedEmail) consumeJustVerifiedEmail();
      return;
    }

    const profileNeedsCompletion =
      justVerifiedEmail && !profile.full_name?.trim();

    if (profileNeedsCompletion) {
      const currentRoute = navigationRef.current.getCurrentRoute()?.name;
      if (currentRoute !== "EditProfile") {
        navigationRef.current.reset({ index: 0, routes: [{ name: "EditProfile" }] });
      }
      return;
    }

    if (justVerifiedEmail) {
      consumeJustVerifiedEmail();
    }

    if (profile.role === "Seller" && sellerOnboardingPending === null) {
      return;
    }

    if (profile.role === "Practitioner" && practitionerOnboardingPending === null) {
      return;
    }

    const homeRoute =
      profile.role === "Seller"
        ? sellerHomeRoute
        : profile.role === "Practitioner"
          ? practitionerHomeRoute
          : homeRouteForRole(profile.role);

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

    if (currentRoute === "PractitionerOnboarding" && practitionerOnboardingPending === false) {
      navigationRef.current.reset({
        index: 0,
        routes: [{ name: "PractitionerMain" }],
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

    if (
      profile.role === "Practitioner" &&
      practitionerOnboardingPending === false &&
      currentRoute === "PractitionerOnboarding"
    ) {
      navigationRef.current.reset({ index: 0, routes: [{ name: "PractitionerMain" }] });
    }
  }, [
    isConfigured,
    bootLoading,
    needsLegalReacceptance,
    sellerOnboardingPending,
    practitionerOnboardingPending,
    sellerHomeRoute,
    practitionerHomeRoute,
    session,
    profile,
    pendingPasswordRecovery,
    authCallbackError,
    justVerifiedEmail,
    consumeJustVerifiedEmail,
    authLoading,
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
        <Image source={appLogo} style={styles.bootLogo} resizeMode="contain" />
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
  bootLogo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 24,
  },
});
