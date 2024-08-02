/**
 * Layout racine de l'app — un seul Stack qui :
 *   - monte le QueryClient TanStack pour tout l'arbre
 *   - rend SafeAreaProvider pour que les écrans respectent les notches
 *   - délègue à Expo Router pour le routing fichier-based
 *
 * `app/(tabs)/` contient les onglets bottom-tabs (Adopter, Signalements,
 * Compte). `app/login.tsx` est en dehors des tabs (pas d'auth → pas de
 * navigation principale).
 */

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Si l'API n'est pas dispo (ex. snapshot test), on ignore.
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="login"
            options={{ presentation: "modal", headerShown: true, title: "Connexion" }}
          />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
