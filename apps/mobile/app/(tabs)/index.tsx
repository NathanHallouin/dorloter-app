/**
 * Onglet Adopter — catalogue d'animaux à adopter ET annuaire des refuges.
 *
 * Toggle "Animaux | Refuges" en haut (même pattern que Signalements).
 * Le mode "animaux" est l'expérience principale ; le mode "refuges" est
 * pour les utilisateurs qui veulent explorer un refuge précis.
 *
 * - Animaux : FlatList de cards (photo + cœur favori + sexe + refuge)
 * - Refuges : FlatList de cards (cover/logo + nom + badge "Vérifié" +
 *   address + stats disponibles/adoptés)
 */

import { useState } from "react";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

type Mode = "pets" | "shelters";

const SPECIES_LABEL: Record<"chat" | "chien", string> = {
  chat: "Chat",
  chien: "Chien",
};

const SEX_ICON: Record<
  "male" | "femelle" | "inconnu",
  React.ComponentProps<typeof MaterialCommunityIcons>["name"]
> = {
  male: "gender-male",
  femelle: "gender-female",
  inconnu: "help-circle-outline",
};

const FAVORITES_KEY = ["me", "favorites"] as const;

interface FavoritesPayload {
  petIds: string[];
}

export default function AdopterScreen() {
  const [mode, setMode] = useState<Mode>("pets");

  return (
    <View style={styles.container}>
      <ModeToggle mode={mode} onChange={setMode} />
      {mode === "pets" ? <PetsView /> : <SheltersView />}
    </View>
  );
}

// ─── Mode toggle ────────────────────────────────────────────────────────────

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <View style={styles.toggleBar}>
      <Pressable
        style={[styles.toggleBtn, mode === "pets" && styles.toggleBtnActive]}
        onPress={() => onChange("pets")}
      >
        <MaterialCommunityIcons
          name="paw"
          size={16}
          color={mode === "pets" ? "#1f1414" : "#7a5f5f"}
        />
        <Text
          style={[
            styles.toggleLabel,
            mode === "pets" && styles.toggleLabelActive,
          ]}
        >
          Animaux
        </Text>
      </Pressable>
      <Pressable
        style={[styles.toggleBtn, mode === "shelters" && styles.toggleBtnActive]}
        onPress={() => onChange("shelters")}
      >
        <MaterialCommunityIcons
          name="home-heart"
          size={16}
          color={mode === "shelters" ? "#1f1414" : "#7a5f5f"}
        />
        <Text
          style={[
            styles.toggleLabel,
            mode === "shelters" && styles.toggleLabelActive,
          ]}
        >
          Refuges
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Mode "animaux" ─────────────────────────────────────────────────────────

