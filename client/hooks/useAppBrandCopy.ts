import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import {
  ABOUT_APP_NAME_KEY,
  ABOUT_APP_VERSION_KEY,
  fetchSupportCopyMap,
  formatSupportCopyForDisplay,
  getSupportCopyKey,
} from "@/services/content/helpSupportService";

export function useAppBrandCopy() {
  const [copyMap, setCopyMap] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setCopyMap(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetchSupportCopyMap();
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      setCopyMap(null);
      return;
    }
    setCopyMap(res.map);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const hasLoaded = Boolean(copyMap !== null && !loading && !error && isSupabaseConfigured());
  const appNameRaw = getSupportCopyKey(copyMap, ABOUT_APP_NAME_KEY);
  const appVersionRaw = getSupportCopyKey(copyMap, ABOUT_APP_VERSION_KEY);

  return {
    loading,
    error,
    hasLoaded,
    reload: load,
    appNameDisplay: isSupabaseConfigured()
      ? formatSupportCopyForDisplay(appNameRaw)
      : formatSupportCopyForDisplay(""),
    appVersionDisplay: isSupabaseConfigured()
      ? formatSupportCopyForDisplay(appVersionRaw)
      : formatSupportCopyForDisplay(""),
    appNameMuted: hasLoaded && !appNameRaw,
    appVersionMuted: hasLoaded && !appVersionRaw,
  };
}
