import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import * as Linking from "expo-linking";
import type { Session } from "@supabase/supabase-js";

import { getAuthRedirectUrl } from "@/lib/authRedirect";
import { isEmailNotConfirmedError } from "@/lib/authErrors";
import {
  completeAuthSessionFromUrl,
  isAuthCallbackUrl,
  isPasswordRecoveryCallback,
  isSignupConfirmationCallback,
  readAuthCallbackUrl,
  stripAuthParamsFromBrowserUrl,
} from "@/lib/authSessionFromUrl";
import { getSupabase } from "@/lib/supabase";
import { getApiBaseUrl } from "@/lib/apiBase";
import { authJsonHeaders } from "@/lib/apiAuth";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import {
  buildAcceptanceInputs,
  recordLegalAcceptances,
} from "@/services/legal/legalAcceptanceService";
import { fetchProfileByUserId } from "@/services/profileService";
import {
  sendAuthEmailHook,
  sendPasswordResetRequestedHook,
} from "@/services/transactionalHooksApi";
import type { LegalVersions, UserMandatoryLegalKey } from "@/types/legal";
import { registerPushTokenForUser } from "@/services/pushTokenService";
import type { ProfileRow, UserRole } from "@/types/database";

export type AccountWorkspace = {
  id: string;
  workspace_profile_id: string;
  workspace_role: UserRole;
  display_name: string;
  is_default: boolean;
  is_enabled: boolean;
  available: boolean;
};

export type AuthHomeRoute =
  | "Main"
  | "AdminDashboard"
  | "PractitionerMain"
  | "SellerMain"
  | "Login";

export function homeRouteForRole(role: UserRole | "Guest"): AuthHomeRoute {
  switch (role) {
    case "Admin":
      return "AdminDashboard";
    case "Practitioner":
      return "PractitionerMain";
    case "Seller":
      return "SellerMain";
    case "User":
      return "Main";
    default:
      return "Login";
  }
}

interface AuthContextType {
  isConfigured: boolean;
  loading: boolean;
  session: Session | null;
  profile: ProfileRow | null;
  workspaces: AccountWorkspace[];
  activeWorkspaceProfileId: string | null;
  refreshWorkspaces: () => Promise<AccountWorkspace[]>;
  switchWorkspace: (workspaceProfileId: string) => Promise<{ error?: string }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{
    error?: string;
    needsEmailVerification?: boolean;
    email?: string;
    route?: AuthHomeRoute;
    profile?: ProfileRow;
  }>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{
    error?: string;
    needsEmailConfirmation?: boolean;
    route?: AuthHomeRoute;
    profile?: ProfileRow;
  }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  changePassword: (
    newPassword: string,
    currentPassword?: string
  ) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<ProfileRow | null>;
  resendVerificationEmail: (email: string) => Promise<{ error?: string }>;
  setPendingSignupLegal: (
    payload: { keys: UserMandatoryLegalKey[]; versions: LegalVersions } | null
  ) => void;
  markLegalAcceptancesCurrent: (keys: UserMandatoryLegalKey[], versions: LegalVersions) => void;
  pendingPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  emailConfirmedMessage: string | null;
  consumeEmailConfirmedMessage: () => void;
  justVerifiedEmail: boolean;
  consumeJustVerifiedEmail: () => void;
  authCallbackError: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [workspaces, setWorkspaces] = useState<AccountWorkspace[]>([]);
  const [activeWorkspaceProfileId, setActiveWorkspaceProfileId] = useState<string | null>(null);
  const [pendingPasswordRecovery, setPendingPasswordRecovery] = useState(false);
  const [emailConfirmedMessage, setEmailConfirmedMessage] = useState<string | null>(null);
  const [justVerifiedEmail, setJustVerifiedEmail] = useState(false);
  const [authCallbackError, setAuthCallbackError] = useState<string | null>(null);
  const [pendingSignupLegal, setPendingSignupLegalState] = useState<{
    keys: UserMandatoryLegalKey[];
    versions: LegalVersions;
  } | null>(null);
  const profileLoadGeneration = useRef(0);