function PetsView() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filtres optionnels passés via query params (depuis le quiz adoption
  // ou d'autres entry points). Tous facultatifs ; si absents → liste
  // complète.
  const params = useLocalSearchParams<{
    species?: "chat" | "chien";
    okWithCats?: "oui";
    okWithDogs?: "oui";
    okWithChildren?: "oui";
  }>();

  const filters = {
    species: params.species,
    okWithCats: params.okWithCats === "oui" ? true : undefined,
    okWithDogs: params.okWithDogs === "oui" ? true : undefined,
    okWithChildren: params.okWithChildren === "oui" ? true : undefined,
  };
  const hasFilters = Object.values(filters).some((v) => v !== undefined);

  const tokenQuery = useQuery({
    queryKey: ["auth", "token"],
    queryFn: getAuthToken,
  });
  const isAuthed = !!tokenQuery.data;

  const petsQuery = useQuery({
    queryKey: ["pets", { limit: 20, ...filters }],
    queryFn: async () => {
      const { data, error } = await api.GET("/pets", {
        params: { query: { limit: 20, ...filters } },
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
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <View style={styles.actionsRow}>
            <Link href="/adopter/quiz" asChild>
              <Pressable style={styles.actionCard}>
                <MaterialCommunityIcons
                  name="lightbulb-on-outline"
                  size={22}
                  color="#7065a8"
                />
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionTitle}>Quiz adoption</Text>
                  <Text style={styles.actionSubtitle}>
                    Trouve l'animal qui te correspond
                  </Text>
                </View>
              </Pressable>
            </Link>
            <Link href="/adopter/swipe" asChild>
              <Pressable style={styles.actionCard}>
                <MaterialCommunityIcons
                  name="cards-outline"
                  size={22}
                  color="#e8634d"
                />
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionTitle}>Mode swipe</Text>
                  <Text style={styles.actionSubtitle}>
                    Découvre en mode Tinder
                  </Text>
                </View>
              </Pressable>
            </Link>
          </View>
          {hasFilters ? (
            <View style={styles.filterBanner}>
              <MaterialCommunityIcons
                name="filter-variant"
                size={16}
                color="#e8634d"
              />
              <Text style={styles.filterBannerLabel}>
                Filtres actifs (issus du quiz)
              </Text>
              <Pressable onPress={() => router.replace("/")}>
                <Text style={styles.filterBannerClear}>Effacer</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>Aucun animal disponible pour le moment.</Text>
      }
      refreshControl={
        <RefreshControl
          refreshing={petsQuery.isRefetching}
          onRefresh={petsQuery.refetch}
          tintColor="#e8634d"
        />
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
                style={styles.petPhoto}
              />
              <Pressable
                testID={
                  favoriteSet.has(item.id)
                    ? "pet-card-heart-active"
                    : "pet-card-heart"
                }
                style={styles.heart}
                onPress={() => handleToggleFavorite(item.id)}
                hitSlop={10}
              >
                <MaterialCommunityIcons
                  name={favoriteSet.has(item.id) ? "heart" : "heart-outline"}
                  size={22}
                  color={favoriteSet.has(item.id) ? "#e8634d" : "#7a5f5f"}
                />
              </Pressable>
            </View>
            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <MaterialCommunityIcons
                  name={SEX_ICON[item.sex]}
                  size={18}
                  color="#7a5f5f"
                />
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {SPECIES_LABEL[item.species]}
                {item.breed ? ` · ${item.breed}` : ""}
                {item.ageCategory ? ` · ${item.ageCategory}` : ""}
              </Text>
              {item.shelter ? (
                <Text style={styles.shelterLine} numberOfLines={1}>
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

// ─── Mode "refuges" ─────────────────────────────────────────────────────────

function SheltersView() {
  const sheltersQuery = useQuery({
    queryKey: ["shelters", { verifiedOnly: true }],
    queryFn: async () => {
      const { data, error } = await api.GET("/shelters", {
        params: { query: { verifiedOnly: true, limit: 30 } },
      });
      if (error) throw new Error(error.error.message);
      return data;
    },
  });

  if (sheltersQuery.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (sheltersQuery.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Impossible de charger les refuges</Text>
        <Text style={styles.errorBody}>{sheltersQuery.error.message}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={sheltersQuery.data.data}
      keyExtractor={(s) => s.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <Text style={styles.empty}>Aucun refuge pour le moment.</Text>
      }
      refreshControl={
        <RefreshControl
          refreshing={sheltersQuery.isRefetching}
          onRefresh={sheltersQuery.refetch}
          tintColor="#e8634d"
        />
      }
      renderItem={({ item }) => (
        <Link href={`/shelter/${item.slug}`} asChild>
          <Pressable style={styles.card}>
            <Image
              source={
                item.coverUrl
                  ? { uri: item.coverUrl }
                  : item.logoUrl
                    ? { uri: item.logoUrl }
                    : undefined
              }
              contentFit="cover"
              transition={250}
              style={styles.shelterCover}
            />
            <View style={styles.body}>
              <View style={styles.shelterTitleRow}>
                <Text style={styles.shelterName} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.isVerified ? (
                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={16}
                    color="#4a9d7a"
                  />
                ) : null}
              </View>
              {item.address ? (
                <View style={styles.addressRow}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={13}
                    color="#7a5f5f"
                  />
                  <Text style={styles.address} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>
              ) : null}
              {item.description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
              <View style={styles.statsRow}>
                <Stat icon="paw" value={item.available} label="à adopter" />
                <Stat icon="home-heart" value={item.adopted} label="adoptés" />
              </View>
            </View>
          </Pressable>
        </Link>
      )}
    />
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  value: number;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <MaterialCommunityIcons name={icon} size={14} color="#7a5f5f" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  toggleBar: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: "#f0e4dc",
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderColor: "transparent",
  },
  toggleBtnActive: { borderColor: "#e8634d" },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: "#7a5f5f" },
  toggleLabelActive: { color: "#1f1414" },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  list: { padding: 16, gap: 12 },

  headerBlock: { gap: 10, marginBottom: 4 },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0e4dc",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionTextCol: { flex: 1 },
  actionTitle: { fontSize: 13, fontWeight: "700", color: "#1f1414" },
  actionSubtitle: { fontSize: 11, color: "#7a5f5f", marginTop: 1 },

  filterBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff5f1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterBannerLabel: { flex: 1, fontSize: 13, color: "#1f1414" },
  filterBannerClear: {
    color: "#e8634d",
    fontSize: 13,
    fontWeight: "600",
  },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0e4dc",
    overflow: "hidden",
  },

  // Pets
  petPhoto: {
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
  body: { padding: 14, gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 18, fontWeight: "600", color: "#1f1414", flex: 1 },
  meta: { fontSize: 14, color: "#7a5f5f" },
  shelterLine: { fontSize: 13, color: "#a08585", marginTop: 2 },

  // Shelters
  shelterCover: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#f5ece4",
  },
  shelterTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shelterName: { fontSize: 17, fontWeight: "700", color: "#1f1414", flex: 1 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  address: { fontSize: 13, color: "#7a5f5f", flex: 1 },
  description: { fontSize: 13, color: "#564545", lineHeight: 18, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 14, marginTop: 6 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statValue: { fontSize: 14, color: "#1f1414", fontWeight: "700" },
  statLabel: { fontSize: 12, color: "#7a5f5f" },

  empty: { textAlign: "center", color: "#7a5f5f" },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f1414",
    marginBottom: 4,
  },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
