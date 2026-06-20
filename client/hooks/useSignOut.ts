import { useCallback } from "react";
import { CommonActions, useNavigation } from "@react-navigation/native";

import { useAuth } from "@/context/AuthContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { useBooking } from "@/context/BookingContext";
import { clearPractitionerIdCache } from "@/services/content/practitionerId";

export function useSignOut() {
  const navigation = useNavigation();
  const { signOut } = useAuth();
  const { clearSession } = usePlatformConfig();
  const { clearBooking } = useBooking();

  return useCallback(async () => {
    clearPractitionerIdCache();
    clearBooking();
    await signOut();
    clearSession();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Login" }],
      })
    );
  }, [signOut, clearSession, clearBooking, navigation]);
}
