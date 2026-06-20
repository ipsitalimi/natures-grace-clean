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
import {
  completeAuthSessionFromUrl,
  isPasswordRecoveryCallback,
  isSignupConfirmationCallback,
  readAuthCallbackUrl,
} from "@/lib/authSessionFromUrl";
import { getSupabase } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { fetchProfileByUserId } from "@/services/profileService";
import {
  sendAuthEmailHook,
  sendPasswordResetRequestedHook,
} from "@/services/transactionalHooksApi";
import { registerPushTokenForUser } from "@/services/pushTokenService";
import type { ProfileRow, UserRole } from "@/types/database";

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
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error?: string; route?: AuthHomeRoute; profile?: ProfileRow }>;
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
  pendingPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  emailConfirmedMessage: string | null;
  consumeEmailConfirmedMessage: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [pendingPasswordRecovery, setPendingPasswordRecovery] = useState(false);
  const [emailConfirmedMessage, setEmailConfirmedMessage] = useState<string | null>(null);
  const profileLoadGeneration = useRef(0);

  const consumeEmailConfirmedMessage = useCallback(() => {
    setEmailConfirmedMessage(null);
  }, []);

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

  const loadProfile = useCallback(async (userId: string) => {
    const generation = ++profileLoadGeneration.current;
    const row = await loadProfileWithRetry(userId);

    if (generation !== profileLoadGeneration.current) {
      return row;
    }

    if (row) {
      setProfile(row);
      return row;
    }

    // Keep the last known profile for this user when a refetch fails or races.
    setProfile((current) => (current?.id === userId ? current : null));
    return null;
  }, [loadProfileWithRetry]);

  const clearAuthState = useCallback(() => {
    profileLoadGeneration.current += 1;
    setSession(null);
    setProfile(null);
    setPendingPasswordRecovery(false);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const completeNativeAuthUrl = async (url: string) => {
      if (Platform.OS === "web") return;
      const result = await completeAuthSessionFromUrl(supabase, url);
      if (result.isPasswordRecovery) {
        setPendingPasswordRecovery(true);
      } else if (result.session && isSignupConfirmationCallback(url)) {
        setEmailConfirmedMessage("Email confirmed! You're signed in.");
        if (result.session.access_token) {
          void sendAuthEmailHook("email_verified", result.session.access_token);
        }
      }
    };

    const applyAuthSession = async (nextSession: Session | null) => {
      setSession(nextSession);

      if (nextSession?.user?.id) {
        await loadProfile(nextSession.user.id);
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
          setEmailConfirmedMessage("Email confirmed! You're signed in.");
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
        markPasswordRecoveryFromUrl(readAuthCallbackUrl());
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
  }, [loadProfile, markPasswordRecoveryFromUrl]);

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

      if (error) return { error: error.message };

      if (data.session) {
        setSession(data.session);
      }

      const userId = data.user?.id;
      if (!userId) return { error: "Sign-in succeeded but no user was returned." };

      const row = await loadProfile(userId);
      if (!row) return { error: "Profile not found. Contact support." };
      if (row.status === "Suspended") {
        await supabase.auth.signOut();
        clearAuthState();
        return { error: "This account has been suspended. Contact support." };
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

      if (error) return { error: error.message };

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
      if (userId) {
        const row = await loadProfile(userId);
        if (row) return { route: homeRouteForRole(row.role), profile: row };
      }
      return { route: "Main" as AuthHomeRoute };
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
    return loadProfile(session.user.id);
  }, [session?.user?.id, loadProfile]);

  const value = useMemo(
    () => ({
      isConfigured: isSupabaseConfigured(),
      loading,
      session,
      profile,
      signIn,
      signUp,
      signOut,
      resetPassword,
      changePassword,
      refreshProfile,
      pendingPasswordRecovery,
      clearPasswordRecovery,
      emailConfirmedMessage,
      consumeEmailConfirmedMessage,
    }),
    [
      loading,
      session,
      profile,
      signIn,
      signUp,
      signOut,
      resetPassword,
      changePassword,
      refreshProfile,
      pendingPasswordRecovery,
      clearPasswordRecovery,
      emailConfirmedMessage,
      consumeEmailConfirmedMessage,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
