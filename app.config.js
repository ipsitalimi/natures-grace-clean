const { loadProjectEnv } = require("@expo/env");

// Ensure .env is loaded when Expo evaluates config (Metro Web + native dev).
loadProjectEnv(process.cwd());

const appJson = require("./app.json");

/** @type {import("expo/config").ExpoConfig} */
module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_AUTH_REDIRECT_URL: process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
      EXPO_PUBLIC_RAZORPAY_KEY_ID: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID,
    },
  },
};
