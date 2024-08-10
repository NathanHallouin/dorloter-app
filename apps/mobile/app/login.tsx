/**
 * Écran auth — modal hors des tabs, 3 modes.
 *
 *   - signin    : POST /api/auth/sign-in/email
 *   - signup    : POST /api/auth/sign-up/email   (+ name + password ≥ 8)
 *   - forgot    : POST /api/auth/forget-password (envoie un mail de reset)
 *
 * Après un signin OU signup réussi, on stocke le bearer token, on
 * enregistre le device pour les push (non-bloquant), on invalide les
 * queries auth/me, et on referme la modal.
 *
 * La page de reset de password (lien dans le mail) reste sur le web —
 * pas de deep-link mobile en MVP. Le user touche son inbox depuis
 * n'importe où, lit le lien, atterrit sur dorloter.fr/reset-password,
 * puis revient à l'app pour se logger avec le nouveau mdp.
 */

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { setAuthToken, setDeviceTokenId } from "@/lib/auth";
import { registerForPushNotifications } from "@/lib/notifications";

type Mode = "signin" | "signup" | "forgot";

interface BetterAuthAuthResponse {
  token?: string;
  user?: { id: string; email: string };
  // forget-password ne renvoie pas de token, juste {status:true} ou similaire
  status?: boolean;
}

const PASSWORD_MIN = 8;

export default function LoginScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const apiBaseUrl =
    (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
    "http://localhost:3000/api/v1";
  const authBaseUrl = apiBaseUrl.replace(/\/api\/v1\/?$/, "/api/auth");

  async function postAuth(
    path: string,
    body: Record<string, string>
  ): Promise<BetterAuthAuthResponse> {
    const res = await fetch(`${authBaseUrl}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => null)) as
        | { message?: string }
        | null;
      throw new Error(errBody?.message ?? `HTTP ${res.status}`);
    }
    return (await res.json()) as BetterAuthAuthResponse;
  }

  async function persistSessionAndClose(token: string) {
    await setAuthToken(token);
    try {
      const reg = await registerForPushNotifications();
      if (reg) await setDeviceTokenId(reg.deviceTokenId);
    } catch (regErr) {
      console.warn("[login] push registration failed", regErr);
    }
    await queryClient.invalidateQueries({ queryKey: ["auth"] });
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    router.back();
  }

  async function handleSignin() {
    if (!email || !password) {
      Alert.alert("Champs manquants", "Email + mot de passe requis.");
      return;
    }
    setSubmitting(true);
    try {
      const data = await postAuth("sign-in/email", { email, password });
      if (!data.token) throw new Error("Token manquant dans la réponse.");
      await persistSessionAndClose(data.token);
    } catch (err) {
      Alert.alert(
        "Connexion impossible",
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignup() {
    if (!email || !password || !name) {
      Alert.alert("Champs manquants", "Nom, email et mot de passe requis.");
      return;
    }
    if (password.length < PASSWORD_MIN) {
      Alert.alert(
        "Mot de passe trop court",
        `Au moins ${PASSWORD_MIN} caractères.`
      );
      return;
    }
    setSubmitting(true);
    try {
      const data = await postAuth("sign-up/email", { email, password, name });
      if (!data.token) {
        throw new Error("Token manquant — vérifie ton email pour confirmer.");
      }
      await persistSessionAndClose(data.token);
    } catch (err) {
      Alert.alert(
        "Inscription impossible",
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      Alert.alert("Email manquant", "Renseigne l'email de ton compte.");
      return;
    }
    setSubmitting(true);
    try {
      await postAuth("forget-password", {
        email,
        redirectTo: `${Constants.expoConfig?.scheme ?? "dorloter"}://reset-password`,
      });
      Alert.alert(
        "Email envoyé",
        "Si un compte existe avec cet email, un lien de réinitialisation t'a été envoyé. Vérifie ta boîte de réception.",
        [{ text: "OK", onPress: () => setMode("signin") }]
      );
    } catch (err) {
      Alert.alert(
        "Envoi impossible",
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Toggle Connexion / Inscription (forgot mode est hors toggle) */}
      {mode !== "forgot" ? (
        <View style={styles.toggle}>
          <Pressable
            style={[styles.toggleBtn, mode === "signin" && styles.toggleBtnActive]}
            onPress={() => setMode("signin")}
          >
            <Text
              style={[
                styles.toggleLabel,
                mode === "signin" && styles.toggleLabelActive,
              ]}
            >
              Connexion
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, mode === "signup" && styles.toggleBtnActive]}
            onPress={() => setMode("signup")}
          >
            <Text
              style={[
                styles.toggleLabel,
                mode === "signup" && styles.toggleLabelActive,
              ]}
            >
              Inscription
            </Text>
          </Pressable>
        </View>
      ) : null}

      {mode === "forgot" ? (
        <>
          <Text style={styles.title}>Mot de passe oublié</Text>
          <Text style={styles.subtitle}>
            On t'envoie un lien pour le réinitialiser. Le reset se fait sur
            dorloter.fr — tu reviens ici une fois le nouveau mot de passe
            choisi.
          </Text>
          <Field label="Email">
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
          </Field>
          <Pressable
            style={[styles.cta, submitting && styles.ctaDisabled]}
            onPress={handleForgotPassword}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.ctaLabel}>Envoyer le lien</Text>
            )}
          </Pressable>
          <Pressable onPress={() => setMode("signin")} disabled={submitting}>
            <Text style={styles.linkLabel}>Retour à la connexion</Text>
          </Pressable>
        </>
      ) : (
        <>
          {mode === "signup" ? (
            <Field label="Nom">
              <TextInput
                style={styles.input}
                autoCapitalize="words"
                autoComplete="name"
                placeholder="Ton prénom (ou pseudo)"
                value={name}
                onChangeText={setName}
                editable={!submitting}
              />
            </Field>
          ) : null}
          <Field label="Email">
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
          </Field>
          <Field
            label={
              mode === "signup"
                ? `Mot de passe (${PASSWORD_MIN} caractères mini)`
                : "Mot de passe"
            }
          >
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              secureTextEntry
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              editable={!submitting}
            />
          </Field>
          <Pressable
            style={[styles.cta, submitting && styles.ctaDisabled]}
            onPress={mode === "signin" ? handleSignin : handleSignup}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.ctaLabel}>
                {mode === "signin" ? "Se connecter" : "Créer mon compte"}
              </Text>
            )}
          </Pressable>
          {mode === "signin" ? (
            <Pressable onPress={() => setMode("forgot")} disabled={submitting}>
              <Text style={styles.linkLabel}>Mot de passe oublié ?</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 14, backgroundColor: "white" },
  title: { fontSize: 22, fontWeight: "700", color: "#1f1414" },
  subtitle: { fontSize: 14, color: "#7a5f5f", marginBottom: 4 },

  toggle: {
    flexDirection: "row",
    backgroundColor: "#f5ece4",
    borderRadius: 999,
    padding: 4,
    gap: 4,
    marginBottom: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },
  toggleBtnActive: { backgroundColor: "white" },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: "#7a5f5f" },
  toggleLabelActive: { color: "#1f1414" },

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

  linkLabel: {
    color: "#e8634d",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 8,
  },
});
