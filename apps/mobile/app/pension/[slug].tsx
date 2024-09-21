/**
 * Fiche détaillée d'une pension agréée — `/pension/[slug]`.
 *
 * Stack screen au-dessus des tabs (back natif). Affiche :
 *   - galerie photos horizontale paginée
 *   - nom, badge "Pro vérifié" (SIRET + agrément validés)
 *   - prix/jour par espèce + capacité
 *   - description
 *   - services proposés (badges)
 *   - horaires d'ouverture
 *   - contact (téléphone, email, site web — Linking natif)
 *
 * Pas de booking intégré en MVP : Dorloter est un annuaire, le contact
 * reste direct entre l'adoptant et la pension.
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PHOTO_HEIGHT = SCREEN_WIDTH * 0.6; // 16:10

const SERVICE_LABELS: Record<string, string> = {
  medication: "Médication",
  grooming: "Toilettage",
  outdoorAccess: "Accès extérieur",
  nightStaff: "Personnel de nuit",
  transport: "Transport",
  senior: "Animaux séniors",
};

const SERVICE_ICONS: Record<
  string,
  React.ComponentProps<typeof MaterialCommunityIcons>["name"]
> = {
  medication: "pill",
  grooming: "scissors-cutting",
  outdoorAccess: "tree",
  nightStaff: "weather-night",
  transport: "car",
  senior: "heart-pulse",
};

export default function PensionDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const pensionQuery = useQuery({
    enabled: !!slug,
    queryKey: ["pension", slug],
    queryFn: async () => {
      const { data, error } = await api.GET("/pensions/{slug}", {
        params: { path: { slug: slug! } },
      });
      if (error) throw new Error(error.error.message);
      return data.data;
    },
  });

  if (pensionQuery.isPending) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "" }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (pensionQuery.isError || !pensionQuery.data) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "" }} />
        <Text style={styles.errorTitle}>Pension introuvable</Text>
        <Text style={styles.errorBody}>
          {pensionQuery.error?.message ?? "Cette fiche n'est plus disponible."}
        </Text>
      </View>
    );
  }

  const p = pensionQuery.data;
  const activeServices = Object.entries(p.services).filter(([, v]) => v);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: p.name }} />

      {/* ─── Galerie ─────────────────────────────────────────────────── */}
      {p.photos.length > 0 ? (
        <FlatList
          data={p.photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(ph) => ph.id}
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
        <View style={[styles.photo, styles.photoFallback]}>
          <MaterialCommunityIcons
            name="home-city"
            size={64}
            color="#c4a89c"
          />
        </View>
      )}

      {/* ─── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{p.name}</Text>
          <View style={styles.verifiedPill}>
            <MaterialCommunityIcons
              name="check-decagram"
              size={14}
              color="#4a9d7a"
            />
            <Text style={styles.verifiedLabel}>Pro vérifié</Text>
          </View>
        </View>
        {p.address ? (
          <View style={styles.addressRow}>
            <MaterialCommunityIcons
              name="map-marker"
              size={15}
              color="#7a5f5f"
            />
            <Text style={styles.address}>{p.address}</Text>
          </View>
        ) : null}
      </View>

      {/* ─── Prix / capacité ─────────────────────────────────────────── */}
      <Section title="Tarifs et capacité">
        <View style={styles.priceRow}>
          {p.acceptsCats ? (
            <PriceCard
              icon="cat"
              label="Chats"
              price={p.pricePerDayCat}
              capacity={p.capacityCats}
            />
          ) : null}
          {p.acceptsDogs ? (
            <PriceCard
              icon="dog"
              label="Chiens"
              price={p.pricePerDayDog}
              capacity={p.capacityDogs}
            />
          ) : null}
        </View>
      </Section>

      {/* ─── Description ─────────────────────────────────────────────── */}
      {p.description ? (
        <Section title="À propos">
          <Text style={styles.body}>{p.description}</Text>
        </Section>
      ) : null}

      {/* ─── Services ────────────────────────────────────────────────── */}
      {activeServices.length > 0 ? (
        <Section title="Services proposés">
          <View style={styles.servicesRow}>
            {activeServices.map(([key]) => (
              <View key={key} style={styles.servicePill}>
                <MaterialCommunityIcons
                  name={SERVICE_ICONS[key] ?? "check"}
                  size={14}
                  color="#1f1414"
                />
                <Text style={styles.serviceLabel}>{SERVICE_LABELS[key]}</Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {/* ─── Horaires ────────────────────────────────────────────────── */}
      {p.openingHours ? (
        <Section title="Horaires">
          <Text style={styles.body}>{p.openingHours}</Text>
        </Section>
      ) : null}

      {/* ─── Contact ─────────────────────────────────────────────────── */}
      <Section title="Contact">
        <View style={styles.contactCol}>
          {p.phone ? (
            <Pressable
              style={styles.contactRow}
              onPress={() => Linking.openURL(`tel:${p.phone}`)}
            >
              <MaterialCommunityIcons name="phone" size={20} color="#e8634d" />
              <Text style={styles.contactValue}>{p.phone}</Text>
            </Pressable>
          ) : null}
          {p.email ? (
            <Pressable
              style={styles.contactRow}
              onPress={() => Linking.openURL(`mailto:${p.email}`)}
            >
              <MaterialCommunityIcons name="email" size={20} color="#e8634d" />
              <Text style={styles.contactValue}>{p.email}</Text>
            </Pressable>
          ) : null}
          {p.website ? (
            <Pressable
              style={styles.contactRow}
              onPress={() => Linking.openURL(p.website!)}
            >
              <MaterialCommunityIcons
                name="web"
                size={20}
                color="#e8634d"
              />
              <Text style={styles.contactValue} numberOfLines={1}>
                {p.website}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Section>

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

function PriceCard({
  icon,
  label,
  price,
  capacity,
}: {
  icon: "cat" | "dog";
  label: string;
  price: number | null | undefined;
  capacity: number | null | undefined;
}) {
  return (
    <View style={styles.priceCard}>
      <MaterialCommunityIcons name={icon} size={24} color="#e8634d" />
      <Text style={styles.priceLabel}>{label}</Text>
      {price ? (
        <Text style={styles.priceValue}>
          {price.toLocaleString("fr-FR", {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
          })}
          <Text style={styles.priceUnit}> /jour</Text>
        </Text>
      ) : (
        <Text style={styles.priceMuted}>Sur devis</Text>
      )}
      {capacity ? (
        <Text style={styles.capacity}>{capacity} place{capacity > 1 ? "s" : ""}</Text>
      ) : null}
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

  photo: { height: PHOTO_HEIGHT, backgroundColor: "#f5ece4" },
  photoFallback: {
    width: SCREEN_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },

  header: { padding: 20, gap: 8, backgroundColor: "white" },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  name: { fontSize: 26, fontWeight: "700", color: "#1f1414", flex: 1 },
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

  section: { paddingHorizontal: 20, paddingVertical: 14, gap: 10 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f1414",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  body: { fontSize: 15, color: "#1f1414", lineHeight: 22 },

  priceRow: { flexDirection: "row", gap: 10 },
  priceCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0e4dc",
    padding: 14,
    alignItems: "flex-start",
    gap: 4,
  },
  priceLabel: { fontSize: 12, color: "#7a5f5f", fontWeight: "600" },
  priceValue: { fontSize: 18, color: "#1f1414", fontWeight: "700" },
  priceUnit: { fontSize: 12, color: "#7a5f5f", fontWeight: "500" },
  priceMuted: { fontSize: 14, color: "#a08585", fontStyle: "italic" },
  capacity: { fontSize: 12, color: "#7a5f5f", marginTop: 2 },

  servicesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  servicePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#f0e4dc",
  },
  serviceLabel: { fontSize: 13, color: "#1f1414", fontWeight: "600" },

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

  errorTitle: { fontSize: 18, fontWeight: "700", color: "#1f1414", marginBottom: 6 },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