  const consumeEmailConfirmedMessage = useCallback(() => {
    setEmailConfirmedMessage(null);
  }, []);

  const consumeJustVerifiedEmail = useCallback(() => {
    setJustVerifiedEmail(false);
  }, []);

  const setPendingSignupLegal = useCallback(
    (payload: { keys: UserMandatoryLegalKey[]; versions: LegalVersions } | null) => {
      setPendingSignupLegalState(payload);
    },
    []
  );

  const markLegalAcceptancesCurrent = useCallback(
    (keys: UserMandatoryLegalKey[], versions: LegalVersions) => {
      const columns: Record<UserMandatoryLegalKey, [string, string, string]> = {
        user_terms: ["accepted_user_terms", "accepted_user_terms_version", "accepted_user_terms_timestamp"],
        privacy_policy: ["accepted_privacy_policy", "accepted_privacy_version", "accepted_privacy_timestamp"],
        refund_policy: ["accepted_refund_policy", "accepted_refund_version", "accepted_refund_timestamp"],
        medical_disclaimer: ["accepted_medical_disclaimer", "accepted_medical_version", "accepted_medical_timestamp"],
        account_deletion_policy: ["accepted_account_deletion_policy", "accepted_account_deletion_version", "accepted_account_deletion_timestamp"],
        grievance_policy: ["accepted_grievance_policy", "accepted_grievance_version", "accepted_grievance_timestamp"],
        community_guidelines: ["accepted_community_guidelines", "accepted_community_guidelines_version", "accepted_community_guidelines_timestamp"],
        shipping_policy: ["accepted_shipping_policy", "accepted_shipping_version", "accepted_shipping_timestamp"],
      };
      const acceptedAt = new Date().toISOString();
      setProfile((current) => {
        if (!current) return current;
        const next = { ...current } as ProfileRow & Record<string, unknown>;
        for (const key of keys) {
          const [acceptedColumn, versionColumn, timestampColumn] = columns[key];
          next[acceptedColumn] = true;
          next[versionColumn] = versions[key];
          next[timestampColumn] = acceptedAt;
        }
        return next as ProfileRow;
      });
    },
    []
  );

  const clearPasswordRecovery = useCallback(() => {
    setPendingPasswordRecovery(false);
  }, []);

  const markPasswordRecoveryFromUrl = useCallback((url: string | null | undefined) => {
    if (url && isPasswordRecoveryCallback(url)) {
      setPendingPasswordRecovery(true);
    }
  }, []);

