/**
 * Swipe adoption — `/adopter/swipe`.
 *
 * Pattern Tinder : pile de cards, swipe gauche = passer, swipe droite =
 * ajouter aux favoris. Implémentation native avec `react-native-gesture-handler`
 * (PanGesture) + `react-native-reanimated` (animations 60 fps).
 *
 * - Stack visible : top + 1 card de prefetch en dessous (effet de pile)
 * - Threshold : 25% de la largeur de l'écran (équivalent ~120px sur la
 *   plupart des phones), comme la version web
 * - "Skip" est purement local — aucune persistance serveur des passes.
 *   "Like" persiste via POST /favorites (le serveur dédoublonne).
 * - Undo : ramène la dernière card et toggle le favori si nécessaire.
 *
 * Auth requise pour le like ; non-auth = redirect /login.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Redirect, Stack, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import type { components } from "@dorloter/api-client";

type Pet = components["schemas"]["PetCard"];

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_W * 0.25;
const ROTATION_AT_THRESHOLD = 12; // degrés à l'instant du swipe-out

interface HistoryEntry {
  petId: string;
  action: "like" | "pass";
}

export default function SwipeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const tokenQuery = useQuery({
    queryKey: ["auth", "token"],
    queryFn: getAuthToken,
  });

  const petsQuery = useQuery({
    enabled: !!tokenQuery.data,
    queryKey: ["pets", "swipe", { limit: 30 }],
    queryFn: async () => {
      const { data, error } = await api.GET("/pets", {
        params: { query: { limit: 30 } },
      });
      if (error) throw new Error(error.error.message);
      return data.data;
    },
  });

  const favoritesQuery = useQuery({
    enabled: !!tokenQuery.data,
    queryKey: ["me", "favorites"],
    queryFn: async () => {
      const { data, error } = await api.GET("/me/favorites");
      if (error) throw new Error(error.error.message);
      return data.data;
    },
  });

  const favoriteSet = useMemo(
    () => new Set(favoritesQuery.data?.petIds ?? []),
    [favoritesQuery.data]
  );

  const toggleFavoriteMut = useMutation({
    mutationFn: async (petId: string) => {
      const { data, error } = await api.POST("/favorites", {
        body: { petId },
      });
      if (error) throw new Error(error.error.message);
      return data.data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "favorites"] });
    },
  });

  const [index, setIndex] = useState(0);
  const historyRef = useRef<HistoryEntry[]>([]);

  // Le deck est figé une fois pour toutes au premier render où pets +
  // favoris sont chargés. Reconstruire à chaque changement de favoriteSet
  // ferait disparaître les pets qu'on vient de liker du deck en cours et
  // décalerait l'index (= un animal sauté sur deux). On gère uniquement
  // via `index` + history.
  const [deck, setDeck] = useState<Pet[] | null>(null);
  useEffect(() => {
    if (deck !== null) return;
    if (!petsQuery.data || !favoritesQuery.data) return;
    const initialFavSet = new Set(favoritesQuery.data.petIds);
    setDeck(petsQuery.data.filter((p) => !initialFavSet.has(p.id)));
  }, [deck, petsQuery.data, favoritesQuery.data]);

  function handleSwipe(direction: "left" | "right") {
    if (!deck) return;
    const pet = deck[index];
    if (!pet) return;
    historyRef.current.push({
      petId: pet.id,
      action: direction === "right" ? "like" : "pass",
    });
    if (direction === "right" && !favoriteSet.has(pet.id)) {
      toggleFavoriteMut.mutate(pet.id);
    }
    setIndex((i) => i + 1);
  }

  function handleUndo() {
    const last = historyRef.current.pop();
    if (!last) return;
    setIndex((i) => Math.max(0, i - 1));
    if (last.action === "like" && favoriteSet.has(last.petId)) {
      // Re-toggle pour annuler le favori (POST /favorites est idempotent)
      toggleFavoriteMut.mutate(last.petId);
    }
  }

  if (tokenQuery.isPending) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Swipe" }} />
        <ActivityIndicator />
      </View>
    );
  }
  if (!tokenQuery.data) return <Redirect href="/login" />;

  if (petsQuery.isPending || deck === null) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Swipe" }} />
        <ActivityIndicator />
      </View>
    );
  }
  if (petsQuery.isError) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Swipe" }} />
        <Text style={styles.errorTitle}>Impossible de charger</Text>
        <Text style={styles.errorBody}>{petsQuery.error.message}</Text>
      </View>
    );
  }

  const top = deck[index];
  const next = deck[index + 1];
  const exhausted = !top;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Swipe" }} />

      <View style={styles.deck}>
        {exhausted ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons
              name="paw-off"
              size={56}
              color="#c4a89c"
            />
            <Text style={styles.emptyTitle}>Plus de profils pour l'instant</Text>
            <Text style={styles.emptyBody}>
              Reviens plus tard, de nouveaux animaux sont publiés chaque
              semaine. En attendant, explore le catalogue.
            </Text>
            <Pressable style={styles.emptyCta} onPress={() => router.back()}>
              <Text style={styles.emptyCtaLabel}>Retour au catalogue</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Carte du dessous (preview de la prochaine) */}
            {next ? (
              <View style={[styles.cardWrap, styles.cardBehind]} pointerEvents="none">
                <PetCardContent pet={next} />
              </View>
            ) : null}

            {/* Carte du dessus, swipeable */}
            <SwipeableCard
              key={top.id}
              pet={top}
              onSwipe={handleSwipe}
            />
          </>
        )}
      </View>

      {!exhausted ? (
        <View style={styles.actions}>
          <ActionButton
            icon="undo"
            color="#a08585"
            disabled={historyRef.current.length === 0}
            onPress={handleUndo}
            size={48}
          />
          <ActionButton
            icon="close"
            color="#c43e1f"
            onPress={() => handleSwipe("left")}
            size={60}
          />
          <ActionButton
            icon="heart"
            color="#4a9d7a"
            onPress={() => handleSwipe("right")}
            size={60}
          />
          <Pressable
            style={styles.detailBtn}
            onPress={() => router.push(`/pet/${top.id}`)}
          >
            <MaterialCommunityIcons
              name="information-outline"
              size={22}
              color="#7a5f5f"
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

// ─── Composants ─────────────────────────────────────────────────────────────

function SwipeableCard({
  pet,
  onSwipe,
}: {
  pet: Pet;
  onSwipe: (direction: "left" | "right") => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const shouldSwipeRight =
        e.translationX > SWIPE_THRESHOLD || e.velocityX > 800;
      const shouldSwipeLeft =
        e.translationX < -SWIPE_THRESHOLD || e.velocityX < -800;

      if (shouldSwipeRight) {
        translateX.value = withTiming(SCREEN_W * 1.5, { duration: 250 });
        translateY.value = withTiming(e.translationY, { duration: 250 });
        runOnJS(onSwipe)("right");
      } else if (shouldSwipeLeft) {
        translateX.value = withTiming(-SCREEN_W * 1.5, { duration: 250 });
        translateY.value = withTiming(e.translationY, { duration: 250 });
        runOnJS(onSwipe)("left");
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      translateX.value,
      [-SCREEN_W / 2, 0, SCREEN_W / 2],
      [-ROTATION_AT_THRESHOLD, 0, ROTATION_AT_THRESHOLD]
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${rotation}deg` },
      ],
    };
  });

  const likeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      "clamp"
    ),
  }));

  const passStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      "clamp"
    ),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.cardWrap, cardStyle]}>
        <PetCardContent pet={pet} />
        <Animated.View
          style={[styles.stamp, styles.stampLike, likeStampStyle]}
          pointerEvents="none"
        >
          <Text style={styles.stampLikeLabel}>Oui</Text>
        </Animated.View>
        <Animated.View
          style={[styles.stamp, styles.stampPass, passStampStyle]}
          pointerEvents="none"
        >
          <Text style={styles.stampPassLabel}>Pas pour moi</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function PetCardContent({ pet }: { pet: Pet }) {
  return (
    <View style={styles.card}>
      <Image
        source={
          pet.primaryPhoto?.url ? { uri: pet.primaryPhoto.url } : undefined
        }
        placeholder={
          pet.primaryPhoto?.blurDataUrl
            ? { uri: pet.primaryPhoto.blurDataUrl }
            : undefined
        }
        contentFit="cover"
        transition={250}
        style={styles.photo}
      />
      <View style={styles.info}>
        <Text style={styles.name}>{pet.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {pet.species === "chat" ? "Chat" : "Chien"}
          {pet.breed ? ` · ${pet.breed}` : ""}
          {pet.ageCategory ? ` · ${pet.ageCategory}` : ""}
        </Text>
        {pet.shelter ? (
          <Text style={styles.shelter} numberOfLines={1}>
            {pet.shelter.name}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function ActionButton({
  icon,
  color,
  onPress,
  size,
  disabled,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
  onPress: () => void;
  size: number;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.actionBtn,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
        },
        disabled && styles.actionBtnDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <MaterialCommunityIcons
        name={icon}
        size={size * 0.45}
        color={disabled ? "#c4a89c" : color}
      />
    </Pressable>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const CARD_WIDTH = SCREEN_W - 32;
const CARD_HEIGHT = SCREEN_H * 0.62;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 8,
  },

  deck: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
  },
  cardWrap: {
    position: "absolute",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardBehind: {
    transform: [{ scale: 0.95 }],
    opacity: 0.6,
    top: 12,
  },
  card: {
    width: "100%",
    height: "100%",
    backgroundColor: "white",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f0e4dc",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  photo: { flex: 1, backgroundColor: "#f5ece4" },
  info: {
    padding: 16,
    gap: 4,
    borderTopWidth: 1,
    borderColor: "#f5ece4",
  },
  name: { fontSize: 22, fontWeight: "700", color: "#1f1414" },
  meta: { fontSize: 14, color: "#7a5f5f" },
  shelter: { fontSize: 13, color: "#a08585" },

  stamp: {
    position: "absolute",
    top: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 3,
  },
  stampLike: {
    right: 20,
    borderColor: "#4a9d7a",
    transform: [{ rotate: "-12deg" }],
  },
  stampLikeLabel: {
    color: "#4a9d7a",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 1,
  },
  stampPass: {
    left: 20,
    borderColor: "#c43e1f",
    transform: [{ rotate: "12deg" }],
  },
  stampPassLabel: {
    color: "#c43e1f",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  actionBtn: {
    backgroundColor: "white",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  actionBtnDisabled: { opacity: 0.4 },
  detailBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e6d4c8",
    alignItems: "center",
    justifyContent: "center",
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f1414",
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 14,
    color: "#7a5f5f",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyCta: {
    marginTop: 16,
    backgroundColor: "#e8634d",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  emptyCtaLabel: { color: "white", fontWeight: "600", fontSize: 15 },

  errorTitle: { fontSize: 18, fontWeight: "700", color: "#1f1414" },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
