import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import * as notificationsService from "@/services/content/notificationsService";

export function useUnreadNotificationCount(): number {
  const { session } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured() || !session?.user) {
      setCount(0);
      return;
    }
    try {
      const items = await notificationsService.fetchMyNotifications();
      setCount(items.filter((item) => item.unread).length);
    } catch {
      setCount(0);
    }
  }, [session?.user]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return count;
}
