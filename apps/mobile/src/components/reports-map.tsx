/**
 * Carte interactive des signalements perdus / trouvés.
 *
 * - Style vectoriel via OpenFreeMap (pas de clé API en MVP, voir
 *   `extra.mapStyleUrl` dans app.config.ts pour surcharger).
 * - Un `PointAnnotation` par signalement, couleur selon le type.
 * - Tap sur un marker → onSelect (callback parent qui affiche un bottom card).
 *
 * Note dev : MapLibre RN est un module natif → ne fonctionne pas dans
 * Expo Go. Lance via Dev Client (`bun mobile:build` puis install l'APK).
 *
 * API @maplibre/maplibre-react-native v10 :
 *   - `MapView` (et non `Map`)
 *   - `Camera` avec `defaultSettings={{ centerCoordinate, zoomLevel }}`
 *   - `PointAnnotation` avec `coordinate: [lng, lat]` (singulier) +
 *     `onSelected` callback ; rend les `children` comme View native
 *     au-dessus de la carte. `Annotation` (sans Point) est une data source
 *     pour des Layers, pas adapté à un marker custom.
 */

import { useMemo } from "react";
import Constants from "expo-constants";
import {
  Camera,
  MapView,
  PointAnnotation,
} from "@maplibre/maplibre-react-native";
import { StyleSheet, View } from "react-native";
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

  // Centre initial via `defaultSettings` (non-controlled · pour suivre
  // l'user qui bouge, utiliser un ref + setCamera).
  const defaultCenter: [number, number] = useMemo(
    () => [center.longitude, center.latitude],
    [center.longitude, center.latitude]
  );

  return (
    <View style={styles.container}>
      <MapView style={StyleSheet.absoluteFill} mapStyle={styleUrl}>
        <Camera
          defaultSettings={{
            centerCoordinate: defaultCenter,
            zoomLevel: 12,
          }}
        />
        {reports.map((report) => {
          const isSelected = selectedId === report.id;
          return (
            <PointAnnotation
              key={report.id}
              id={`report-${report.id}`}
              coordinate={[
                report.location.longitude,
                report.location.latitude,
              ]}
              onSelected={() => onSelect(report.id)}
            >
              <View
                style={[
                  styles.marker,
                  report.type === "perdu"
                    ? styles.markerPerdu
                    : styles.markerTrouve,
                  isSelected && styles.markerSelected,
                ]}
              />
            </PointAnnotation>
          );
        })}
      </MapView>
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
