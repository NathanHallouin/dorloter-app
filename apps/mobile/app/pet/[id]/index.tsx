/**
 * Fiche détaillée d'un animal à adopter — `/pet/[id]`.
 *
 * Stack screen au-dessus des tabs (back button natif). Affiche :
 *   - galerie horizontale des photos (FlatList paginée)
 *   - nom, espèce, sexe, âge
 *   - badge statut si pas disponible
 *   - description longue
 *   - compatibilités (chat/chien/enfant)
 *   - santé (stérilisé, pucé, vacciné, FIV/FELV chat-only, indoorOnly chat-only)
 *   - frais d'adoption
 *   - card refuge
 *   - heart flottant top-right
 *   - CTA "Postuler" bottom (auth gate, désactivé si pas `disponible`)
 */

import { useMemo } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
import { api } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

const COMPAT_LABEL: Record<"oui" | "non" | "inconnu", string> = {
  oui: "Oui",
  non: "Non",
  inconnu: "À voir",
};

const STATUS_LABEL: Record<
  "disponible" | "reserve" | "adopte" | "retire",
  { label: string; color: string }
> = {
  disponible: { label: "Disponible", color: "#4a9d7a" },
  reserve: { label: "Réservé", color: "#c98a2b" },
  adopte: { label: "Adopté", color: "#7a5f5f" },
  retire: { label: "Retiré", color: "#a08585" },
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const PHOTO_HEIGHT = SCREEN_WIDTH * 0.75; // 4:3
const FAVORITES_KEY = ["me", "favorites"] as const;

interface FavoritesPayload {
  petIds: string[];
}

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const tokenQuery = useQuery({
    queryKey: ["auth", "token"],
    queryFn: getAuthToken,
  });
  const isAuthed = !!tokenQuery.data;

  const petQuery = useQuery({
    enabled: !!id,
    queryKey: ["pet", id],
    queryFn: async () => {
      const { data, error } = await api.GET("/pets/{id}", {
        params: { path: { id: id! } },
      });
      if (error) throw new Error(error.error.message);
      return data.data;
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

  const isFavorite = useMemo(
    () => (favoritesQuery.data?.petIds ?? []).includes(id ?? ""),
    [favoritesQuery.data, id]
  );

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
      const previous =
        queryClient.getQueryData<FavoritesPayload>(FAVORITES_KEY);
      const wasFav = previous?.petIds.includes(petId) ?? false;
      queryClient.setQueryData<FavoritesPayload>(FAVORITES_KEY, (old) => {
        if (!old) return { petIds: wasFav ? [] : [petId] };
        return {
          petIds: wasFav
            ? old.petIds.filter((p) => p !== petId)
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

  function handleToggleFavorite() {
    if (!isAuthed) {
      router.push("/login");
      return;
    }
    if (id) toggleFavoriteMut.mutate(id);
  }

  function handleApply() {
    if (!isAuthed) {
      router.push("/login");
      return;
    }
    if (id) router.push(`/pet/${id}/apply`);
  }

  if (petQuery.isPending) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "" }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (petQuery.isError || !petQuery.data) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "" }} />
        <Text style={styles.errorTitle}>Animal introuvable</Text>
        <Text style={styles.errorBody}>
          {petQuery.error?.message ?? "Cette fiche n'est plus disponible."}
        </Text>
      </View>
    );
  }

  const pet = petQuery.data;
  const status = STATUS_LABEL[pet.status];
  const isAvailable = pet.status === "disponible";
  const isCat = pet.species === "chat";

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: pet.name }} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ─── Galerie photos ──────────────────────────────────────────── */}
        <View>
          {pet.photos.length > 0 ? (
            <FlatList
              data={pet.photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(p) => p.id}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item.url }}
                  placeholder={
                    item.blurDataUrl ? { uri: item.blurDataUrl } : undefined
                  }
                  placeholderContentFit="cover"
                  contentFit="cover"
                  transition={250}
                  style={[styles.photo, { width: SCREEN_WIDTH }]}
                />
              )}
            />
          ) : (
            <View
              style={[
                styles.photo,
                styles.photoFallback,
                { width: SCREEN_WIDTH },
              ]}
            >
              <MaterialCommunityIcons
                name={isCat ? "cat" : "dog"}
                size={96}
                color="#c4a89c"
              />
            </View>
          )}
          <Pressable
            style={styles.heart}
            onPress={handleToggleFavorite}
            hitSlop={10}
          >
            <MaterialCommunityIcons
              name={isFavorite ? "heart" : "heart-outline"}
              size={24}
              color={isFavorite ? "#e8634d" : "#7a5f5f"}
            />
          </Pressable>
        </View>

        {/* ─── Header ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{pet.name}</Text>
            {!isAvailable ? (
              <View style={[styles.statusPill, { backgroundColor: status.color }]}>
                <Text style={styles.statusLabel}>{status.label}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.subtitle}>
            {pet.species === "chat" ? "Chat" : "Chien"}
            {pet.breed ? ` · ${pet.breed}` : ""}
            {pet.color ? ` · ${pet.color}` : ""}
            {pet.ageCategory ? ` · ${pet.ageCategory}` : ""}
            {pet.sex !== "inconnu" ? ` · ${pet.sex}` : ""}
          </Text>
        </View>

        {/* ─── Description ─────────────────────────────────────────────── */}
        {pet.description ? (
          <Section title="À propos">
            <Text style={styles.body}>{pet.description}</Text>
          </Section>
        ) : null}

        {/* ─── Compatibilité ───────────────────────────────────────────── */}
        <Section title="Compatibilité">
          <View style={styles.badgeRow}>
            <Badge icon="cat" label="chats" value={COMPAT_LABEL[pet.okWithCats]} />
            <Badge icon="dog" label="chiens" value={COMPAT_LABEL[pet.okWithDogs]} />
            <Badge
              icon="human-child"
              label="enfants"
              value={COMPAT_LABEL[pet.okWithChildren]}
            />
          </View>
        </Section>

        {/* ─── Santé ───────────────────────────────────────────────────── */}
        <Section title="Santé">
          <View style={styles.badgeRow}>
            <Badge label="Stérilisé" value={pet.isSterilized ? "Oui" : "Non"} />
            <Badge label="Vacciné" value={pet.isVaccinated ? "Oui" : "Non"} />
            <Badge label="Pucé" value={pet.isChipped ? "Oui" : "Non"} />
            {isCat && pet.fivFelv ? (
              <Badge label="FIV / FeLV" value={pet.fivFelv.replace(/_/g, " ")} />
            ) : null}
            {isCat && pet.indoorOnly !== null && pet.indoorOnly !== undefined ? (
              <Badge
                label="Vie"
                value={pet.indoorOnly ? "Intérieur" : "Avec sortie"}
              />
            ) : null}
          </View>
        </Section>

        {/* ─── Besoins spéciaux ────────────────────────────────────────── */}
        {pet.specialNeeds ? (
          <Section title="Besoins particuliers">
            <Text style={styles.body}>{pet.specialNeeds}</Text>
          </Section>
        ) : null}

        {/* ─── Frais d'adoption ────────────────────────────────────────── */}
        {pet.adoptionFee !== null && pet.adoptionFee !== undefined ? (
          <Section title="Frais d'adoption">
            <Text style={styles.body}>
              {pet.adoptionFee.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0,
              })}
            </Text>
            <Text style={styles.bodyHint}>
              Couvre les frais vétérinaires (stérilisation, vaccins, identification).
            </Text>
          </Section>
        ) : null}

        {/* ─── Refuge ──────────────────────────────────────────────────── */}
        {pet.shelter ? (
          <Section title="Refuge">
            <Pressable
              style={styles.shelterCard}
              onPress={() =>
                pet.shelter && router.push(`/shelter/${pet.shelter.slug}`)
              }
            >
              <View style={styles.shelterTextCol}>
                <View style={styles.shelterNameRow}>
                  <Text style={styles.shelterName}>{pet.shelter.name}</Text>
                  {pet.shelter.isVerified ? (
                    <MaterialCommunityIcons
                      name="check-decagram"
                      size={16}
                      color="#4a9d7a"
                    />
                  ) : null}
                </View>
                {pet.shelter.address ? (
                  <Text style={styles.shelterAddress}>
                    {pet.shelter.address}
                  </Text>
                ) : null}
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color="#a08585"
              />
            </Pressable>
            <Pressable
              style={styles.contactBtn}
              onPress={() => {
                if (!isAuthed) {
                  router.push("/login");
                  return;
                }
                if (id) router.push(`/pet/${id}/contact`);
              }}
            >
              <MaterialCommunityIcons
                name="message-text-outline"
                size={18}
                color="#e8634d"
              />
              <Text style={styles.contactBtnLabel}>Contacter le refuge</Text>
            </Pressable>
          </Section>
        ) : null}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ─── CTA flottant Postuler ─────────────────────────────────────── */}
      <View style={styles.ctaBar}>
        <Pressable
          style={[styles.cta, !isAvailable && styles.ctaDisabled]}
          onPress={handleApply}
          disabled={!isAvailable}
        >
          <Text style={styles.ctaLabel}>
            {isAvailable
              ? "Postuler pour adopter"
              : `${pet.name} n'est plus disponible`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Composants helpers ─────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Badge({
  icon,
  label,
  value,
}: {
  icon?: MCIName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.badge}>
      <View style={styles.badgeLabelRow}>
        {icon ? (
          <MaterialCommunityIcons name={icon} size={13} color="#7a5f5f" />
        ) : null}
        <Text style={styles.badgeLabel}>{label}</Text>
      </View>
      <Text style={styles.badgeValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  scroll: { paddingBottom: 24 },

  photo: { height: PHOTO_HEIGHT, backgroundColor: "#f5ece4" },
  photoFallback: { alignItems: "center", justifyContent: "center" },

  heart: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  header: { padding: 20, gap: 6, backgroundColor: "white" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: { fontSize: 28, fontWeight: "700", color: "#1f1414", flex: 1 },
  subtitle: { fontSize: 15, color: "#7a5f5f" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusLabel: { fontSize: 12, color: "white", fontWeight: "700" },

  section: { paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f1414",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  body: { fontSize: 15, color: "#1f1414", lineHeight: 22 },
  bodyHint: { fontSize: 13, color: "#7a5f5f", marginTop: 4 },

  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f0e4dc",
  },
  badgeLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  badgeLabel: { fontSize: 11, color: "#7a5f5f", fontWeight: "600" },
  badgeValue: { fontSize: 14, color: "#1f1414", fontWeight: "600" },

  shelterCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f0e4dc",
  },
  shelterTextCol: { flex: 1, gap: 2 },
  shelterNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  shelterName: { fontSize: 15, fontWeight: "600", color: "#1f1414" },
  shelterAddress: { fontSize: 13, color: "#7a5f5f" },

  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e8634d",
    backgroundColor: "white",
  },
  contactBtnLabel: { color: "#e8634d", fontWeight: "600", fontSize: 14 },

  ctaBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderColor: "#f0e4dc",
  },
  cta: {
    backgroundColor: "#e8634d",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  ctaDisabled: { backgroundColor: "#c4a89c" },
  ctaLabel: { color: "white", fontWeight: "600", fontSize: 16 },

  errorTitle: { fontSize: 18, fontWeight: "700", color: "#1f1414", marginBottom: 6 },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
