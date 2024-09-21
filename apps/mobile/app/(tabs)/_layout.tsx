/**
 * Bottom tabs : 5 onglets alignés sur les 3 features métier + transversal.
 *
 *   1. Adopter        — feature 1 : catalogue d'animaux à adopter
 *   2. Signalements   — feature 2 : perdus/trouvés (FAB "Signaler" intégré)
 *   3. Pensions       — feature 3 : annuaire des pensions agréées
 *   4. Messages       — transversal : conversations user ↔ refuge/pension
 *   5. Compte         — profil, login/logout, paramètres
 *
 * "Signaler" est sorti des tabs (le bouton de création reste accessible
 * via le FAB de l'onglet Signalements). Cohérent avec Vinted, Le Bon Coin :
 * 1 tab = 1 feature, l'action de création est contextuelle.
 *
 * Le badge unread sur Messages se rafraîchit toutes les 30s via TanStack
 * Query.
 */

import { Tabs, useRouter } from "expo-router";
import { Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

const DISABLED_COLOR = "#d0c2b8";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

function tabIcon(name: IconName) {
  return ({ color, size }: { color: string; size: number }) => (
    <MaterialCommunityIcons name={name} color={color} size={size} />
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const tokenQuery = useQuery({
    queryKey: ["auth", "token"],
    queryFn: getAuthToken,
  });
  const isAuthed = !!tokenQuery.data;

  const unreadQuery = useQuery({
    enabled: isAuthed,
    queryKey: ["messaging", "unread-count"],
    queryFn: async () => {
      const { data, error } = await api.GET("/conversations/unread-count");
      if (error) throw new Error(error.error.message);
      return data.data;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const unreadTotal = unreadQuery.data?.total ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#e8634d",
        tabBarInactiveTintColor: "#a08585",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Adopter",
          tabBarLabel: "Adopter",
          tabBarIcon: tabIcon("paw"),
        }}
      />
      <Tabs.Screen
        name="signalements"
        options={{
          title: "Perdus / trouvés",
          tabBarLabel: "Signalements",
          tabBarIcon: tabIcon("map-marker-question"),
        }}
      />
      <Tabs.Screen
        name="pensions"
        options={{
          title: "Pensions",
          tabBarLabel: "Pensions",
          tabBarIcon: tabIcon("home-city"),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="message-text"
              color={isAuthed ? color : DISABLED_COLOR}
              size={size}
            />
          ),
          tabBarLabel: ({ color, focused }) => (
            <Text
              style={{
                color: isAuthed ? color : DISABLED_COLOR,
                fontSize: 10,
                fontWeight: focused ? "600" : "500",
              }}
            >
              Messages
            </Text>
          ),
          tabBarBadge:
            isAuthed && unreadTotal > 0 ? unreadTotal : undefined,
        }}
        listeners={{
          tabPress: (e) => {
            if (!isAuthed) {
              e.preventDefault();
            }
          },
        }}
      />
      <Tabs.Screen
        name="compte"
        options={{
          title: "Mon compte",
          tabBarLabel: "Compte",
          tabBarIcon: tabIcon("account"),
        }}
        listeners={{
          tabPress: (e) => {
            if (!isAuthed) {
              e.preventDefault();
              router.push("/login");
            }
          },
        }}
      />
    </Tabs>
  );
}
