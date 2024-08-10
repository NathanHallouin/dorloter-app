/**
 * Onglet Adopter — catalogue d'animaux à adopter.
 *
 * Cards avec photo (expo-image + LQIP), nom, espèce, sexe, âge, refuge.
 * Bouton cœur en overlay pour favoriser : optimistic update via
 * TanStack Query (rollback en cas d'erreur réseau). L'icône est masquée
 * pour les users non connectés — clic invite à se logger.
 */

import { Link, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

const SPECIES_LABEL: Record<"chat" | "chien", string> = {
  chat: "Chat",
  chien: "Chien",
};

const SEX_LABEL: Record<"male" | "femelle" | "inconnu", string> = {
  male: "♂",
  femelle: "♀",
  inconnu: "?",
};

const FAVORITES_KEY = ["me", "favorites"] as const;

interface FavoritesPayload {
  petIds: string[];
}

export default function AdopterScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const tokenQuery = useQuery({
    queryKey: ["auth", "token"],
    queryFn: getAuthToken,
  });
  const isAuthed = !!tokenQuery.data;

  const petsQuery = useQuery({
    queryKey: ["pets", { limit: 20 }],
    queryFn: async () => {
      const { data, error } = await api.GET("/pets", {
        params: { query: { limit: 20 } },
      });
      if (error) throw new Error(error.error.message);
      return data;
    },
  });

  const favoritesQuery = useQuery({
    enabled: isAuthed,
    queryKey: FAVORITES_KEY,
    queryFn: async () => {
      const { data, error } = await api.GET("/me/favorites");
      if (error) throw new Error(error.error.message);
      return data.data;
    },
  });

  const favoriteSet = new Set(favoritesQuery.data?.petIds ?? []);

  const toggleFavoriteMut = useMutation({
    mutationFn: async (petId: string) => {
      const { data, error } = await api.POST("/favorites", {
        body: { petId },
      });
      if (error) throw new Error(error.error.message);
      return data.data;
    },
    onMutate: async (petId) => {
      await queryClient.cancelQueries({ queryKey: FAVORITES_KEY });
      const previous = queryClient.getQueryData<FavoritesPayload>(FAVORITES_KEY);
      const isFav = previous?.petIds.includes(petId) ?? false;
      queryClient.setQueryData<FavoritesPayload>(FAVORITES_KEY, (old) => {
        if (!old) return { petIds: isFav ? [] : [petId] };
        return {
          petIds: isFav
            ? old.petIds.filter((id) => id !== petId)
            : [petId, ...old.petIds],
        };
      });
      return { previous };
    },
    onError: (_err, _petId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(FAVORITES_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
    },
  });

  function handleToggleFavorite(petId: string) {
    if (!isAuthed) {
      router.push("/login");
      return;
    }
    toggleFavoriteMut.mutate(petId);
  }

  if (petsQuery.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (petsQuery.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Impossible de charger le catalogue</Text>
        <Text style={styles.errorBody}>{petsQuery.error.message}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={petsQuery.data.data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <Text style={styles.empty}>Aucun animal disponible pour le moment.</Text>
      }
      renderItem={({ item }) => (
        <Link href={`/pet/${item.id}`} asChild>
          <Pressable style={styles.card}>
            <View>
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
                placeholderContentFit="cover"
                contentFit="cover"
                transition={250}
                style={styles.photo}
              />
              <Pressable
                style={styles.heart}
                onPress={() => handleToggleFavorite(item.id)}
                hitSlop={10}
              >
                <Text style={styles.heartIcon}>
                  {favoriteSet.has(item.id) ? "❤️" : "🤍"}
                </Text>
              </Pressable>
            </View>
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
          </Pressable>
        </Link>
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
  heart: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  heartIcon: { fontSize: 20 },
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
