/**
 * Onglet Signalements — perdus / trouvés.
 *
 * Scaffold : liste sans géoloc ni carte. La carte MapLibre RN, les
 * filtres (rayon, espèce) et le détail viennent en session 3.
 */

import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

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
          <Text style={styles.type}>
            {item.type === "perdu" ? "Perdu" : "Trouvé"}
            {" · "}
            {item.species}
          </Text>
          <Text style={styles.name}>{item.petName ?? "Animal sans nom"}</Text>
          <Text style={styles.meta}>
            {item.address ?? "Lieu non précisé"} — {item.dateEvent}
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
  type: { fontSize: 12, fontWeight: "700", color: "#e8634d", textTransform: "uppercase" },
  name: { marginTop: 4, fontSize: 18, fontWeight: "600", color: "#1f1414" },
  meta: { marginTop: 2, fontSize: 14, color: "#7a5f5f" },
  empty: { textAlign: "center", color: "#7a5f5f" },
  errorTitle: { fontSize: 16, fontWeight: "600", color: "#1f1414", marginBottom: 4 },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
