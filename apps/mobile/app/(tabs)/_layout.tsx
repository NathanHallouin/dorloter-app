/**
 * Bottom tabs : 4 onglets.
 *
 *   1. Adopter        — catalogue d'animaux à adopter
 *   2. Signalements   — perdus/trouvés autour de l'utilisateur
 *   3. Signaler       — créer un signalement (auth requise)
 *   4. Compte         — profil, login/logout, paramètres
 *
 * "Signaler" est centré en 3e position pour rappeler le pattern
 * iOS/Android où l'action principale est mise en avant. Pas d'icône
 * spéciale — typage texte uniquement pour l'instant.
 */

import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#e8634d",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Adopter",
          tabBarLabel: "Adopter",
        }}
      />
      <Tabs.Screen
        name="signalements"
        options={{
          title: "Perdus / trouvés",
          tabBarLabel: "Signalements",
        }}
      />
      <Tabs.Screen
        name="signaler"
        options={{
          title: "Signaler",
          tabBarLabel: "Signaler",
        }}
      />
      <Tabs.Screen
        name="compte"
        options={{
          title: "Mon compte",
          tabBarLabel: "Compte",
        }}
      />
    </Tabs>
  );
}
