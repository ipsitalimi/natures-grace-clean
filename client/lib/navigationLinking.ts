import * as Linking from "expo-linking";
import type { LinkingOptions } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const prefix = Linking.createURL("/");

export const navigationLinking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, "natures-grace://"],
  config: {
    screens: {
      AuthCallback: "auth/callback",
      OrderDetail: "orders/:orderId",
      SessionDetail: "sessions/:sessionId",
      StoreProductDetail: "store/:productId",
      Notifications: "notifications",
      ApplicationStatus: "application-status",
    },
  },
};
