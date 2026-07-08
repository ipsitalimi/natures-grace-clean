import type { NotificationLinkRoute } from "@/types/notifications";
import type { UserRole } from "@/types/database";

export function resolveNotificationRoute(
  route: string,
  role: UserRole | undefined
): string {
  if (route === "SellerMain" || route === "SellerOnboarding") {
    return role === "Seller" ? route : "ApplicationStatus";
  }
  if (route === "PractitionerMain" || route === "PractitionerOnboarding") {
    return role === "Practitioner" ? route : "ApplicationStatus";
  }
  return route;
}

export function navigateFromNotificationLink(
  navigation: { navigate: (...args: never[]) => void },
  route: NotificationLinkRoute | string,
  targetId: string | null | undefined,
  role: UserRole | undefined
): void {
  const resolvedRoute = resolveNotificationRoute(route, role);

  switch (resolvedRoute) {
    case "SessionHistory":
      navigation.navigate("SessionHistory" as never);
      break;
    case "SessionDetail":
      if (targetId) {
        navigation.navigate("SessionDetail" as never, { sessionId: targetId } as never);
      }
      break;
    case "OrderHistory":
      navigation.navigate("OrderHistory" as never);
      break;
    case "OrderDetail":
      if (targetId) {
        navigation.navigate("OrderDetail" as never, { orderId: targetId } as never);
      }
      break;
    case "SellerOnboarding":
      navigation.navigate("SellerOnboarding" as never);
      break;
    case "SellerMain":
      navigation.navigate("SellerMain" as never);
      break;
    case "PractitionerMain":
      navigation.navigate("PractitionerMain" as never);
      break;
    case "PractitionerOnboarding":
      navigation.navigate("PractitionerOnboarding" as never);
      break;
    case "ApplicationStatus":
      navigation.navigate("ApplicationStatus" as never);
      break;
    case "Main":
      navigation.navigate("Main" as never);
      break;
    default:
      break;
  }
}
