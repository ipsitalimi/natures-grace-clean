import { useEffect } from "react";
import { Platform } from "react-native";
import type { NavigationContainerRef } from "@react-navigation/native";

import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { UserRole } from "@/types/database";
import { navigateFromNotificationLink } from "@/lib/notificationNavigation";
import type { NotificationLinkRoute } from "@/types/notifications";

type PushData = {
  linkRoute?: NotificationLinkRoute | string | null;
  linkTargetId?: string | null;
};

export function usePushNotificationHandlers(
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>,
  role: UserRole | undefined
): void {
  useEffect(() => {
    if (Platform.OS === "web") return;

    let responseSub: { remove: () => void } | undefined;
    let receivedSub: { remove: () => void } | undefined;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Notifications = require("expo-notifications") as typeof import("expo-notifications");

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      const handleResponse = (
        response: import("expo-notifications").NotificationResponse | null | undefined
      ) => {
        const data = response?.notification.request.content.data as PushData | undefined;
        const route = data?.linkRoute;
        if (!route || !navigationRef.current) return;
        navigateFromNotificationLink(
          navigationRef.current as { navigate: (...args: never[]) => void },
          route,
          data?.linkTargetId ?? null,
          role
        );
      };

      responseSub = Notifications.addNotificationResponseReceivedListener(handleResponse);
      receivedSub = Notifications.addNotificationReceivedListener(() => {
        // Foreground delivery — banner handled by setNotificationHandler.
      });

      void Notifications.getLastNotificationResponseAsync().then(handleResponse);
    } catch {
      // expo-notifications may not be installed in dev
    }

    return () => {
      responseSub?.remove();
      receivedSub?.remove();
    };
  }, [navigationRef, role]);
}
