const { loadProjectEnv } = require("@expo/env");

// Ensure .env is loaded when Expo evaluates config (Metro Web + native dev).
loadProjectEnv(process.cwd());

const appJson = require("./app.json");

const appScheme = appJson.expo.scheme ?? "natures-grace";
const productionAuthRedirectUrl = `${appScheme}://auth/callback`;
const authRedirectFromEnv = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim();

/** @type {import("expo/config").ExpoConfig} */
module.exports = {
  expo: {
    ...appJson.expo,
    android: {
      ...appJson.expo.android,
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: false,
          data: [
            {
              scheme: appScheme,
              host: "auth",
              pathPrefix: "/callback",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    extra: {
      ...appJson.expo.extra,
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_AUTH_REDIRECT_URL:
        authRedirectFromEnv ||
        (process.env.EAS_BUILD === "true" ? productionAuthRedirectUrl : undefined),
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
      EXPO_PUBLIC_RAZORPAY_KEY_ID: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID,
    },
  },
};
