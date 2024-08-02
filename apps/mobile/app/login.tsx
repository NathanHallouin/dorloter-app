/**
 * Écran de connexion — modal hors des tabs.
 *
 * Scaffold : appelle Better Auth (`POST /api/auth/sign-in/email`) avec
 * email + password, stocke le bearer token dans expo-secure-store, puis
 * referme la modal et rafraîchit la query `me` côté Compte.
 *
 * À durcir en session 3 : OAuth Google/Apple, mot de passe oublié,
 * inscription, captcha Turnstile (déjà côté web), validation Zod.
 */

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { setAuthToken } from "@/lib/auth";

interface BetterAuthSignInResponse {
  token: string;
  user: { id: string; email: string };
}

export default function LoginScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const apiBaseUrl =
    (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
    "http://localhost:3000/api/v1";
  // Better Auth est exposé sur `/api/auth/*` (pas `/api/v1/auth/*`)
  const authBaseUrl = apiBaseUrl.replace(/\/api\/v1\/?$/, "/api/auth");

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert("Champs manquants", "Renseigne ton email et ton mot de passe.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${authBaseUrl}/sign-in/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as BetterAuthSignInResponse;
      if (!data.token) {
        throw new Error("Réponse inattendue du serveur (token manquant).");
      }
      await setAuthToken(data.token);
      // Forcer Compte à reprendre les queries `auth/token` et `me`.
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      router.back();
    } catch (err) {
      Alert.alert(
        "Connexion impossible",
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Se connecter</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="ton@email.fr"
          value={email}
          onChangeText={setEmail}
          editable={!submitting}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoComplete="current-password"
          secureTextEntry
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          editable={!submitting}
        />
      </View>
      <Pressable
        style={[styles.cta, submitting && styles.ctaDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.ctaLabel}>Se connecter</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16, backgroundColor: "white" },
  title: { fontSize: 24, fontWeight: "700", color: "#1f1414" },
  field: { gap: 6 },
  label: { fontSize: 14, color: "#564545", fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: "#e6d4c8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f1414",
  },
  cta: {
    marginTop: 8,
    backgroundColor: "#e8634d",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  ctaDisabled: { opacity: 0.6 },
  ctaLabel: { color: "white", fontWeight: "600", fontSize: 16 },
});
