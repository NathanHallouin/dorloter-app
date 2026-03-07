/**
 * Lecteur audio inline pour une bulle de message vocal.
 *
 * Charge l'audio à la première écoute (pas au mount pour économiser
 * mémoire/réseau). Bouton play/pause + barre de progression + timer.
 * Unload automatique au démontage du composant.
 *
 * `expo-av` est imported via `require()` lazy + try/catch : si le binaire
 * dev-client n'a pas encore le module natif, le composant affiche un
 * placeholder discret au lieu de crash l'écran entier.
 */

import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import type { Audio as AudioType, AVPlaybackStatus } from "expo-av";

/**
 * Convertit une URL relative `/api/v1/...` en URL absolue en se
 * basant sur l'`apiBaseUrl` configuré. Une URL déjà absolue est
 * retournée telle quelle.
 */
function resolveAudioUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  const apiBaseUrl =
    (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
    "http://localhost:8080/api/v1";
  // `apiBaseUrl` finit en /api/v1 · on enlève ce suffixe car `url`
  // commence déjà par `/api/v1/...`.
  const origin = apiBaseUrl.replace(/\/api\/v1\/?$/, "");
  return `${origin}${url}`;
}

interface VoicePlayerProps {
  url: string;
  durationMs: number;
  mine: boolean;
}

let cachedAudio: typeof AudioType | null | undefined = undefined;
function getAudio(): typeof AudioType | null {
  if (cachedAudio !== undefined) return cachedAudio;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedAudio = require("expo-av").Audio as typeof AudioType;
  } catch {
    cachedAudio = null;
  }
  return cachedAudio;
}

export function VoicePlayer({ url, durationMs, mine }: VoicePlayerProps) {
  const Audio = getAudio();
  const soundRef = useRef<InstanceType<typeof AudioType.Sound> | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, []);

  if (!Audio) {
    return (
      <View style={[styles.row, styles.unsupported]}>
        <MaterialCommunityIcons
          name="microphone-off"
          size={16}
          color={mine ? "rgba(255,255,255,0.75)" : "#7a5f5f"}
        />
        <Text
          style={[
            styles.unsupportedLabel,
            { color: mine ? "rgba(255,255,255,0.85)" : "#7a5f5f" },
          ]}
        >
          Message vocal indisponible (rebuild requis)
        </Text>
      </View>
    );
  }

  function onPlaybackStatus(status: AVPlaybackStatus) {
    if (!status.isLoaded) return;
    setPlaying(status.isPlaying);
    setPositionMs(status.positionMillis ?? 0);
    if (status.didJustFinish) {
      setPlaying(false);
      setPositionMs(0);
      void soundRef.current?.setPositionAsync(0).catch(() => {});
    }
  }

  async function togglePlay() {
    if (loading || !Audio) return;
    if (!soundRef.current) {
      setLoading(true);
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri: resolveAudioUrl(url) },
          { shouldPlay: true, progressUpdateIntervalMillis: 100 },
          onPlaybackStatus
        );
        soundRef.current = sound;
      } catch {
        setLoading(false);
        return;
      }
      setLoading(false);
      return;
    }
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  }

  const progress = durationMs > 0 ? Math.min(positionMs / durationMs, 1) : 0;
  const remaining = Math.max(0, durationMs - positionMs);
  const tint = mine ? "white" : "#1f1414";

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <Pressable onPress={togglePlay} hitSlop={8} style={styles.playBtn}>
        <MaterialCommunityIcons
          name={loading ? "dots-horizontal" : playing ? "pause" : "play"}
          size={20}
          color={tint}
        />
      </Pressable>
      <View style={styles.barWrap}>
        <View
          style={[
            styles.barTrack,
            { backgroundColor: mine ? "rgba(255,255,255,0.35)" : "#e6d4c8" },
          ]}
        >
          <View
            style={[
              styles.barFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: mine ? "white" : "#e8634d",
              },
            ]}
          />
        </View>
      </View>
      <Text style={[styles.duration, { color: tint }]}>
        {formatDuration(remaining)}
      </Text>
    </View>
  );
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minWidth: 200,
  },
  rowMine: {},
  rowTheirs: {},
  unsupported: { gap: 6, paddingHorizontal: 8 },
  unsupportedLabel: { fontSize: 12, fontStyle: "italic" },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  barWrap: { flex: 1 },
  barTrack: { height: 4, borderRadius: 999, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 999 },
  duration: { fontSize: 12, fontVariant: ["tabular-nums"], minWidth: 36 },
});
