/**
 * Onglet Signaler · création d'un signalement perdu / trouvé.
 *
 * Form minimum pour le MVP mobile :
 *   - type (perdu / trouvé)
 *   - espèce (chat / chien)
 *   - description (>= 10 caractères)
 *   - photos (jusqu'à 4, expo-image-picker → presign S3 → PUT)
 *   - location : géoloc courante (pas de carte picker en MVP · prochaine itération)
 *   - dateEvent : aujourd'hui (le flow d'édition permettra de corriger)
 *
 * Le détail (race, couleur, signes distinctifs, contact, dates passées,
 * pin sur la carte) revient à l'édition côté web pour l'instant · la
 * cible principale ici est de pouvoir signaler depuis la rue en 30 s.
 */

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect, Stack, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { api } from "@/lib/api";
import { uploadPhoto } from "@/lib/uploads";
import { getAuthToken } from "@/lib/auth";
import { getCurrentLocation, type UserCoords } from "@/lib/location";

type ReportType = "perdu" | "trouve";
type Species = "chat" | "chien";

interface DraftPhoto {
  uri: string;
  /** Une fois uploadée vers S3. */
  publicUrl: string | null;
  /** State machine : pending = en cours d'upload, ready = uploadé, error = a échoué. */
  state: "pending" | "ready" | "error";
  /** En cas d'erreur, message à afficher. */
  errorMessage?: string;
}

const MAX_PHOTOS = 4;
const MIN_DESCRIPTION = 10;

const today = (): string => new Date().toISOString().slice(0, 10);

