/**
 * Carte interactive des signalements perdus / trouvés.
 *
 * - Style vectoriel via OpenFreeMap (pas de clé API en MVP, voir
 *   `extra.mapStyleUrl` dans app.config.ts pour surcharger).
 * - Un MarkerView par signalement, couleur selon le type.
 * - Tap sur un marker → onSelect, charge à la parent component d'afficher
 *   un bottom card.
 *
 * Note dev : MapLibre RN est un module natif → ne fonctionne pas dans
 * Expo Go. Lance via Dev Client (`bun expo prebuild` puis EAS build, ou
 * Xcode/Android Studio en local).
 */

import { useMemo } from "react";
import Constants from "expo-constants";
import {
  Camera,
  Map,
  ViewAnnotation,
} from "@maplibre/maplibre-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import type { components } from "@dorloter/api-client";

type Report = components["schemas"]["ReportSummary"];

interface ReportsMapProps {
  /** Centre initial (user location ou fallback Paris). */
  center: { latitude: number; longitude: number };
  reports: Report[];
  selectedId: string | null;
  onSelect: (reportId: string) => void;
}

const DEFAULT_STYLE_URL =
  "https://tiles.openfreemap.org/styles/liberty";

export function ReportsMap({
  center,
  reports,
  selectedId,
  onSelect,
}: ReportsMapProps) {
  const styleUrl =
    (Constants.expoConfig?.extra?.mapStyleUrl as string | undefined) ??
    DEFAULT_STYLE_URL;

  // Centre initial : seule la première render compte (Camera est un
  // composant non-controlled — pour suivre l'user qui bouge, utiliser
  // setCamera depuis un ref). On évite les re-renders intempestifs via
  // useMemo.
  const initialCoords: [number, number] = useMemo(
    () => [center.longitude, center.latitude],
    [center.longitude, center.latitude]
  );

  return (
    <View style={styles.container}>
      <Map style={StyleSheet.absoluteFill} mapStyle={styleUrl}>
        <Camera
          initialViewState={{
            center: initialCoords,
            zoom: 12,
          }}
        />
        {reports.map((report) => (
          <ViewAnnotation
            key={report.id}
            lngLat={[report.location.longitude, report.location.latitude]}
            anchor="center"
          >
            <Pressable
              onPress={() => onSelect(report.id)}
              hitSlop={8}
              style={[
                styles.marker,
                report.type === "perdu" ? styles.markerPerdu : styles.markerTrouve,
                selectedId === report.id && styles.markerSelected,
              ]}
            />
          </ViewAnnotation>
        ))}
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  marker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  markerPerdu: { backgroundColor: "#e8634d" },
  markerTrouve: { backgroundColor: "#4a9d7a" },
  markerSelected: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
  },
});
