/**
 * Onglet Signalements — perdus / trouvés.
 *
 * Deux modes :
 *   - liste : FlatList classique avec photo (cf. session 3a)
 *   - carte : MapLibre + markers, bottom card sur le marker tappé
 *
 * Le mode carte requiert un Dev Client (MapLibre RN = module natif).
 * En Expo Go, on bascule automatiquement en liste avec un bandeau info.
 *
 * La query API change selon le mode :
 *   - liste     : /reports?status=actif&limit=20  (tous, tri date)
 *   - carte     : /reports?lat=&lng=&radiusKm=5    (autour de l'user)
 */

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  DEFAULT_CENTER,
  getCurrentLocation,
  type UserCoords,
} from "@/lib/location";
import { ReportsMap } from "@/components/reports-map";
import type { components } from "@dorloter/api-client";

type Report = components["schemas"]["ReportSummary"];
type ViewMode = "list" | "map";

const SPECIES_LABEL: Record<"chat" | "chien", string> = {
  chat: "Chat",
  chien: "Chien",
};

const isExpoGo = Constants.executionEnvironment === "storeClient";

export default function SignalementsScreen() {
  const [mode, setMode] = useState<ViewMode>("list");

  return (
    <View style={styles.container}>
      <ModeToggle mode={mode} onChange={setMode} disableMap={isExpoGo} />
      {mode === "list" ? <ListView /> : <MapView />}
    </View>
  );
}

// ─── Mode toggle ────────────────────────────────────────────────────────────

interface ModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  disableMap: boolean;
}

function ModeToggle({ mode, onChange, disableMap }: ModeToggleProps) {
  return (
    <View style={styles.toggleBar}>
      <Pressable
        style={[styles.toggleBtn, mode === "list" && styles.toggleBtnActive]}
        onPress={() => onChange("list")}
      >
        <Text
          style={[
            styles.toggleLabel,
            mode === "list" && styles.toggleLabelActive,
          ]}
        >
          Liste
        </Text>
      </Pressable>
      <Pressable
        style={[
          styles.toggleBtn,
          mode === "map" && styles.toggleBtnActive,
          disableMap && styles.toggleBtnDisabled,
        ]}
        onPress={() => !disableMap && onChange("map")}
      >
        <Text
          style={[
            styles.toggleLabel,
            mode === "map" && styles.toggleLabelActive,
            disableMap && styles.toggleLabelDisabled,
          ]}
        >
          Carte
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Liste (mode par défaut) ────────────────────────────────────────────────

function ListView() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["reports", "list", { status: "actif", limit: 20 }],
    queryFn: async () => {
      const { data, error } = await api.GET("/reports", {
        params: { query: { status: "actif", limit: 20 } },
      });
      if (error) throw new Error(error.error.message);
      return data;
    },
  });

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>
          Impossible de charger les signalements
        </Text>
        <Text style={styles.errorBody}>{error.message}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data.data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <Text style={styles.empty}>Aucun signalement actif dans la zone.</Text>
      }
      renderItem={({ item }) => <ReportRow report={item} />}
    />
  );
}

function ReportRow({ report }: { report: Report }) {
  return (
    <View style={styles.card}>
      {report.primaryPhoto ? (
        <Image
          source={{ uri: report.primaryPhoto.url }}
          placeholder={
            report.primaryPhoto.blurDataUrl
              ? { uri: report.primaryPhoto.blurDataUrl }
              : undefined
          }
          placeholderContentFit="cover"
          contentFit="cover"
          transition={250}
          style={styles.photo}
        />
      ) : (
        <View style={[styles.photo, styles.photoFallback]}>
          <Text style={styles.photoFallbackEmoji}>
            {report.species === "chat" ? "🐱" : "🐶"}
          </Text>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.tagRow}>
          <View
            style={[
              styles.tag,
              report.type === "perdu" ? styles.tagPerdu : styles.tagTrouve,
            ]}
          >
            <Text style={styles.tagLabel}>
              {report.type === "perdu" ? "Perdu" : "Trouvé"}
            </Text>
          </View>
          <Text style={styles.species}>{SPECIES_LABEL[report.species]}</Text>
        </View>
        <Text style={styles.name}>{report.petName ?? "Animal sans nom"}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {report.address ?? "Lieu non précisé"} · {report.dateEvent}
        </Text>
      </View>
    </View>
  );
}

// ─── Carte (mode requiert Dev Client) ──────────────────────────────────────

function MapView() {
  const [center, setCenter] = useState<UserCoords>(DEFAULT_CENTER);
  const [centerReady, setCenterReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Géoloc au mount — fallback Paris si refus / erreur, et on continue.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const status = await getCurrentLocation();
      if (cancelled) return;
      if (status.kind === "granted") {
        setCenter(status.coords);
      }
      setCenterReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reportsQuery = useQuery({
    enabled: centerReady,
    queryKey: ["reports", "near", center.latitude, center.longitude],
    queryFn: async () => {
      const { data, error } = await api.GET("/reports", {
        params: {
          query: {
            lat: center.latitude,
            lng: center.longitude,
            radiusKm: 10,
            status: "actif",
            limit: 100,
          },
        },
      });
      if (error) throw new Error(error.error.message);
      return data;
    },
  });

  const reports = reportsQuery.data?.data ?? [];
  const selected = reports.find((r) => r.id === selectedId) ?? null;

  if (!centerReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ReportsMap
        center={center}
        reports={reports}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      {reportsQuery.isError ? (
        <View style={styles.mapBanner}>
          <Text style={styles.mapBannerText}>
            Impossible de charger les signalements ({reportsQuery.error.message}).
          </Text>
        </View>
      ) : null}
      {selected ? (
        <View style={styles.bottomCard}>
          <ReportRow report={selected} />
          <Pressable
            style={styles.closeBtn}
            onPress={() => setSelectedId(null)}
            hitSlop={12}
          >
            <Text style={styles.closeBtnLabel}>×</Text>
          </Pressable>
        </View>
      ) : null}
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
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderColor: "transparent",
  },
  toggleBtnActive: { borderColor: "#e8634d" },
  toggleBtnDisabled: { opacity: 0.4 },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: "#7a5f5f" },
  toggleLabelActive: { color: "#1f1414" },
  toggleLabelDisabled: { color: "#a08585" },

  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0e4dc",
    overflow: "hidden",
    flexDirection: "row",
  },
  photo: { width: 110, height: 110, backgroundColor: "#f5ece4" },
  photoFallback: { alignItems: "center", justifyContent: "center" },
  photoFallbackEmoji: { fontSize: 40 },
  body: { flex: 1, padding: 12, gap: 4, justifyContent: "center" },
  tagRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  tagPerdu: { backgroundColor: "#fde4dc" },
  tagTrouve: { backgroundColor: "#dceee4" },
  tagLabel: { fontSize: 11, fontWeight: "700", color: "#1f1414" },
  species: { fontSize: 13, color: "#7a5f5f" },
  name: { fontSize: 17, fontWeight: "600", color: "#1f1414" },
  meta: { fontSize: 13, color: "#7a5f5f" },
  empty: { textAlign: "center", color: "#7a5f5f" },
  errorTitle: { fontSize: 16, fontWeight: "600", color: "#1f1414", marginBottom: 4 },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },

  mapBanner: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: "rgba(232,99,77,0.95)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  mapBannerText: { color: "white", fontSize: 13 },

  bottomCard: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0e4dc",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 6,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnLabel: { fontSize: 24, color: "#7a5f5f", fontWeight: "300" },
});
