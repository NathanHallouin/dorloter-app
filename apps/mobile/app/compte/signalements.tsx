/**
 * Mes signalements — `/compte/signalements`.
 *
 * Liste paginée des signalements créés par l'utilisateur (tous statuts).
 * Badges colorés par statut (actif/résolu/expiré) et type (perdu/trouvé).
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

const STATUS_STYLE: Record<
  "actif" | "resolu" | "expire",
  { label: string; bg: string; color: string }
> = {
  actif: { label: "Actif", bg: "#fde4dc", color: "#c43e1f" },
  resolu: { label: "Résolu", bg: "#dceee4", color: "#4a9d7a" },
  expire: { label: "Expiré", bg: "#ece6df", color: "#7a5f5f" },
};

export default function MesSignalementsScreen() {
  const tokenQuery = useQuery({
    queryKey: ["auth", "token"],
    queryFn: getAuthToken,
  });

  const reportsQuery = useQuery({
    enabled: !!tokenQuery.data,
    queryKey: ["me", "reports"],
    queryFn: async () => {
      const { data, error } = await api.GET("/me/reports", {
        params: { query: { limit: 50 } },
      });
      if (error) throw new Error(error.error.message);
      return data;
    },
  });

  if (tokenQuery.isPending) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Mes signalements" }} />
        <ActivityIndicator />
      </View>
    );
  }
  if (!tokenQuery.data) return <Redirect href="/login" />;

  if (reportsQuery.isPending) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Mes signalements" }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (reportsQuery.isError) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Mes signalements" }} />
        <Text style={styles.errorTitle}>
          Impossible de charger les signalements
        </Text>
        <Text style={styles.errorBody}>{reportsQuery.error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Mes signalements" }} />
      <FlatList
        data={reportsQuery.data.data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons
              name="map-marker-question-outline"
              size={48}
              color="#c4a89c"
            />
            <Text style={styles.emptyTitle}>Aucun signalement</Text>
            <Text style={styles.emptyBody}>
              Tape sur le bouton ➕ de l'onglet Signalements pour créer un
              premier signalement perdu ou trouvé.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={reportsQuery.isRefetching}
            onRefresh={reportsQuery.refetch}
            tintColor="#e8634d"
          />
        }
        renderItem={({ item }) => {
          const status = STATUS_STYLE[item.status];
          return (
            <Link href={`/report/${item.id}`} asChild>
              <Pressable style={styles.card}>
                {item.primaryPhoto ? (
                  <Image
                    source={{ uri: item.primaryPhoto.url }}
                    placeholder={
                      item.primaryPhoto.blurDataUrl
                        ? { uri: item.primaryPhoto.blurDataUrl }
                        : undefined
                    }
                    contentFit="cover"
                    transition={250}
                    style={styles.photo}
                  />
                ) : (
                  <View style={[styles.photo, styles.photoFallback]}>
                    <MaterialCommunityIcons
                      name={item.species === "chat" ? "cat" : "dog"}
                      size={32}
                      color="#c4a89c"
                    />
                  </View>
                )}
                <View style={styles.body}>
                  <View style={styles.tagRow}>
                    <View
                      style={[
                        styles.typeTag,
                        item.type === "perdu"
                          ? styles.tagPerdu
                          : styles.tagTrouve,
                      ]}
                    >
                      <Text style={styles.typeLabel}>
                        {item.type === "perdu" ? "Perdu" : "Trouvé"}
                      </Text>
                    </View>
                    <View
                      style={[styles.statusTag, { backgroundColor: status.bg }]}
                    >
                      <Text
                        style={[styles.statusLabel, { color: status.color }]}
                      >
                        {status.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.petName ?? "Animal sans nom"}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.address ?? "Lieu non précisé"} · {item.dateEvent}
                  </Text>
                </View>
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
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0e4dc",
    overflow: "hidden",
  },
  photo: { width: 100, height: 100, backgroundColor: "#f5ece4" },
  photoFallback: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1, padding: 12, gap: 4, justifyContent: "center" },
  tagRow: { flexDirection: "row", gap: 6 },
  typeTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  tagPerdu: { backgroundColor: "#fde4dc" },
  tagTrouve: { backgroundColor: "#dceee4" },
  typeLabel: { fontSize: 11, fontWeight: "700", color: "#1f1414" },
  statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusLabel: { fontSize: 11, fontWeight: "700" },
  name: { fontSize: 15, fontWeight: "600", color: "#1f1414" },
  meta: { fontSize: 12, color: "#7a5f5f" },

  empty: { paddingVertical: 48, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#1f1414" },
  emptyBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },

  errorTitle: { fontSize: 16, fontWeight: "600", color: "#1f1414" },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
