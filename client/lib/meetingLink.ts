import { Alert, Linking } from "react-native";

export function openMeetingLink(link: string | undefined | null, emptyMessage?: string): void {
  const trimmed = link?.trim();
  if (!trimmed) {
    Alert.alert(
      "Join Session",
      emptyMessage ??
        "Your practitioner has not added a meeting link yet. Contact support if you need help joining."
    );
    return;
  }

  const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  Linking.openURL(href).catch(() => {
    Alert.alert(
      "Could not open link",
      "Please copy the link from your session email or contact support."
    );
  });
}
