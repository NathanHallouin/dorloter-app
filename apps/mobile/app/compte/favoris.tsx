/**
 * Mes favoris — `/compte/favoris`.
 *
 * Liste des animaux favorisés (incluant ceux passés en `reserve` /
 * `adopte` pour suivre leur sort). Tap → fiche pet.
 */

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Link, Redirect, Stack } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

const STATUS_LABEL: Record<
  "disponible" | "reserve" | "adopte" | "retire",
  { label: string; color: string } | null
> = {
  disponible: null,
  reserve: { label: "Réservé", color: "#c98a2b" },
  adopte: { label: "Adopté", color: "#4a9d7a" },
  retire: { label: "Retiré", color: "#a08585" },
};

export default function MesFavorisScreen() {
  const tokenQuery = useQuery({
    queryKey: ["auth", "token"],
    queryFn: getAuthToken,
  });

  const favoritesQuery = useQuery({
    enabled: !!tokenQuery.data,
    queryKey: ["me", "favorites", "pets"],
    queryFn: async () => {
      const { data, error } = await api.GET("/me/favorites/pets");
      if (error) throw new Error(error.error.message);
      return data.data;
    },
  });

  if (tokenQuery.isPending) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Mes favoris" }} />
        <ActivityIndicator />
      </View>
    );
  }
  if (!tokenQuery.data) return <Redirect href="/login" />;

  if (favoritesQuery.isPending) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Mes favoris" }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (favoritesQuery.isError) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Mes favoris" }} />
        <Text style={styles.errorTitle}>Impossible de charger les favoris</Text>
        <Text style={styles.errorBody}>{favoritesQuery.error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Mes favoris" }} />
      <FlatList
        data={favoritesQuery.data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons
              name="heart-outline"
              size={48}
              color="#c4a89c"
            />
            <Text style={styles.emptyTitle}>Aucun favori pour l'instant</Text>
            <Text style={styles.emptyBody}>
              Appuie sur le cœur d'une fiche pour l'ajouter ici.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={favoritesQuery.isRefetching}
            onRefresh={favoritesQuery.refetch}
            tintColor="#e8634d"
          />
        }
        renderItem={({ item }) => {
          const status = STATUS_LABEL[item.status];
          return (
            <Link href={`/pet/${item.id}`} asChild>
              <Pressable style={styles.card}>
                <Image
                  source={
                    item.primaryPhoto?.url
                      ? { uri: item.primaryPhoto.url }
                      : undefined
                  }
                  placeholder={
                    item.primaryPhoto?.blurDataUrl
                      ? { uri: item.primaryPhoto.blurDataUrl }
                      : undefined
                  }
                  contentFit="cover"
                  transition={250}
                  style={styles.photo}
                />
                <View style={styles.body}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.species === "chat" ? "Chat" : "Chien"}
                    {item.breed ? ` · ${item.breed}` : ""}
                    {item.ageCategory ? ` · ${item.ageCategory}` : ""}
                  </Text>
                  {status ? (
                    <View
                      style={[styles.statusPill, { backgroundColor: status.color }]}
                    >
                      <Text style={styles.statusLabel}>{status.label}</Text>
                    </View>
                  ) : null}
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color="#a08585"
                />
              </Pressable>
            </Link>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 8,
  },
  list: { padding: 16, gap: 10 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0e4dc",
    padding: 10,
    gap: 12,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: "#f5ece4",
  },
  body: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: "600", color: "#1f1414" },
  meta: { fontSize: 13, color: "#7a5f5f" },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 4,
  },
  statusLabel: { fontSize: 11, color: "white", fontWeight: "700" },

  empty: { paddingVertical: 48, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#1f1414" },
  emptyBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },

  errorTitle: { fontSize: 16, fontWeight: "600", color: "#1f1414" },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
