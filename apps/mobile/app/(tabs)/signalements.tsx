/**
 * Onglet Signalements — perdus / trouvés.
 *
 * Affiche une liste de cards type/nom/date/lieu, avec photo principale
 * (expo-image) si fournie. Pas encore de carte ni de géoloc — vient en
 * session 3b.
 */

import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const SPECIES_LABEL: Record<"chat" | "chien", string> = {
  chat: "Chat",
  chien: "Chien",
};

export default function SignalementsScreen() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["reports", { status: "actif", limit: 20 }],
    queryFn: async () => {
      const { data, error } = await api.GET("/reports", {
        params: { query: { status: "actif", limit: 20 } },
      });
      if (error) throw new Error(error.error.message);
      return data;
    },
  });

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Impossible de charger les signalements</Text>
        <Text style={styles.errorBody}>{error.message}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data.data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <Text style={styles.empty}>Aucun signalement actif dans la zone.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          {item.primaryPhoto ? (
            <Image
              source={{ uri: item.primaryPhoto.url }}
              placeholder={
                item.primaryPhoto.blurDataUrl
                  ? { uri: item.primaryPhoto.blurDataUrl }
                  : undefined
              }
              placeholderContentFit="cover"
              contentFit="cover"
              transition={250}
              style={styles.photo}
            />
          ) : (
            <View style={[styles.photo, styles.photoFallback]}>
              <Text style={styles.photoFallbackEmoji}>
                {item.species === "chat" ? "🐱" : "🐶"}
              </Text>
            </View>
          )}
          <View style={styles.body}>
            <View style={styles.tagRow}>
              <View
                style={[
                  styles.tag,
                  item.type === "perdu" ? styles.tagPerdu : styles.tagTrouve,
                ]}
              >
                <Text style={styles.tagLabel}>
                  {item.type === "perdu" ? "Perdu" : "Trouvé"}
                </Text>
              </View>
              <Text style={styles.species}>{SPECIES_LABEL[item.species]}</Text>
            </View>
            <Text style={styles.name}>{item.petName ?? "Animal sans nom"}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {item.address ?? "Lieu non précisé"} · {item.dateEvent}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0e4dc",
    overflow: "hidden",
    flexDirection: "row",
  },
  photo: {
    width: 110,
    height: 110,
    backgroundColor: "#f5ece4",
  },
  photoFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  photoFallbackEmoji: { fontSize: 40 },
  body: { flex: 1, padding: 12, gap: 4, justifyContent: "center" },
  tagRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  tagPerdu: { backgroundColor: "#fde4dc" },
  tagTrouve: { backgroundColor: "#dceee4" },
  tagLabel: { fontSize: 11, fontWeight: "700", color: "#1f1414" },
  species: { fontSize: 13, color: "#7a5f5f" },
  name: { fontSize: 17, fontWeight: "600", color: "#1f1414" },
  meta: { fontSize: 13, color: "#7a5f5f" },
  empty: { textAlign: "center", color: "#7a5f5f" },
  errorTitle: { fontSize: 16, fontWeight: "600", color: "#1f1414", marginBottom: 4 },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
