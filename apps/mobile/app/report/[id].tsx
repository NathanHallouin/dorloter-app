/**
 * Fiche détaillée d'un signalement perdu / trouvé — `/report/[id]`.
 *
 * Stack screen (back button natif). Affiche :
 *   - galerie photos paginée
 *   - badge type (perdu / trouvé) + statut + espèce
 *   - description longue
 *   - infos signalétiques (race, couleur, sexe, signes distinctifs)
 *   - lieu (adresse + coords)
 *   - date de l'événement
 *   - puce (oui/non + numéro si fourni)
 *   - bouton "Voir le contact" qui appelle POST /reports/{id}/reveal-contact
 *     (rate-limité serveur 30/h/IP, on log côté serveur)
 *
 * Pas de modification depuis le mobile en MVP — juste lecture +
 * révélation contact. L'édition / résolution / partage reste sur le web.
 */

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { Stack, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PHOTO_HEIGHT = SCREEN_WIDTH * 0.75;

const SPECIES_LABEL: Record<"chat" | "chien", string> = {
  chat: "Chat",
  chien: "Chien",
};
const TYPE_LABEL: Record<"perdu" | "trouve", string> = {
  perdu: "Perdu",
  trouve: "Trouvé",
};
const STATUS_LABEL: Record<"actif" | "resolu" | "expire", string> = {
  actif: "En cours",
  resolu: "Résolu",
  expire: "Archivé",
};
const SEX_LABEL: Record<"male" | "femelle" | "inconnu", string> = {
  male: "Mâle",
  femelle: "Femelle",
  inconnu: "Inconnu",
};

interface RevealedContact {
  phone: string | null;
  email: string | null;
}

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contact, setContact] = useState<RevealedContact | null>(null);

  const reportQuery = useQuery({
    enabled: !!id,
    queryKey: ["report", id],
    queryFn: async () => {
      const { data, error } = await api.GET("/reports/{id}", {
        params: { path: { id: id! } },
      });
      if (error) throw new Error(error.error.message);
      return data.data;
    },
  });

  const revealMut = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("ID manquant.");
      const { data, error } = await api.POST(
        "/reports/{id}/reveal-contact",
        { params: { path: { id } } }
      );
      if (error) throw error.error;
      if (!data) throw new Error("Réponse vide.");
      return data.data;
    },
    onSuccess: (data) => {
      setContact(data);
    },
    onError: (err: { code?: string; message?: string } | Error) => {
      const code = "code" in err ? err.code : undefined;
      const message =
        "message" in err && err.message ? err.message : "Erreur réseau.";
      const title =
        code === "GONE"
          ? "Signalement clos"
          : code === "RATE_LIMITED"
            ? "Trop de demandes"
            : "Contact indisponible";
      Alert.alert(title, message);
    },
  });

  if (reportQuery.isPending) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "" }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (reportQuery.isError || !reportQuery.data) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "" }} />
        <Text style={styles.errorTitle}>Signalement introuvable</Text>
        <Text style={styles.errorBody}>
          {reportQuery.error?.message ??
            "Cette annonce n'est plus disponible."}
        </Text>
      </View>
    );
  }

  const r = reportQuery.data;
  const isActive = r.status === "actif";

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: r.petName ?? TYPE_LABEL[r.type] }} />

      {/* ─── Galerie ─────────────────────────────────────────────────── */}
      {r.photos.length > 0 ? (
        <FlatList
          data={r.photos}
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
          style={[styles.photo, styles.photoFallback, { width: SCREEN_WIDTH }]}
        >
          <Text style={styles.photoFallbackEmoji}>
            {r.species === "chat" ? "🐱" : "🐶"}
          </Text>
        </View>
      )}

      {/* ─── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.tagRow}>
          <View
            style={[
              styles.tag,
              r.type === "perdu" ? styles.tagPerdu : styles.tagTrouve,
            ]}
          >
            <Text style={styles.tagLabel}>{TYPE_LABEL[r.type]}</Text>
          </View>
          <Text style={styles.species}>{SPECIES_LABEL[r.species]}</Text>
          {!isActive ? (
            <View style={styles.statusPill}>
              <Text style={styles.statusLabel}>{STATUS_LABEL[r.status]}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.name}>{r.petName ?? "Animal sans nom"}</Text>
        <Text style={styles.subtitle}>
          {r.address ?? "Lieu non précisé"} · {r.dateEvent}
        </Text>
      </View>

      {/* ─── Description ─────────────────────────────────────────────── */}
      <Section title="Description">
        <Text style={styles.body}>{r.description}</Text>
      </Section>

      {/* ─── Caractéristiques ────────────────────────────────────────── */}
      <Section title="Caractéristiques">
        <View style={styles.badgeRow}>
          {r.breed ? <Badge label="Race" value={r.breed} /> : null}
          {r.color ? <Badge label="Couleur" value={r.color} /> : null}
          <Badge label="Sexe" value={SEX_LABEL[r.sex]} />
          <Badge label="Pucé" value={r.isChipped ? "Oui" : "Non"} />
          {r.isChipped && r.chipNumber ? (
            <Badge label="N° puce" value={r.chipNumber} />
          ) : null}
        </View>
      </Section>

      {/* ─── Signes distinctifs ──────────────────────────────────────── */}
      {r.distinctiveSigns ? (
        <Section title="Signes distinctifs">
          <Text style={styles.body}>{r.distinctiveSigns}</Text>
        </Section>
      ) : null}

      {/* ─── Localisation ────────────────────────────────────────────── */}
      <Section title="Localisation">
        <Text style={styles.body}>
          {r.location.latitude.toFixed(4)}, {r.location.longitude.toFixed(4)}
        </Text>
      </Section>

      {/* ─── Contact ─────────────────────────────────────────────────── */}
      {r.hasContact && isActive ? (
        <Section title="Contacter l'auteur du signalement">
          {contact ? (
            <View style={styles.contactCard}>
              {contact.phone ? (
                <Pressable
                  style={styles.contactRow}
                  onPress={() => Linking.openURL(`tel:${contact.phone}`)}
                >
                  <Text style={styles.contactKind}>Téléphone</Text>
                  <Text style={styles.contactValue}>{contact.phone}</Text>
                </Pressable>
              ) : null}
              {contact.email ? (
                <Pressable
                  style={styles.contactRow}
                  onPress={() => Linking.openURL(`mailto:${contact.email}`)}
                >
                  <Text style={styles.contactKind}>Email</Text>
                  <Text style={styles.contactValue}>{contact.email}</Text>
                </Pressable>
              ) : null}
              {!contact.phone && !contact.email ? (
                <Text style={styles.body}>
                  Aucun moyen de contact n'a été renseigné.
                </Text>
              ) : null}
            </View>
          ) : (
            <Pressable
              style={styles.revealBtn}
              onPress={() => revealMut.mutate()}
              disabled={revealMut.isPending}
            >
              {revealMut.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.revealLabel}>Voir le contact</Text>
              )}
            </Pressable>
          )}
          <Text style={styles.revealHint}>
            Le contact reste protégé jusqu'à ce que tu cliques. Chaque
            révélation est tracée pour limiter le spam.
          </Text>
        </Section>
      ) : null}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeLabel}>{label}</Text>
      <Text style={styles.badgeValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { backgroundColor: "#fafafa", paddingBottom: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },

  photo: { height: PHOTO_HEIGHT, backgroundColor: "#f5ece4" },
  photoFallback: { alignItems: "center", justifyContent: "center" },
  photoFallbackEmoji: { fontSize: 96 },

  header: { padding: 20, gap: 8, backgroundColor: "white" },
  tagRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  tagPerdu: { backgroundColor: "#fde4dc" },
  tagTrouve: { backgroundColor: "#dceee4" },
  tagLabel: { fontSize: 12, fontWeight: "700", color: "#1f1414" },
  species: { fontSize: 14, color: "#7a5f5f", fontWeight: "500" },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#a08585",
  },
  statusLabel: { fontSize: 12, color: "white", fontWeight: "700" },
  name: { fontSize: 26, fontWeight: "700", color: "#1f1414" },
  subtitle: { fontSize: 14, color: "#7a5f5f" },

  section: { paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f1414",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  body: { fontSize: 15, color: "#1f1414", lineHeight: 22 },

  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f0e4dc",
  },
  badgeLabel: { fontSize: 11, color: "#7a5f5f", fontWeight: "600" },
  badgeValue: { fontSize: 14, color: "#1f1414", fontWeight: "600" },

  revealBtn: {
    backgroundColor: "#e8634d",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 4,
  },
  revealLabel: { color: "white", fontWeight: "600", fontSize: 15 },
  revealHint: { fontSize: 12, color: "#a08585", marginTop: 6 },
  contactCard: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0e4dc",
    overflow: "hidden",
  },
  contactRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#f5ece4",
  },
  contactKind: { fontSize: 12, color: "#7a5f5f", fontWeight: "600" },
  contactValue: { fontSize: 16, color: "#1f1414", marginTop: 2 },

  errorTitle: { fontSize: 18, fontWeight: "700", color: "#1f1414", marginBottom: 6 },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
