/**
 * Mes candidatures · `/compte/candidatures`.
 *
 * Liste des candidatures d'adoption avec le résumé de l'animal concerné
 * et le statut de la candidature (envoyée / en cours / acceptée / refusée
 * / annulée). Tap → fiche animal.
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
  "envoyee" | "en_cours" | "acceptee" | "refusee" | "annulee",
  { label: string; bg: string; color: string }
> = {
  envoyee: { label: "Envoyée", bg: "#fff5d8", color: "#c98a2b" },
  en_cours: { label: "En cours", bg: "#e7e2f3", color: "#7065a8" },
  acceptee: { label: "Acceptée", bg: "#dceee4", color: "#4a9d7a" },
  refusee: { label: "Refusée", bg: "#fde4dc", color: "#c43e1f" },
  annulee: { label: "Annulée", bg: "#ece6df", color: "#7a5f5f" },
};

export default function MesCandidaturesScreen() {
  const tokenQuery = useQuery({
    queryKey: ["auth", "token"],
    queryFn: getAuthToken,
  });

  const applicationsQuery = useQuery({
    enabled: !!tokenQuery.data,
    queryKey: ["me", "applications"],
    queryFn: async () => {
      const { data, error } = await api.GET("/me/applications");
      if (error) throw new Error(error.error.message);
      return data.data;
    },
  });

  if (tokenQuery.isPending) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Mes candidatures" }} />
        <ActivityIndicator />
      </View>
    );
  }
  if (!tokenQuery.data) return <Redirect href="/login" />;

  if (applicationsQuery.isPending) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Mes candidatures" }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (applicationsQuery.isError) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Mes candidatures" }} />
        <Text style={styles.errorTitle}>
          Impossible de charger les candidatures
        </Text>
        <Text style={styles.errorBody}>
          {applicationsQuery.error.message}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Mes candidatures" }} />
      <FlatList
        data={applicationsQuery.data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons
              name="file-document-outline"
              size={48}
              color="#c4a89c"
            />
            <Text style={styles.emptyTitle}>Aucune candidature</Text>
            <Text style={styles.emptyBody}>
              Trouve un animal qui te plaît, puis tape "Postuler pour adopter"
              sur sa fiche.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={applicationsQuery.isRefetching}
            onRefresh={applicationsQuery.refetch}
            tintColor="#e8634d"
          />
        }
        renderItem={({ item }) => {
          const status = STATUS_STYLE[item.status];
          return (
            <Link href={`/pet/${item.pet.id}`} asChild>
              <Pressable style={styles.card}>
                {item.pet.primaryPhotoUrl ? (
                  <Image
                    source={{ uri: item.pet.primaryPhotoUrl }}
                    contentFit="cover"
                    transition={250}
                    style={styles.photo}
                  />
                ) : (
                  <View style={[styles.photo, styles.photoFallback]}>
                    <MaterialCommunityIcons
                      name={item.pet.species === "chat" ? "cat" : "dog"}
                      size={32}
                      color="#c4a89c"
                    />
                  </View>
                )}
                <View style={styles.body}>
                  <View
                    style={[styles.statusTag, { backgroundColor: status.bg }]}
                  >
                    <Text style={[styles.statusLabel, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.pet.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.pet.species === "chat" ? "Chat" : "Chien"}
                    {item.pet.breed ? ` · ${item.pet.breed}` : ""}
                  </Text>
                  <Text style={styles.date}>
                    Envoyée le {formatDate(item.createdAt)}
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
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
  photo: { width: 100, height: 110, backgroundColor: "#f5ece4" },
  photoFallback: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1, padding: 12, gap: 4, justifyContent: "center" },
  statusTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusLabel: { fontSize: 11, fontWeight: "700" },
  name: { fontSize: 15, fontWeight: "600", color: "#1f1414" },
  meta: { fontSize: 13, color: "#7a5f5f" },
  date: { fontSize: 12, color: "#a08585", marginTop: 4 },

  empty: { paddingVertical: 48, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#1f1414" },
  emptyBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },

  errorTitle: { fontSize: 16, fontWeight: "600", color: "#1f1414" },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
