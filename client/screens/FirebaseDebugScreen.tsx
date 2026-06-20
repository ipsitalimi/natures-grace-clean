import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { collection, getDocs } from "firebase/firestore";
import { Feather } from "@expo/vector-icons";

import { db, isFirebaseConfigured } from "@/lib/firebase";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { getHeaderPaddingTop, getScrollBottomPadding, getAuthScreenPaddingTop } from "@/lib/layoutInsets";

interface CategoryDoc {
  id: string;
  [key: string]: any;
}

export default function FirebaseDebugScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  function fetchCategories() {
    if (!isFirebaseConfigured() || !db) {
      setErrorMsg("Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* to .env.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg("");
    setCategories([]);
    console.log("[FirebaseDebug] Fetching 'categories' collection...");
    console.log("[FirebaseDebug] Firestore db instance:", db ? "OK" : "MISSING");

    const timeoutMs = 10000;
    let didTimeout = false;
    const timer = setTimeout(() => {
      didTimeout = true;
      console.error(`[FirebaseDebug] Fetch timed out after ${timeoutMs / 1000}s`);
      console.error("[FirebaseDebug] Firestore may be unreachable or database not provisioned");
      setErrorMsg(`[timeout] Fetch timed out after ${timeoutMs / 1000}s. Database may not be provisioned in Firebase console.`);
      setStatus("error");
    }, timeoutMs);

    getDocs(collection(db, "categories"))
      .then((querySnapshot) => {
        if (didTimeout) return;
        clearTimeout(timer);
        const docs: CategoryDoc[] = [];
        querySnapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() });
        });
        console.log(`[FirebaseDebug] Found ${docs.length} document(s) in 'categories'`);
        if (docs.length === 0) {
          console.warn("[FirebaseDebug] 0 documents returned. Possible causes:");
          console.warn("  - The 'categories' collection does not exist in Firestore");
          console.warn("  - The collection exists but has no documents");
          console.warn("  - Firestore rules may be silently returning empty results");
        } else {
          docs.forEach((d) => {
            console.log(`[FirebaseDebug]   -> ${d.id}: name="${d.name || "(no name field)"}"`);
          });
        }
        setCategories(docs);
        setStatus("success");
      })
      .catch((err: any) => {
        if (didTimeout) return;
        clearTimeout(timer);
        const code = err?.code || "unknown";
        const msg = err?.message || "Unknown error";
        console.error(`[FirebaseDebug] Firestore error (code: ${code}):`, msg);
        if (code === "permission-denied") {
          console.error("[FirebaseDebug] PERMISSION DENIED - Check Firestore Security Rules");
          console.error("[FirebaseDebug] Rules must allow read on /categories collection");
        } else if (code === "unavailable") {
          console.error("[FirebaseDebug] Firestore unavailable - Check network or project config");
        } else if (code === "not-found") {
          console.error("[FirebaseDebug] NOT FOUND - Database or collection path may be wrong");
        }
        setErrorMsg(`[${code}] ${msg}`);
        setStatus("error");
      });
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} testID="button-debug-back">
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.title}>Firebase Debug</ThemedText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: getScrollBottomPadding(insets.bottom, 20) }]}
      >
        <View style={styles.statusCard}>
          <ThemedText style={styles.label}>Connection Status</ThemedText>
          <ThemedText
            style={[
              styles.statusText,
              status === "success"
                ? styles.statusSuccess
                : status === "error"
                  ? styles.statusError
                  : styles.statusLoading,
            ]}
            testID="text-firebase-status"
          >
            {status === "loading"
              ? "Connecting to Firestore..."
              : status === "success"
                ? "Connected"
                : "Error"}
          </ThemedText>
        </View>

        {status === "error" ? (
          <View style={styles.errorCard}>
            <ThemedText style={styles.errorLabel}>Error Details</ThemedText>
            <ThemedText style={styles.errorText} testID="text-firebase-error">{errorMsg}</ThemedText>
          </View>
        ) : null}

        {status !== "loading" ? (
          <Pressable style={styles.statusCard} onPress={fetchCategories} testID="button-retry-fetch">
            <ThemedText style={styles.label}>Tap to re-fetch categories</ThemedText>
          </Pressable>
        ) : null}

        {status === "success" ? (
          <View style={styles.resultCard}>
            <ThemedText style={styles.label}>
              Categories Collection ({categories.length} documents)
            </ThemedText>
            {categories.length > 0 ? (
              categories.map((cat) => (
                <View key={cat.id} style={styles.docRow} testID={`category-doc-${cat.id}`}>
                  <ThemedText style={styles.docId}>{cat.name || cat.id}</ThemedText>
                  <ThemedText style={styles.docData} numberOfLines={3}>
                    {JSON.stringify(cat, null, 2)}
                  </ThemedText>
                </View>
              ))
            ) : (
              <ThemedText style={styles.emptyText} testID="text-no-categories">
                No documents found in "categories" collection.{"\n"}
                Check console logs for permission or path details.
              </ThemedText>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  statusCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },
  statusSuccess: {
    color: "#2E7D32",
  },
  statusError: {
    color: "#C62828",
  },
  statusLoading: {
    color: Colors.light.textMuted,
  },
  errorCard: {
    backgroundColor: "#FFF3F3",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  errorLabel: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#C62828",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#C62828",
  },
  resultCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  docRow: {
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.sm,
    padding: 12,
    marginBottom: 8,
  },
  docId: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginBottom: 4,
  },
  docData: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    fontStyle: "italic",
  },
});
