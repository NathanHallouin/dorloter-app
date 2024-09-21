/**
 * Écran "Contacter le refuge" — `/pet/[id]/contact`.
 *
 * Formulaire minimal : header (pet + refuge), textarea pré-remplie avec
 * un message générique modifiable, bouton "Envoyer". Au submit, POST
 * /conversations puis navigation vers le thread.
 *
 * Auth requise : si non connecté, on redirige vers /login.
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [message, setMessage] = useState("");

  const tokenQuery = useQuery({
    queryKey: ["auth", "token"],
    queryFn: getAuthToken,
  });

  const petQuery = useQuery({
    enabled: !!id,
    queryKey: ["pet", id],
    queryFn: async () => {
      const { data, error } = await api.GET("/pets/{id}", {
        params: { path: { id: id! } },
      });
      if (error) throw new Error(error.error.message);
      return data.data;
    },
  });

  useEffect(() => {
    if (petQuery.data && message === "") {
      setMessage(
        `Bonjour, je m'intéresse à ${petQuery.data.name}. ` +
          `Pourriez-vous me donner plus d'informations sur son caractère et ` +
          `sa procédure d'adoption ?`
      );
    }
  }, [petQuery.data, message]);

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!petQuery.data?.shelter) {
        throw new Error("Refuge inconnu pour cet animal.");
      }
      const { data, error } = await api.POST("/conversations", {
        body: {
          shelterId: petQuery.data.shelter.id,
          petId: petQuery.data.id,
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

  if (tokenQuery.isPending || petQuery.isPending) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Contacter" }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (!tokenQuery.data) {
    return <Redirect href="/login" />;
  }

  if (petQuery.isError || !petQuery.data) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Contacter" }} />
        <Text style={styles.errorTitle}>Animal introuvable</Text>
        <Text style={styles.errorBody}>{petQuery.error?.message}</Text>
      </View>
    );
  }

  const pet = petQuery.data;
  const canSend =
    message.trim().length >= MIN_LEN &&
    message.trim().length <= MAX_LEN &&
    !sendMut.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: `Contacter ${pet.shelter?.name ?? ""}` }} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.heading}>
            Tu écris à {pet.shelter?.name ?? "ce refuge"}
          </Text>
          <Text style={styles.subheading}>
            Au sujet de {pet.name}. Le refuge reçoit ce premier message et te
            répondra dans les meilleurs délais.
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
          placeholder="Présente-toi, raconte ton foyer, ton expérience…"
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
    gap: 16,
  },
  scroll: { padding: 20, gap: 16 },

  header: { gap: 6 },
  heading: { fontSize: 20, fontWeight: "700", color: "#1f1414" },
  subheading: { fontSize: 14, color: "#7a5f5f", lineHeight: 20 },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f1414",
    textAlign: "center",
  },

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