export default function SignalerScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // ─── Auth gate ────────────────────────────────────────────────────────────
  const tokenQuery = useQuery({
    queryKey: ["auth", "token"],
    queryFn: getAuthToken,
  });

  // ─── Form state ───────────────────────────────────────────────────────────
  const [type, setType] = useState<ReportType>("perdu");
  const [species, setSpecies] = useState<Species>("chat");
  const [petName, setPetName] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [coordsState, setCoordsState] = useState<
    "loading" | "ready" | "denied" | "error"
  >("loading");
  const [submitting, setSubmitting] = useState(false);

  // Géoloc au mount · non-blocking. Si refus, on bloque la submission
  // (un signalement sans lieu n'a pas de sens pour le matching).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const status = await getCurrentLocation();
      if (cancelled) return;
      if (status.kind === "granted") {
        setCoords(status.coords);
        setCoordsState("ready");
      } else if (status.kind === "denied") {
        setCoordsState("denied");
      } else {
        setCoordsState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (tokenQuery.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!tokenQuery.data) {
    return <Redirect href="/login" />;
  }

  // ─── Photo picker ─────────────────────────────────────────────────────────
  async function handlePickPhoto() {
    if (photos.length >= MAX_PHOTOS) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      selectionLimit: MAX_PHOTOS - photos.length,
      allowsMultipleSelection: true,
    });
    if (result.canceled) return;

    const newPhotos: DraftPhoto[] = result.assets.map((asset) => ({
      uri: asset.uri,
      publicUrl: null,
      state: "pending",
    }));

    setPhotos((prev) => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));

    // Upload chaque photo en parallèle
    newPhotos.forEach((photo) => {
      void uploadPhotoAsync(photo);
    });
  }

  async function uploadPhotoAsync(photo: DraftPhoto) {
    try {
      const { publicUrl } = await uploadPhoto({
        fileUri: photo.uri,
        contentType: "image/jpeg",
        kind: "report",
      });
      setPhotos((prev) =>
        prev.map((p) =>
          p.uri === photo.uri ? { ...p, publicUrl, state: "ready" } : p
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload échoué";
      setPhotos((prev) =>
        prev.map((p) =>
          p.uri === photo.uri ? { ...p, state: "error", errorMessage: message } : p
        )
      );
    }
  }

  function handleRemovePhoto(uri: string) {
    setPhotos((prev) => prev.filter((p) => p.uri !== uri));
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  const canSubmit =
    description.trim().length >= MIN_DESCRIPTION &&
    coordsState === "ready" &&
    coords !== null &&
    !photos.some((p) => p.state === "pending") &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit || !coords) return;
    setSubmitting(true);
    try {
      const readyPhotos = photos
        .filter((p) => p.state === "ready" && p.publicUrl)
        .map((p) => ({ url: p.publicUrl! }));

      const { data, error } = await api.POST("/reports", {
        body: {
          type,
          species,
          // Le form mobile MVP ne demande pas le sexe ni la puce :
          // valeurs par défaut côté Zod serveur. On les envoie
          // explicitement parce que le contrat OpenAPI les marque
          // requis (les champs `default` ne deviennent pas optionnels
          // dans le client TS généré).
          sex: "inconnu",
          isChipped: false,
          petName: petName.trim() || undefined,
          description: description.trim(),
          latitude: coords.latitude,
          longitude: coords.longitude,
          dateEvent: today(),
          photos: readyPhotos.length > 0 ? readyPhotos : undefined,
        },
      });
      if (error || !data) {
        throw new Error(error?.error.message ?? "Erreur inconnue.");
      }
      // Reset + invalidate la liste pour faire apparaître le nouveau report
      setPetName("");
      setDescription("");
      setPhotos([]);
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
      Alert.alert(
        "Signalement publié",
        data.data.matchCount > 0
          ? `${data.data.matchCount} correspondance(s) trouvée(s) · on va te notifier.`
          : "Tu seras notifié dès qu'un signalement potentiellement compatible apparaît.",
        [{ text: "OK", onPress: () => router.push("/signalements") }]
      );
    } catch (err) {
      Alert.alert(
        "Publication impossible",
        err instanceof Error ? err.message : "Erreur réseau."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: "Signaler un animal" }} />
      <Text style={styles.heading}>Signaler un animal</Text>

      <Field label="Type">
        <Segmented
          options={[
            { value: "perdu", label: "Perdu" },
            { value: "trouve", label: "Trouvé" },
          ]}
          value={type}
          onChange={(v) => setType(v as ReportType)}
        />
      </Field>

      <Field label="Espèce">
        <Segmented
          options={[
            { value: "chat", label: "Chat" },
            { value: "chien", label: "Chien" },
          ]}
          value={species}
          onChange={(v) => setSpecies(v as Species)}
        />
      </Field>

      <Field label="Nom (si connu)" optional>
        <TextInput
          testID="signaler-petname-input"
          style={styles.input}
          placeholder="Mimi, Rex…"
          value={petName}
          onChangeText={setPetName}
          editable={!submitting}
        />
      </Field>

      <Field label={`Description (${MIN_DESCRIPTION} caractères mini)`}>
        <TextInput
          testID="signaler-description-input"
          style={[styles.input, styles.textarea]}
          placeholder="Couleur du pelage, taille, signes distinctifs, contexte…"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          editable={!submitting}
        />
      </Field>

      <Field label="Photos (max 4)" optional>
        <View style={styles.photoGrid}>
          {photos.map((p) => (
            <View key={p.uri} style={styles.photoSlot}>
              <Image source={{ uri: p.uri }} style={styles.photoThumb} />
              {p.state === "pending" ? (
                <View style={styles.photoOverlay}>
                  <ActivityIndicator color="white" />
                </View>
              ) : null}
              {p.state === "error" ? (
                <View style={styles.photoOverlay}>
                  <MaterialCommunityIcons
                    name="alert-circle"
                    size={28}
                    color="white"
                  />
                </View>
              ) : null}
              <Pressable
                style={styles.photoRemove}
                onPress={() => handleRemovePhoto(p.uri)}
                hitSlop={10}
              >
                <MaterialCommunityIcons name="close" size={14} color="white" />
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_PHOTOS ? (
            <Pressable
              style={styles.photoAdd}
              onPress={handlePickPhoto}
              disabled={submitting}
            >
              <MaterialCommunityIcons
                name="image-plus"
                size={28}
                color="#a08585"
              />
            </Pressable>
          ) : null}
        </View>
      </Field>

      <View style={styles.locationCard}>
        <Text style={styles.locationLabel}>Lieu</Text>
        {coordsState === "loading" ? (
          <Text style={styles.locationValue}>Recherche de votre position…</Text>
        ) : coordsState === "ready" && coords ? (
          <Text style={styles.locationValue}>
            {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
          </Text>
        ) : coordsState === "denied" ? (
          <Text style={styles.locationError}>
            Position refusée. Active la géoloc pour signaler depuis la rue.
          </Text>
        ) : (
          <Text style={styles.locationError}>
            Impossible de récupérer la position. Réessaye plus tard.
          </Text>
        )}
      </View>

      <Pressable
        testID="signaler-submit"
        style={[styles.submit, !canSubmit && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}
      >
        {submitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.submitLabel}>Publier le signalement</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

// ─── Composants helpers ─────────────────────────────────────────────────────

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.labelOptional}> (optionnel)</Text> : null}
      </Text>
      {children}
    </View>
  );
}

interface SegmentedOption {
  value: string;
  label: string;
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: SegmentedOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(o.value)}
          >
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 12 },
  scroll: { padding: 20, paddingBottom: 60, gap: 18 },
  heading: { fontSize: 22, fontWeight: "700", color: "#1f1414" },
  title: { fontSize: 22, fontWeight: "700", color: "#1f1414", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },

  field: { gap: 6 },
  label: { fontSize: 14, color: "#1f1414", fontWeight: "600" },
  labelOptional: { color: "#a08585", fontWeight: "400" },

  input: {
    borderWidth: 1,
    borderColor: "#e6d4c8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1f1414",
    backgroundColor: "white",
  },
  textarea: { minHeight: 90, textAlignVertical: "top" },

  segmented: {
    flexDirection: "row",
    backgroundColor: "#f5ece4",
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  segmentActive: { backgroundColor: "white" },
  segmentLabel: { fontSize: 14, fontWeight: "600", color: "#7a5f5f" },
  segmentLabelActive: { color: "#1f1414" },

  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  photoSlot: { position: "relative" },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: "#f5ece4",
  },
  photoOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#1f1414",
    alignItems: "center",
    justifyContent: "center",
  },
  photoAdd: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#e6d4c8",
    alignItems: "center",
    justifyContent: "center",
  },

  locationCard: {
    backgroundColor: "#fff5f1",
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  locationLabel: { fontSize: 13, fontWeight: "700", color: "#1f1414" },
  locationValue: { fontSize: 14, color: "#564545" },
  locationError: { fontSize: 13, color: "#e8634d" },

  submit: {
    marginTop: 6,
    backgroundColor: "#e8634d",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  submitDisabled: { opacity: 0.5 },
  submitLabel: { color: "white", fontWeight: "600", fontSize: 16 },

  cta: {
    marginTop: 16,
    backgroundColor: "#e8634d",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
  },
  ctaLabel: { color: "white", fontWeight: "600", fontSize: 16 },
});
