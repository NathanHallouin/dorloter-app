/**
 * Écran "Contacter ce refuge" · `/shelter/[slug]/contact`.
 *
 * Formulaire minimal pour démarrer une conversation avec un refuge sans
 * passer par un animal précis (question générale : visite, processus
 * d'adoption, partenariat famille d'accueil, etc.).
 *
 * Le payload `POST /conversations` envoie `shelterId` sans `petId` · le
 * service côté serveur upsert la conversation par (user, shelter, null)
 * et y attache le premier message.
 *
 * Auth requise.
 */

import { useEffect, useState } from "react";
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
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

const MIN_LEN = 10;
const MAX_LEN = 2000;

export default function ContactShelterScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [message, setMessage] = useState("");

  const tokenQuery = useQuery({
    queryKey: ["auth", "token"],
    queryFn: getAuthToken,
  });

  const shelterQuery = useQuery({
    enabled: !!slug,
    queryKey: ["shelter", slug],
    queryFn: async () => {
      const { data, error } = await api.GET("/shelters/{slug}", {
        params: { path: { slug: slug! } },
      });
      if (error) throw new Error(error.error.message);
      return data.data;
    },
  });

  useEffect(() => {
    if (shelterQuery.data && message === "") {
      setMessage(
        `Bonjour, je suis intéressé·e pour en savoir plus sur votre refuge ` +
          `et votre processus d'adoption. Pourriez-vous m'orienter ?`
      );
    }
  }, [shelterQuery.data, message]);

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!shelterQuery.data) throw new Error("Refuge introuvable.");
      const { data, error } = await api.POST("/conversations", {
        body: {
          shelterId: shelterQuery.data.id,
          firstMessage: message.trim(),
        },
      });
      if (error) throw new Error(error.error.message);
      return data.data;
    },
    onSuccess: (result) => {
      router.replace(`/messages/${result.conversationId}`);
    },
    onError: (err) => {
      Alert.alert("Envoi impossible", err.message);
    },
  });

  if (tokenQuery.isPending || shelterQuery.isPending) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Contacter" }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (!tokenQuery.data) return <Redirect href="/login" />;

  if (shelterQuery.isError || !shelterQuery.data) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Contacter" }} />
        <Text style={styles.errorTitle}>Refuge introuvable</Text>
        <Text style={styles.errorBody}>{shelterQuery.error?.message}</Text>
      </View>
    );
  }

  const shelter = shelterQuery.data;
  const canSend =
    message.trim().length >= MIN_LEN &&
    message.trim().length <= MAX_LEN &&
    !sendMut.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: `Contacter ${shelter.name}` }} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.heading}>Tu écris à {shelter.name}</Text>
          <Text style={styles.subheading}>
            Un bénévole te répondra dès que possible. Évite les questions sur
            un animal en particulier ici · passe par la fiche de l'animal
            pour ça (un fil dédié sera créé).
          </Text>
        </View>

        <TextInput
          style={styles.textarea}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          maxLength={MAX_LEN}
          textAlignVertical="top"
          editable={!sendMut.isPending}
          placeholder="Présente-toi, explique ta démarche…"
        />

        <Text style={styles.counter}>
          {message.length} / {MAX_LEN} caractères · minimum {MIN_LEN}
        </Text>

        <Pressable
          style={[styles.cta, !canSend && styles.ctaDisabled]}
          onPress={() => canSend && sendMut.mutate()}
          disabled={!canSend}
        >
          {sendMut.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.ctaLabel}>Envoyer</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  scroll: { padding: 20, gap: 16 },

  header: { gap: 6 },
  heading: { fontSize: 20, fontWeight: "700", color: "#1f1414" },
  subheading: { fontSize: 14, color: "#7a5f5f", lineHeight: 20 },

  textarea: {
    minHeight: 160,
    padding: 14,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e6d4c8",
    fontSize: 15,
    color: "#1f1414",
    lineHeight: 22,
  },
  counter: { fontSize: 12, color: "#a08585", textAlign: "right" },

  cta: {
    backgroundColor: "#e8634d",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
    alignItems: "center",
  },
  ctaDisabled: { backgroundColor: "#c4a89c" },
  ctaLabel: { color: "white", fontWeight: "600", fontSize: 16 },

  errorTitle: { fontSize: 18, fontWeight: "700", color: "#1f1414" },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
