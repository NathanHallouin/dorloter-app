/**
 * Écran auth · modal hors des tabs, deux modes.
 *
 *   - signin    : POST /api/v1/auth/login
 *   - signup    : POST /api/v1/auth/register    (+ name + password ≥ 8)
 *
 * L'API renvoie un access token court et un refresh token : les deux sont
 * persistés, le renouvellement est ensuite transparent (cf. src/lib/auth.ts).
 *
 * Pas de « mot de passe oublié » : aucun endpoint de réinitialisation n'existe
 * côté API, ni sur le web. Proposer l'écran donnerait une promesse creuse.
 *
 * Layout : KeyboardAvoidingView → header (toggle) + body scrollable (champs
 * variables selon le mode) + footer fixe en bas avec le CTA. Le CTA reste à la même position visuelle entre Connexion et
 * Inscription pour une expérience cohérente (pattern iOS/Android natif).
 *
 * Après un signin OU signup réussi, on persiste la session, on enregistre le
 * device pour les push (non-bloquant), on invalide les queries auth/me, et on
 * referme la modal.
 */

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { saveSession, setDeviceTokenId } from "@/lib/auth";
import { registerForPushNotifications } from "@/lib/notifications";

type Mode = "signin" | "signup";

/** Enveloppe `{ data }` de l'API pour /auth/login et /auth/register. */
interface AuthResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: { id: string; email: string };
  };
}

const PASSWORD_MIN = 8;

export default function LoginScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 20);

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const apiBaseUrl =
    (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
    "http://localhost:8080/api/v1";

  async function postAuth(
    path: string,
    body: Record<string, string>
  ): Promise<AuthResponse> {
    const res = await fetch(`${apiBaseUrl}/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      // Enveloppe d'erreur de l'API : { error: { code, message } }.
      const errBody = (await res.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      throw new Error(errBody?.error?.message ?? `HTTP ${res.status}`);
    }
    return (await res.json()) as AuthResponse;
  }

  async function persistSessionAndClose(tokens: AuthResponse["data"]) {
    await saveSession(tokens);
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
      const body = await postAuth("login", { email, password });
      await persistSessionAndClose(body.data);
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
      const body = await postAuth("register", { email, password, name });
      await persistSessionAndClose(body.data);
    } catch (err) {
      Alert.alert(
        "Inscription impossible",
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const ctaLabel = mode === "signin" ? "Se connecter" : "Créer mon compte";
  const ctaHandler = mode === "signin" ? handleSignin : handleSignup;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      {/* ─── Header : toggle signin / signup ───────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.toggle}>
          <Pressable
            style={[styles.toggleBtn, mode === "signin" && styles.toggleBtnActive]}
            onPress={() => setMode("signin")}
          >
            <Text
              style={[styles.toggleLabel, mode === "signin" && styles.toggleLabelActive]}
            >
              Connexion
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, mode === "signup" && styles.toggleBtnActive]}
            onPress={() => setMode("signup")}
          >
            <Text
              style={[styles.toggleLabel, mode === "signup" && styles.toggleLabelActive]}
            >
              Inscription
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ─── Body : champs (scrollable si overflow) ────────────────────── */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
            testID="auth-email-input"
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
          <View style={styles.passwordWrap}>
            <TextInput
              testID="auth-password-input"
              style={[styles.input, styles.passwordInput]}
              autoCapitalize="none"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              editable={!submitting}
            />
            <Pressable
              style={styles.passwordToggle}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={10}
              accessibilityLabel={
                showPassword
                  ? "Masquer le mot de passe"
                  : "Afficher le mot de passe"
              }
            >
              <MaterialCommunityIcons
                name={showPassword ? "eye-off" : "eye"}
                size={22}
                color="#7a5f5f"
              />
            </Pressable>
          </View>
        </Field>
      </ScrollView>

      {/* ─── Footer : CTA (toujours en bas) ────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: bottomInset }]}>
        <Pressable
          testID="auth-submit"
          style={[styles.cta, submitting && styles.ctaDisabled]}
          onPress={ctaHandler}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.ctaLabel}>{ctaLabel}</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  container: { flex: 1, backgroundColor: "white" },

  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#f5ece4",
    borderRadius: 999,
    padding: 4,
    gap: 4,
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


  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 16,
  },
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
  passwordWrap: { position: "relative", justifyContent: "center" },
  passwordInput: { paddingRight: 44 },
  passwordToggle: {
    position: "absolute",
    right: 8,
    height: "100%",
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 4,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderColor: "#f5ece4",
  },
  cta: {
    backgroundColor: "#e8634d",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  ctaDisabled: { opacity: 0.6 },
  ctaLabel: { color: "white", fontWeight: "600", fontSize: 16 },
});
