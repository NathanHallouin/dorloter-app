/**
 * Fiche détaillée d'un refuge · `/shelter/[slug]`.
 *
 * Stack screen au-dessus des tabs (back natif). Affiche :
 *   - cover + logo overlay + nom + badge "Vérifié"
 *   - stats : disponibles, réservés, adoptés, suiveurs
 *   - mission longue
 *   - contact (téléphone, email, site web, don)
 *   - horaires de visite
 *   - liste des animaux à adopter (cards horizontales, scroll)
 *
 * Le suivi (follow) et le don sont des actions web pour l'instant.
 * Le mobile expose les liens vers l'extérieur (téléphone via Linking,
 * URL via navigateur natif).
 */

import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const SCREEN_WIDTH = Dimensions.get("window").width;
const COVER_HEIGHT = SCREEN_WIDTH * 0.5;

export default function ShelterDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const shelterQuery = useQuery({
    enabled: !!slug,
    queryKey: ["shelter", slug],
    queryFn: async () => {
      const { data, error } = await api.GET("/shelters/{slug}", {
        params: { path: { slug: slug! } },
      });
      if (error) throw new Error(error.error.message);
      return data.data;
    },
  });

  const petsQuery = useQuery({
    enabled: !!shelterQuery.data?.id,
    queryKey: ["pets", { shelterId: shelterQuery.data?.id }],
    queryFn: async () => {
      const { data, error } = await api.GET("/pets", {
        params: { query: { shelterId: shelterQuery.data!.id, limit: 50 } },
      });
      if (error) throw new Error(error.error.message);
      return data.data;
    },
  });

  if (shelterQuery.isPending) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "" }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (shelterQuery.isError || !shelterQuery.data) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "" }} />
        <Text style={styles.errorTitle}>Refuge introuvable</Text>
        <Text style={styles.errorBody}>
          {shelterQuery.error?.message ?? "Cette fiche n'est plus disponible."}
        </Text>
      </View>
    );
  }

  const s = shelterQuery.data;
  const pets = petsQuery.data ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: s.name }} />

      {/* ─── Cover + logo overlay ────────────────────────────────────── */}
      <View>
        {s.coverUrl ? (
          <Image
            source={{ uri: s.coverUrl }}
            contentFit="cover"
            transition={250}
            style={styles.cover}
          />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}>
            <MaterialCommunityIcons
              name="home-heart"
              size={56}
              color="#c4a89c"
            />
          </View>
        )}
        {s.logoUrl ? (
          <View style={styles.logoWrapper}>
            <Image
              source={{ uri: s.logoUrl }}
              contentFit="cover"
              style={styles.logo}
            />
          </View>
        ) : null}
      </View>

      {/* ─── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{s.name}</Text>
          {s.isVerified ? (
            <View style={styles.verifiedPill}>
              <MaterialCommunityIcons
                name="check-decagram"
                size={14}
                color="#4a9d7a"
              />
              <Text style={styles.verifiedLabel}>Vérifié</Text>
            </View>
          ) : null}
        </View>
        {s.address ? (
          <View style={styles.addressRow}>
            <MaterialCommunityIcons name="map-marker" size={15} color="#7a5f5f" />
            <Text style={styles.address}>{s.address}</Text>
          </View>
        ) : null}
        {s.foundedYear ? (
          <Text style={styles.founded}>Créé en {s.foundedYear}</Text>
        ) : null}
      </View>

      {/* ─── Stats ───────────────────────────────────────────────────── */}
      <View style={styles.statsBar}>
        <StatTile value={s.available} label="à adopter" />
        <StatTile value={s.reserved} label="réservés" />
        <StatTile value={s.adopted} label="adoptés" />
        <StatTile value={s.followers} label="suiveurs" />
      </View>

      {/* ─── Mission ─────────────────────────────────────────────────── */}
      {s.missionLong || s.description ? (
        <Section title="Notre mission">
          <Text style={styles.body}>{s.missionLong ?? s.description}</Text>
        </Section>
      ) : null}

      {/* ─── Horaires ────────────────────────────────────────────────── */}
      {s.visitHours ? (
        <Section title="Horaires de visite">
          <Text style={styles.body}>{s.visitHours}</Text>
        </Section>
      ) : null}

      {/* ─── Contact ─────────────────────────────────────────────────── */}
      <Section title="Contact">
        <Pressable
          style={styles.messageBtn}
          onPress={() => router.push(`/shelter/${s.slug}/contact`)}
        >
          <MaterialCommunityIcons
            name="message-text-outline"
            size={18}
            color="white"
          />
          <Text style={styles.messageBtnLabel}>Envoyer un message</Text>
        </Pressable>
        <View style={styles.contactCol}>
          {s.phone ? (
            <Pressable
              style={styles.contactRow}
              onPress={() => Linking.openURL(`tel:${s.phone}`)}
            >
              <MaterialCommunityIcons name="phone" size={20} color="#e8634d" />
              <Text style={styles.contactValue}>{s.phone}</Text>
            </Pressable>
          ) : null}
          {s.email ? (
            <Pressable
              style={styles.contactRow}
              onPress={() => Linking.openURL(`mailto:${s.email}`)}
            >
              <MaterialCommunityIcons name="email" size={20} color="#e8634d" />
              <Text style={styles.contactValue}>{s.email}</Text>
            </Pressable>
          ) : null}
          {s.website ? (
            <Pressable
              style={styles.contactRow}
              onPress={() => Linking.openURL(s.website!)}
            >
              <MaterialCommunityIcons name="web" size={20} color="#e8634d" />
              <Text style={styles.contactValue} numberOfLines={1}>
                {s.website}
              </Text>
            </Pressable>
          ) : null}
          {s.donationUrl ? (
            <Pressable
              style={styles.contactRow}
              onPress={() => Linking.openURL(s.donationUrl!)}
            >
              <MaterialCommunityIcons
                name="hand-heart"
                size={20}
                color="#e8634d"
              />
              <Text style={styles.contactValue}>Faire un don</Text>
            </Pressable>
          ) : null}
        </View>
      </Section>

      {/* ─── Animaux à adopter ───────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.petsHeader}>
          <Text style={styles.sectionTitle}>
            Animaux à adopter ({pets.length})
          </Text>
        </View>
        {petsQuery.isPending ? (
          <View style={styles.petsLoading}>
            <ActivityIndicator />
          </View>
        ) : pets.length === 0 ? (
          <Text style={styles.empty}>
            Aucun animal à adopter pour le moment.
          </Text>
        ) : (
          <FlatList
            horizontal
            data={pets}
            keyExtractor={(p) => p.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.petsListContent}
            renderItem={({ item }) => (
              <Link href={`/pet/${item.id}`} asChild>
                <Pressable style={styles.petCard}>
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
                  <View style={styles.petBody}>
                    <Text style={styles.petName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.petMeta} numberOfLines={1}>
                      {item.species === "chat" ? "Chat" : "Chien"}
                      {item.ageCategory ? ` · ${item.ageCategory}` : ""}
                    </Text>
                  </View>
                </Pressable>
              </Link>
            )}
          />
        )}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ─── Sous-composants ────────────────────────────────────────────────────────

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

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  scroll: { paddingBottom: 24 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },

  cover: { width: SCREEN_WIDTH, height: COVER_HEIGHT, backgroundColor: "#f5ece4" },
  coverFallback: { alignItems: "center", justifyContent: "center" },
  logoWrapper: {
    position: "absolute",
    bottom: -28,
    left: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "white",
    padding: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  logo: { width: 56, height: 56, borderRadius: 28 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 38,
    paddingBottom: 16,
    gap: 8,
    backgroundColor: "white",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  name: { fontSize: 24, fontWeight: "700", color: "#1f1414", flex: 1 },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#e0f0e7",
  },
  verifiedLabel: { fontSize: 11, color: "#4a9d7a", fontWeight: "700" },

  addressRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  address: { fontSize: 14, color: "#7a5f5f", flex: 1 },
  founded: { fontSize: 13, color: "#a08585" },

  statsBar: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#f0e4dc",
  },
  statTile: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700", color: "#1f1414" },
  statLabel: { fontSize: 11, color: "#7a5f5f", marginTop: 2 },

  section: { paddingHorizontal: 20, paddingVertical: 14, gap: 10 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f1414",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  body: { fontSize: 15, color: "#1f1414", lineHeight: 22 },

  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#e8634d",
    marginBottom: 10,
  },
  messageBtnLabel: { color: "white", fontWeight: "600", fontSize: 15 },

  contactCol: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0e4dc",
    overflow: "hidden",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#f5ece4",
  },
  contactValue: { flex: 1, fontSize: 15, color: "#1f1414" },

  petsHeader: { flexDirection: "row", alignItems: "center" },
  petsLoading: { paddingVertical: 24, alignItems: "center" },
  petsListContent: { gap: 12, paddingRight: 20 },
  petCard: {
    width: 140,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0e4dc",
    overflow: "hidden",
  },
  petPhoto: { width: 140, height: 140, backgroundColor: "#f5ece4" },
  petBody: { padding: 10, gap: 2 },
  petName: { fontSize: 14, fontWeight: "600", color: "#1f1414" },
  petMeta: { fontSize: 12, color: "#7a5f5f" },

  empty: { color: "#7a5f5f", textAlign: "center", paddingVertical: 12 },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f1414",
    marginBottom: 6,
  },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
