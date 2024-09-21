/**
 * Onglet Pensions — annuaire des pensions professionnelles agréées.
 *
 * MVP mobile : liste paginée (cursor-based), recherche texte, filtres
 * chat/chien. Pas de map ni de filtres par services en mobile en MVP
 * (le formulaire bottom-sheet viendra plus tard).
 *
 * Seules les pensions vérifiées (SIRET + agrément validés par l'admin
 * plateforme) sont retournées par l'API publique.
 */

import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type SpeciesFilter = "all" | "cat" | "dog";

export default function PensionsScreen() {
  const [search, setSearch] = useState("");
  const [species, setSpecies] = useState<SpeciesFilter>("all");

  const pensionsQuery = useQuery({
    queryKey: ["pensions", { search: search.trim(), species }],
    queryFn: async () => {
      const trimmed = search.trim();
      const { data, error } = await api.GET("/pensions", {
        params: {
          query: {
            search: trimmed.length > 0 ? trimmed : undefined,
            acceptsCats: species === "cat" ? true : undefined,
            acceptsDogs: species === "dog" ? true : undefined,
            limit: 30,
          },
        },
      });
      if (error) throw new Error(error.error.message);
      return data;
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.filtersBar}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={18} color="#a08585" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une pension…"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <View style={styles.toggleRow}>
          <FilterChip
            label="Toutes"
            active={species === "all"}
            onPress={() => setSpecies("all")}
          />
          <FilterChip
            icon="cat"
            label="Chats"
            active={species === "cat"}
            onPress={() => setSpecies("cat")}
          />
          <FilterChip
            icon="dog"
            label="Chiens"
            active={species === "dog"}
            onPress={() => setSpecies("dog")}
          />
        </View>
      </View>

      {pensionsQuery.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : pensionsQuery.isError ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Impossible de charger les pensions</Text>
          <Text style={styles.errorBody}>{pensionsQuery.error.message}</Text>
        </View>
      ) : (
        <FlatList
          data={pensionsQuery.data.data}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons
                name="home-search-outline"
                size={48}
                color="#c4a89c"
              />
              <Text style={styles.emptyTitle}>Aucune pension trouvée</Text>
              <Text style={styles.emptyBody}>
                Essaye d'élargir tes filtres ou ta recherche.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={pensionsQuery.isRefetching}
              onRefresh={pensionsQuery.refetch}
              tintColor="#e8634d"
            />
          }
          renderItem={({ item }) => (
            <Link href={`/pension/${item.slug}`} asChild>
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
                  style={styles.cover}
                />
                <View style={styles.body}>
                  <View style={styles.titleRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.rating ? (
                      <View style={styles.ratingPill}>
                        <MaterialCommunityIcons
                          name="star"
                          size={12}
                          color="#c98a2b"
                        />
                        <Text style={styles.ratingText}>
                          {item.rating.average.toFixed(1)}
                        </Text>
                      </View>
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
                  <View style={styles.speciesRow}>
                    {item.acceptsCats ? (
                      <SpeciesPill icon="cat" price={item.pricePerDayCat} />
                    ) : null}
                    {item.acceptsDogs ? (
                      <SpeciesPill icon="dog" price={item.pricePerDayDog} />
                    ) : null}
                  </View>
                </View>
              </Pressable>
            </Link>
          )}
        />
      )}
    </View>
  );
}

// ─── Sous-composants ────────────────────────────────────────────────────────

function FilterChip({
  icon,
  label,
  active,
  onPress,
}: {
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={14}
          color={active ? "white" : "#7a5f5f"}
        />
      ) : null}
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SpeciesPill({
  icon,
  price,
}: {
  icon: "cat" | "dog";
  price?: number | null;
}) {
  return (
    <View style={styles.speciesPill}>
      <MaterialCommunityIcons name={icon} size={13} color="#7a5f5f" />
      {price ? (
        <Text style={styles.speciesPrice}>
          {price.toLocaleString("fr-FR", {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
          })}
          /j
        </Text>
      ) : null}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },

  filtersBar: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderColor: "#f0e4dc",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f5ece4",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1f1414",
  },
  toggleRow: { flexDirection: "row", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e6d4c8",
    backgroundColor: "white",
  },
  chipActive: { backgroundColor: "#e8634d", borderColor: "#e8634d" },
  chipLabel: { fontSize: 13, fontWeight: "600", color: "#7a5f5f" },
  chipLabelActive: { color: "white" },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 8,
  },
  list: { padding: 16, gap: 12 },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0e4dc",
    overflow: "hidden",
  },
  cover: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#f5ece4",
  },
  body: { padding: 14, gap: 6 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: { fontSize: 17, fontWeight: "700", color: "#1f1414", flex: 1 },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fff5d8",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  ratingText: { fontSize: 12, color: "#c98a2b", fontWeight: "700" },

  addressRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  address: { fontSize: 13, color: "#7a5f5f", flex: 1 },

  description: { fontSize: 13, color: "#564545", lineHeight: 18 },

  speciesRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  speciesPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f5ece4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  speciesPrice: { fontSize: 12, color: "#1f1414", fontWeight: "600" },

  empty: { padding: 32, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#1f1414" },
  emptyBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },

  errorTitle: { fontSize: 16, fontWeight: "600", color: "#1f1414" },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
