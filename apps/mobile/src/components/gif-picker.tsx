/**
 * Picker GIF — modal plein écran avec recherche et grille de résultats.
 *
 * Utilise le proxy serveur `/api/v1/gifs/search` (clé Tenor cachée côté
 * serveur). La grille affiche les `previewUrl` (~tinygif, légers). Au tap,
 * on remonte le GIF complet (`url`) + ses métadonnées au parent qui
 * l'envoie comme attachment de message.
 *
 * Debounce 300ms sur la recherche pour éviter de spammer Tenor à chaque
 * frappe. Sans terme → tendances du moment ("featured").
 */

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@dorloter/api-client";

type GifResult = components["schemas"]["GifResult"];

export interface SelectedGif {
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  externalId: string;
}

interface GifPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (gif: SelectedGif) => void;
}

const SCREEN_W = Dimensions.get("window").width;
const COLUMN_GAP = 6;
const COLUMNS = 2;
const ITEM_W = (SCREEN_W - 16 * 2 - COLUMN_GAP) / COLUMNS;

export function GifPicker({ visible, onClose, onSelect }: GifPickerProps) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  // Debounce search input (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset quand on rouvre la modal
  useEffect(() => {
    if (visible) {
      setSearch("");
      setDebounced("");
    }
  }, [visible]);

  const gifsQuery = useQuery({
    enabled: visible,
    queryKey: ["gifs", "search", debounced],
    queryFn: async () => {
      const { data, error } = await api.GET("/gifs/search", {
        params: {
          query: debounced ? { q: debounced, limit: 24 } : { limit: 24 },
        },
      });
      if (error) throw new Error(error.error.message);
      return data.data.results;
    },
    staleTime: 60_000,
  });

  function handlePick(gif: GifResult) {
    onSelect({
      url: gif.url,
      previewUrl: gif.previewUrl,
      width: gif.width,
      height: gif.height,
      externalId: gif.id,
    });
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={22} color="#1f1414" />
          </Pressable>
          <Text style={styles.title}>Choisir un GIF</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={18} color="#a08585" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher (chien, chat, joie...)"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        {gifsQuery.isPending ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : gifsQuery.isError ? (
          <View style={styles.center}>
            <MaterialCommunityIcons
              name="cloud-off-outline"
              size={32}
              color="#c4a89c"
            />
            <Text style={styles.errorBody}>{gifsQuery.error.message}</Text>
          </View>
        ) : gifsQuery.data.length === 0 ? (
          <View style={styles.center}>
            <MaterialCommunityIcons
              name="image-off-outline"
              size={32}
              color="#c4a89c"
            />
            <Text style={styles.emptyTitle}>Aucun GIF trouvé</Text>
          </View>
        ) : (
          <FlatList
            data={gifsQuery.data}
            keyExtractor={(g) => g.id}
            numColumns={COLUMNS}
            columnWrapperStyle={{ gap: COLUMN_GAP }}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.gifTile, { width: ITEM_W }]}
                onPress={() => handlePick(item)}
              >
                <Image
                  source={{ uri: item.previewUrl }}
                  contentFit="cover"
                  transition={150}
                  style={{
                    width: ITEM_W,
                    height: ITEM_W * (item.height / item.width || 1),
                    minHeight: 100,
                  }}
                />
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={{ height: COLUMN_GAP }} />}
            keyboardShouldPersistTaps="handled"
          />
        )}

        <Text style={styles.attribution}>Powered by Tenor</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 12 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: "#f0e4dc",
  },
  closeBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontWeight: "700", color: "#1f1414" },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f5ece4",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1f1414",
  },

  grid: { paddingHorizontal: 16, paddingBottom: 8 },
  gifTile: {
    backgroundColor: "#f5ece4",
    borderRadius: 8,
    overflow: "hidden",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 15, color: "#7a5f5f", fontWeight: "500" },
  errorBody: { fontSize: 13, color: "#7a5f5f", textAlign: "center" },

  attribution: {
    fontSize: 11,
    color: "#a08585",
    textAlign: "center",
    paddingVertical: 8,
    backgroundColor: "#fafafa",
  },
});
