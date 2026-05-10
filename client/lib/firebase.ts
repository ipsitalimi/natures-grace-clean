import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.warn("[Firebase] Missing environment variables:", missingKeys.join(", "));
}

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log("[Firebase] Initialized successfully with project:", firebaseConfig.projectId);
} else {
  app = getApp();
  console.log("[Firebase] Already initialized, reusing existing app");
}

export const firebaseApp = app;
export const db = getFirestore(app);
