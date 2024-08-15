/**
 * Onglet Compte — profil + auth.
 *
 * Scaffold :
 *   - si la session est connue, on affiche le `name` + un bouton logout
 *   - sinon on dirige vers /login (modal)
 *
 * Le vrai écran (édition profil, préférences notifs, suppression compte)
 * arrive en session 3.
 */

import { Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  clearAuthToken,
  clearDeviceTokenId,
  getAuthToken,
  getDeviceTokenId,
} from "@/lib/auth";
import { unregisterPushDevice } from "@/lib/notifications";

async function logout() {
  // Désenregistrer le device avant de perdre l'auth — sinon le DELETE
  // côté serveur n'a plus de bearer pour s'authentifier.
  const deviceTokenId = await getDeviceTokenId();
  if (deviceTokenId) {
    await unregisterPushDevice(deviceTokenId);
    await clearDeviceTokenId();
  }
  await clearAuthToken();
}

export default function CompteScreen() {
  const tokenQuery = useQuery({
    queryKey: ["auth", "token"],
    queryFn: getAuthToken,
  });

  const meQuery = useQuery({
    enabled: !!tokenQuery.data,
    queryKey: ["me"],
    queryFn: async () => {
      const { data, error } = await api.GET("/me");
      if (error) throw new Error(error.error.message);
      return data;
    },
  });

  if (tokenQuery.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!tokenQuery.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Pas encore de compte ?</Text>
        <Text style={styles.subtitle}>
          Connecte-toi pour suivre tes candidatures, signalements et favoris.
        </Text>
        <Link href="/login" asChild>
          <Pressable style={styles.cta} testID="compte-cta-signin">
            <Text style={styles.ctaLabel}>Se connecter</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  if (meQuery.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (meQuery.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Session expirée</Text>
        <Text style={styles.errorBody}>{meQuery.error.message}</Text>
        <Pressable
          style={styles.cta}
          onPress={async () => {
            await logout();
            tokenQuery.refetch();
          }}
        >
          <Text style={styles.ctaLabel}>Se reconnecter</Text>
        </Pressable>
      </View>
    );
  }

  const me = meQuery.data.data;

  return (
    <View style={styles.profile}>
      <Text style={styles.title} testID="compte-name">
        {me.name}
      </Text>
      <Text style={styles.subtitle}>{me.email}</Text>
      <View style={{ height: 24 }} />
      <Pressable
        style={[styles.cta, styles.ctaSecondary]}
        onPress={async () => {
          await clearAuthToken();
          tokenQuery.refetch();
        }}
      >
        <Text style={styles.ctaLabelSecondary}>Se déconnecter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 12 },
  profile: { flex: 1, padding: 32 },
  title: { fontSize: 22, fontWeight: "700", color: "#1f1414", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
  cta: {
    marginTop: 16,
    backgroundColor: "#e8634d",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
  },
  ctaSecondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#e8634d" },
  ctaLabel: { color: "white", fontWeight: "600", fontSize: 16 },
  ctaLabelSecondary: { color: "#e8634d", fontWeight: "600", fontSize: 16 },
  errorTitle: { fontSize: 18, fontWeight: "600", color: "#1f1414" },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
