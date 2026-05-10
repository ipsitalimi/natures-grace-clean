import React from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BookingProvider } from "@/context/BookingContext";
import { DataProvider } from "@/context/DataContext";
import { CartProvider } from "@/context/CartContext";
import { JournalProvider } from "@/context/JournalContext";
import { GratitudeProvider } from "@/context/GratitudeContext";

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <DataProvider>
        <CartProvider>
        <JournalProvider>
        <GratitudeProvider>
        <BookingProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView style={styles.root}>
              <KeyboardProvider>
                <NavigationContainer>
                  <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
                    <RootStackNavigator />
                  </SafeAreaView>
                </NavigationContainer>
                <StatusBar style="auto" />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </BookingProvider>
        </GratitudeProvider>
        </JournalProvider>
        </CartProvider>
        </DataProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
