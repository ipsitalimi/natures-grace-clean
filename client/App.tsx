import React, { useEffect, useRef, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { DefaultTheme, NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootNavigation from "@/navigation/RootNavigation";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { AuthProvider } from "@/context/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Colors } from "@/constants/theme";
import { BookingProvider } from "@/context/BookingContext";
import { DataProvider } from "@/context/DataContext";
import { OrdersProvider } from "@/context/OrdersContext";
import { SellerAnalyticsProvider } from "@/context/SellerAnalyticsContext";
import { WalletProvider } from "@/context/WalletContext";
import { PractitionerProvider } from "@/context/PractitionerContext";
import { CartProvider } from "@/context/CartContext";
import { JournalProvider } from "@/context/JournalContext";
import { GratitudeProvider } from "@/context/GratitudeContext";
import { EventRegistrationsProvider } from "@/context/EventRegistrationsContext";
import { ResourceEnrollmentsProvider } from "@/context/ResourceEnrollmentsContext";
import { SupportTicketsProvider } from "@/context/SupportTicketsContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { PaymentMethodsProvider } from "@/context/PaymentMethodsContext";
import { ReviewsProvider } from "@/context/ReviewsContext";
import { ModerationProvider } from "@/context/ModerationContext";
import { AdminSessionsProvider } from "@/context/AdminSessionsContext";
import { PlatformConfigProvider } from "@/context/PlatformConfigContext";
import { DrawerProvider } from "@/context/DrawerContext";
import MaintenanceOverlay from "@/components/MaintenanceOverlay";
import { navigationLinking } from "@/lib/navigationLinking";
import { usePushNotificationHandlers } from "@/hooks/usePushNotificationHandlers";
import { useAuth } from "@/context/AuthContext";
import { getProductionConfigError } from "@/lib/productionConfig";
import { ThemedText } from "@/components/ThemedText";

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.accent,
    background: Colors.light.backgroundRoot,
    card: Colors.light.cardBackground,
    text: Colors.light.text,
    border: Colors.light.divider,
    notification: Colors.light.accent,
  },
};

function AppShell() {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const drawerCloseRef = useRef<(() => void) | null>(null);
  const { profile } = useAuth();

  usePushNotificationHandlers(navigationRef, profile?.role);

  const registerNavigationCloseHandler = useCallback((handler: (() => void) | null) => {
    drawerCloseRef.current = handler;
  }, []);

  const handleNavigationStateChange = useCallback(() => {
    drawerCloseRef.current?.();
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <KeyboardProvider>
          <NavigationContainer
            ref={navigationRef}
            theme={navigationTheme}
            linking={navigationLinking}
            onStateChange={handleNavigationStateChange}
          >
            <View style={styles.root}>
              <DrawerProvider registerNavigationCloseHandler={registerNavigationCloseHandler}>
                <RootNavigation navigationRef={navigationRef} />
              </DrawerProvider>
              <MaintenanceOverlay />
            </View>
          </NavigationContainer>
          <StatusBar style="dark" />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default function App() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const configError = getProductionConfigError();
  if (configError) {
    return (
      <View style={configStyles.container}>
        <ThemedText style={configStyles.title}>Configuration required</ThemedText>
        <ThemedText style={configStyles.message}>{configError}</ThemedText>
      </View>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, stack) => {
        if (__DEV__) {
          console.error("[App] Render error:", error.message, stack);
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
        <PlatformConfigProvider>
        <DataProvider>
        <ModerationProvider>
        <AdminSessionsProvider>
        <EventRegistrationsProvider>
        <ResourceEnrollmentsProvider>
        <SupportTicketsProvider>
        <FavoritesProvider>
        <PaymentMethodsProvider>
        <ReviewsProvider>
        <OrdersProvider>
        <WalletProvider>
        <SellerAnalyticsProvider>
        <PractitionerProvider>
        <CartProvider>
        <JournalProvider>
        <GratitudeProvider>
        <BookingProvider>
          <AppShell />
        </BookingProvider>
        </GratitudeProvider>
        </JournalProvider>
        </CartProvider>
        </PractitionerProvider>
        </SellerAnalyticsProvider>
        </WalletProvider>
        </OrdersProvider>
        </ReviewsProvider>
        </PaymentMethodsProvider>
        </FavoritesProvider>
        </SupportTicketsProvider>
        </ResourceEnrollmentsProvider>
        </EventRegistrationsProvider>
        </AdminSessionsProvider>
        </ModerationProvider>
        </DataProvider>
        </PlatformConfigProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
});

const configStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: Colors.light.backgroundRoot,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    color: Colors.light.textSecondary,
  },
});