  const loadProfileWithRetry = useCallback(async (userId: string, attempts = 5) => {
    for (let i = 0; i < attempts; i++) {
      const row = await fetchProfileByUserId(userId);
      if (row) return row;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)));
      }
    }
    return null;
  }, []);

  const clearAuthState = useCallback(() => {
    profileLoadGeneration.current += 1;
    setSession(null);
    setProfile(null);
    setWorkspaces([]);
    setActiveWorkspaceProfileId(null);
    setPendingPasswordRecovery(false);
  }, []);

  const loadProfile = useCallback(async (profileId: string) => {
    const generation = ++profileLoadGeneration.current;
    const row = await loadProfileWithRetry(profileId);

    if (generation !== profileLoadGeneration.current) {
      return row;
    }

    if (row) {
      if (
        row.status === "Suspended" ||
        row.status === "Deletion Requested" ||
        row.status === "Deleted"
      ) {
        const supabase = getSupabase();
        if (supabase) {
          await supabase.auth.signOut();
        }
        clearAuthState();
        return null;
      }
      setProfile(row);
      return row;
    }

    // Keep the last known profile for this user when a refetch fails or races.
    setProfile((current) => (current?.id === profileId ? current : null));
    return null;
  }, [loadProfileWithRetry, clearAuthState]);

  const applyPendingSignupLegal = useCallback(
    async (accessToken: string, userId?: string) => {
      if (!pendingSignupLegal) return;
      const recordResult = await recordLegalAcceptances(
        buildAcceptanceInputs(pendingSignupLegal.keys, pendingSignupLegal.versions)
      );
      if (recordResult.ok) {
        setPendingSignupLegalState(null);
        void sendAuthEmailHook("account_created", accessToken);
        if (userId) {
          await loadProfile(userId);
        }
      }
    },
    [pendingSignupLegal, loadProfile]
  );

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const completeAuthUrl = async (url: string) => {
      const result = await completeAuthSessionFromUrl(supabase, url);
      if (result.error) {
        setAuthCallbackError(result.error);
        return result;
      }
      setAuthCallbackError(null);
      if (result.isPasswordRecovery) {
        setPendingPasswordRecovery(true);
      } else if (result.session && !result.isPasswordRecovery) {
        if (isSignupConfirmationCallback(url)) {
          setJustVerifiedEmail(true);
          setEmailConfirmedMessage("Email verified! You're signed in.");
          if (result.session.access_token) {
            void sendAuthEmailHook("email_verified", result.session.access_token);
            void applyPendingSignupLegal(
              result.session.access_token,
              result.session.user?.id
            );
          }
        }
      }
      return result;
    };

    const completeNativeAuthUrl = async (url: string) => {
      if (Platform.OS === "web") return;
      await completeAuthUrl(url);
    };

    const applyAuthSession = async (nextSession: Session | null) => {
      setSession(nextSession);

      if (nextSession?.user?.id) {
        setAuthCallbackError(null);
        const workspaceProfileId = String(nextSession.user.app_metadata?.active_workspace_profile_id ?? nextSession.user.id);
        setActiveWorkspaceProfileId(workspaceProfileId === nextSession.user.id ? null : workspaceProfileId);
        await loadProfile(workspaceProfileId);
        void registerPushTokenForUser(nextSession.user.id);
        return;
      }

      profileLoadGeneration.current += 1;
      setProfile(null);
      setPendingPasswordRecovery(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setPendingPasswordRecovery(true);
      } else if (
        Platform.OS === "web" &&
        (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
        nextSession
      ) {
        const callbackUrl = readAuthCallbackUrl();
        markPasswordRecoveryFromUrl(callbackUrl);
        if (callbackUrl && isSignupConfirmationCallback(callbackUrl)) {
          setJustVerifiedEmail(true);
          setEmailConfirmedMessage("Email verified! You're signed in.");
          if (nextSession.access_token) {
            void sendAuthEmailHook("email_verified", nextSession.access_token);
            void applyPendingSignupLegal(nextSession.access_token, nextSession.user?.id);
          }
        }
      }

      void applyAuthSession(nextSession);

      if (event === "INITIAL_SESSION") {
        setLoading(false);
      }
    });

    let linkingSub: { remove: () => void } | undefined;

    if (Platform.OS !== "web") {
      linkingSub = Linking.addEventListener("url", ({ url }) => {
        void completeNativeAuthUrl(url);
      });
    }

    void (async () => {
      if (Platform.OS === "web") {
        const callbackUrl = readAuthCallbackUrl();
        if (callbackUrl && isAuthCallbackUrl(callbackUrl)) {
          await completeAuthUrl(callbackUrl);
          stripAuthParamsFromBrowserUrl();
        } else {
          markPasswordRecoveryFromUrl(callbackUrl);
        }
      }

      if (Platform.OS !== "web") {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          await completeNativeAuthUrl(initialUrl);
        }
      }

      const { data } = await supabase.auth.getSession();
      await applyAuthSession(data.session ?? null);
      setLoading(false);
    })();

    return () => {
      sub.subscription.unsubscribe();
      linkingSub?.remove();
    };
  }, [loadProfile, markPasswordRecoveryFromUrl, applyPendingSignupLegal]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !session?.user?.id) return;

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        loadProfile(session.user.id);
      }
    });

    return () => sub.remove();
  }, [session?.user?.id, loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const supabase = getSupabase();
      if (!supabase) return { error: "Supabase is not configured" };

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        if (isEmailNotConfirmedError(error.message)) {
          return {
            needsEmailVerification: true,
            email: email.trim().toLowerCase(),
            error: "Please verify your email before signing in.",
          };
        }
        return { error: error.message };
      }

      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        clearAuthState();
        return {
          needsEmailVerification: true,
          email: data.user.email ?? email.trim().toLowerCase(),
          error: "Please verify your email before signing in.",
        };
      }

      if (data.session) {
        setSession(data.session);
      }

      const userId = data.user?.id;
      if (!userId) return { error: "Sign-in succeeded but no user was returned." };

      const activeId = String(data.user?.app_metadata?.active_workspace_profile_id ?? userId);
      setActiveWorkspaceProfileId(activeId === userId ? null : activeId);
      const row = await loadProfile(activeId);
      if (!row) return { error: "Profile not found. Contact support." };
      if (row.status === "Suspended") {
        await supabase.auth.signOut();
        clearAuthState();
        return { error: "This account has been suspended. Contact support." };
      }
      if (row.status === "Deletion Requested" || row.status === "Deleted") {
        await supabase.auth.signOut();
        clearAuthState();
        return { error: "This account is no longer active. Contact support." };
      }

      return { route: homeRouteForRole(row.role), profile: row };
    },
    [loadProfile, clearAuthState]
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      const supabase = getSupabase();
      if (!supabase) return { error: "Supabase is not configured" };

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
          data: { full_name: fullName.trim(), role: "User" },
        },
      });

      // If a previous tap created the Auth user but the UI did not finish,
      // recover by signing in with the same credentials instead of surfacing
      // Supabase's confusing "User already registered" response.
      if (error) {
        const message = error.message.toLowerCase();
        const alreadyRegistered =
          message.includes("already registered") ||
          message.includes("already been registered") ||
          message.includes("user already exists");
        if (!alreadyRegistered) return { error: error.message };

        const recovery = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (recovery.error) {
          if (isEmailNotConfirmedError(recovery.error.message)) {
            return {
              needsEmailConfirmation: true,
              error: "Your account was created. Please verify your email using the link we sent, then sign in.",
            };
          }
          return {
            error: "An account with this email already exists. We couldn't sign in with the password entered. Please use Login or reset your password.",
          };
        }
        data.user = recovery.data.user;
        data.session = recovery.data.session;
      }

      if (!data.session) {
        return {
          needsEmailConfirmation: true,
          error: undefined,
        };
      }

      setSession(data.session);
      if (data.session.access_token) {
        void sendAuthEmailHook("account_created", data.session.access_token);
      }

      const userId = data.user?.id;
      if (!userId) {
        return { error: "Your account was created, but we could not confirm the account details. Please sign in rather than creating it again." };
      }

      // Supabase can return before the database profile trigger has finished.
      // Wait for the profile so the app can route into the new account immediately.
      const row = await loadProfileWithRetry(userId, 12);
      if (!row) {
        return { error: "Your account was created, but your profile is still being prepared. Please wait a moment and sign in; do not create the account again." };
      }
      setProfile(row);
      return { route: homeRouteForRole(row.role), profile: row };
    },
    [loadProfile]
  );

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
    clearAuthState();
  }, [clearAuthState]);

  const resetPassword = useCallback(async (email: string) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Supabase is not configured" };

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: getAuthRedirectUrl(),
    });
    if (error) return { error: error.message };
    void sendPasswordResetRequestedHook(email.trim().toLowerCase());
    return {};
  }, []);

  const changePassword = useCallback(
    async (newPassword: string, currentPassword?: string) => {
      const supabase = getSupabase();
      if (!supabase) return { error: "Supabase is not configured" };

      if (!pendingPasswordRecovery) {
        if (!currentPassword?.trim()) {
          return { error: "Current password is required" };
        }
        const email = session?.user?.email;
        if (!email) return { error: "Not signed in" };

        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });
        if (verifyError) {
          return { error: "Current password is incorrect" };
        }
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { error: error.message };
      setPendingPasswordRecovery(false);
      if (session?.access_token) {
        void sendAuthEmailHook("password_changed", session.access_token);
      }
      return {};
    },
    [pendingPasswordRecovery, session?.user?.email, session?.access_token]
  );

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) return null;
    const supabase = getSupabase();
    const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
    const profileId = String(data.session?.user?.app_metadata?.active_workspace_profile_id ?? session.user.id);
    setActiveWorkspaceProfileId(profileId === session.user.id ? null : profileId);
    return loadProfile(profileId);
  }, [session?.user?.id, loadProfile]);

  const refreshWorkspaces = useCallback(async () => {
    if (!session?.access_token) return [];
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/account/workspaces`, {
        headers: authJsonHeaders(session.access_token),
      });
      if (!response.ok) throw new Error(`Unable to load workspaces (${response.status})`);
      const payload = await response.json();
      const rows = Array.isArray(payload?.workspaces) ? payload.workspaces as AccountWorkspace[] : [];
      setWorkspaces(rows);
      return rows;
    } catch (error) {
      console.error("[AuthContext] refreshWorkspaces:", error);
      return [];
    }
  }, [session?.access_token]);

  const switchWorkspace = useCallback(async (workspaceProfileId: string) => {
    const supabase = getSupabase();
    if (!supabase || !session?.access_token || !session.user.id) return { error: "You are not signed in." };
    if (!workspaces.some((workspace) => workspace.workspace_profile_id === workspaceProfileId && workspace.available)) {
      return { error: "This workspace is unavailable." };
    }
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/account/workspaces/activate`, {
        method: "POST",
        headers: authJsonHeaders(session.access_token),
        body: JSON.stringify({ workspace_profile_id: workspaceProfileId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return { error: payload?.error ?? "Unable to switch workspace." };
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) return { error: error?.message ?? "Please sign in again to refresh your session." };
      setSession(data.session);
      setActiveWorkspaceProfileId(workspaceProfileId === session.user.id ? null : workspaceProfileId);
      const row = await loadProfile(workspaceProfileId);
      if (!row) return { error: "Workspace profile could not be loaded. Your session was refreshed; try again." };
      setProfile(row);
      return {};
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to switch workspace." };
    }
  }, [session, workspaces, loadProfile]);

  const resendVerificationEmail = useCallback(async (email: string) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Supabase is not configured" };

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: getAuthRedirectUrl() },
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const value = useMemo(
    () => ({
      isConfigured: isSupabaseConfigured(),
      loading,
      session,
      profile,
      workspaces,
      activeWorkspaceProfileId,
      refreshWorkspaces,
      switchWorkspace,
      signIn,
      signUp,
      signOut,
      resetPassword,
      changePassword,
      refreshProfile,
      resendVerificationEmail,
      setPendingSignupLegal,
      markLegalAcceptancesCurrent,
      pendingPasswordRecovery,
      clearPasswordRecovery,
      emailConfirmedMessage,
      consumeEmailConfirmedMessage,
      justVerifiedEmail,
      consumeJustVerifiedEmail,
      authCallbackError,
    }),
    [
      loading,
      session,
      profile,
      workspaces,
      activeWorkspaceProfileId,
      refreshWorkspaces,
      switchWorkspace,
      signIn,
      signUp,
      signOut,
      resetPassword,
      changePassword,
      refreshProfile,
      resendVerificationEmail,
      setPendingSignupLegal,
      markLegalAcceptancesCurrent,
      pendingPasswordRecovery,
      clearPasswordRecovery,
      emailConfirmedMessage,
      consumeEmailConfirmedMessage,
      justVerifiedEmail,
      consumeJustVerifiedEmail,
      authCallbackError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
