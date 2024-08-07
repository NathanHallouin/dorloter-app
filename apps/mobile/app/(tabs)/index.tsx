/**
 * Onglet Adopter — catalogue d'animaux à adopter.
 *
 * Affiche une grille de cards avec photo principale (expo-image), nom,
 * espèce, sexe, âge. Chaque card utilise le LQIP base64 fourni par l'API
 * (`primaryPhoto.blurDataUrl`) comme placeholder pour un fade-in immédiat.
 *
 * Les filtres (espèce, sexe, compatibilité), le swipe deck et le détail
 * arrivent en session 3+.
 */

import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const SPECIES_LABEL: Record<"chat" | "chien", string> = {
  chat: "Chat",
  chien: "Chien",
};

const SEX_LABEL: Record<"male" | "femelle" | "inconnu", string> = {
  male: "♂",
  femelle: "♀",
  inconnu: "?",
};

export default function AdopterScreen() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["pets", { limit: 20 }],
    queryFn: async () => {
      const { data, error } = await api.GET("/pets", {
        params: { query: { limit: 20 } },
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
        <Text style={styles.errorTitle}>Impossible de charger le catalogue</Text>
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
        <Text style={styles.empty}>Aucun animal disponible pour le moment.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Image
            source={item.primaryPhoto?.url ? { uri: item.primaryPhoto.url } : undefined}
            placeholder={
              item.primaryPhoto?.blurDataUrl
                ? { uri: item.primaryPhoto.blurDataUrl }
                : undefined
            }
            placeholderContentFit="cover"
            contentFit="cover"
            transition={250}
            style={styles.photo}
          />
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.sex}>{SEX_LABEL[item.sex]}</Text>
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {SPECIES_LABEL[item.species]}
              {item.breed ? ` · ${item.breed}` : ""}
              {item.ageCategory ? ` · ${item.ageCategory}` : ""}
            </Text>
            {item.shelter ? (
              <Text style={styles.shelter} numberOfLines={1}>
                {item.shelter.name}
              </Text>
            ) : null}
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
  },
  photo: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "#f5ece4",
  },
  body: { padding: 14, gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 18, fontWeight: "600", color: "#1f1414", flex: 1 },
  sex: { fontSize: 18, color: "#7a5f5f" },
  meta: { fontSize: 14, color: "#7a5f5f" },
  shelter: { fontSize: 13, color: "#a08585", marginTop: 2 },
  empty: { textAlign: "center", color: "#7a5f5f" },
  errorTitle: { fontSize: 16, fontWeight: "600", color: "#1f1414", marginBottom: 4 },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
