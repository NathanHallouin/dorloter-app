/**
 * Onglet Adopter — catalogue d'animaux à adopter.
 *
 * Scaffold : récupère la première page via l'API et affiche les noms.
 * Vrai design (cards, swipe deck, filtres) en session 3.
 */

import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

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
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>
            {item.species} · {item.sex} · {item.ageCategory ?? "âge inconnu"}
          </Text>
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
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0e4dc",
  },
  name: { fontSize: 18, fontWeight: "600", color: "#1f1414" },
  meta: { marginTop: 4, fontSize: 14, color: "#7a5f5f" },
  empty: { textAlign: "center", color: "#7a5f5f" },
  errorTitle: { fontSize: 16, fontWeight: "600", color: "#1f1414", marginBottom: 4 },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
