/**
 * Layout racine de l'app — un seul Stack qui :
 *   - monte le QueryClient TanStack pour tout l'arbre
 *   - rend SafeAreaProvider pour que les écrans respectent les notches
 *   - délègue à Expo Router pour le routing fichier-based
 *   - gère le cold-start push refresh + le tap sur notification
 *
 * `app/(tabs)/` contient les onglets bottom-tabs. `app/login.tsx` est
 * en dehors des tabs (modal au-dessus des tabs).
 */

import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { getAuthToken, setDeviceTokenId } from "@/lib/auth";
import { registerForPushNotifications } from "@/lib/notifications";

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

// Au cold-start, si une session existe déjà, on rafraîchit le push token
// (le token Expo peut changer entre deux launches sur iOS / Android, et
// le serveur dédoublonne sur (userId, expoPushToken)).
async function refreshPushTokenIfAuthed() {
  const token = await getAuthToken();
  if (!token) return;
  try {
    const reg = await registerForPushNotifications();
    if (reg) await setDeviceTokenId(reg.deviceTokenId);
  } catch (err) {
    console.warn("[layout] cold-start push refresh failed", err);
  }
}

/**
 * Mappe le payload `data` d'une notification Expo Push vers une route
 * mobile. Le serveur émet `data: { reportId? petId? type url }` selon
 * le type de notification — on choisit la route en fonction du premier
 * id non-null trouvé.
 *
 * Retourne `null` si on ne sait pas où router (ex. type `new_message`
 * tant qu'on n'a pas la page Messages mobile). L'appelant doit
 * fallback sur la home dans ce cas.
 */
function notificationDataToRoute(
  data: Record<string, unknown> | null | undefined
):
  | { pathname: "/report/[id]"; params: { id: string } }
  | { pathname: "/pet/[id]"; params: { id: string } }
  | null {
  if (!data) return null;
  const reportId = typeof data.reportId === "string" ? data.reportId : null;
  const petId = typeof data.petId === "string" ? data.petId : null;
  if (reportId) return { pathname: "/report/[id]", params: { id: reportId } };
  if (petId) return { pathname: "/pet/[id]", params: { id: petId } };
  return null;
}

export default function RootLayout() {
  const router = useRouter();
  // useLastNotificationResponse fire à chaque tap (foreground OU
  // cold-start). Sur cold-start, un re-render du layout déclenche
  // l'effet ci-dessous avec le response du tap qui a lancé l'app.
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    refreshPushTokenIfAuthed();
  }, []);

  useEffect(() => {
    if (!lastResponse) return;
    const data = lastResponse.notification.request.content.data as
      | Record<string, unknown>
      | null
      | undefined;
    const route = notificationDataToRoute(data);
    if (route) router.push(route);
  }, [lastResponse, router]);

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
