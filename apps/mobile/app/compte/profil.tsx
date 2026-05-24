/**
 * Édition du profil · `/compte/profil`.
 *
 * Form : nom (obligatoire), téléphone (optionnel), rayon de notification
 * (slider 1-50 km). La position GPS est captée via expo-location au tap
 * sur "Utiliser ma position courante" · on n'expose pas de map picker en
 * MVP.
 *
 * Submit → PATCH /me → invalide la query `me` → toast OK → back.
 */

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect, Stack, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { getCurrentLocation } from "@/lib/location";

interface ProfileForm {
  name: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  notificationRadiusKm: number;
}

const RADIUS_PRESETS = [5, 10, 20, 50] as const;

export default function ProfilEditScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 16);

  const tokenQuery = useQuery({
    queryKey: ["auth", "token"],
    queryFn: getAuthToken,
  });

  const meQuery = useQuery({
    enabled: !!tokenQuery.data,
    queryKey: ["me"],
    queryFn: async () => {
      const { data, error } = await api.GET("/me");
      if (error) throw new Error(error.error.message);
      return data.data;
    },
  });

  const [form, setForm] = useState<ProfileForm | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (meQuery.data && !form) {
      setForm({
        name: meQuery.data.name,
        phone: meQuery.data.phone ?? "",
        latitude: meQuery.data.location?.latitude ?? null,
        longitude: meQuery.data.location?.longitude ?? null,
        notificationRadiusKm: meQuery.data.notificationRadiusKm ?? 10,
      });
    }
  }, [meQuery.data, form]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error("Form pas prêt.");
      const body: {
        name?: string;
        phone?: string | null;
        latitude?: number;
        longitude?: number;
        notificationRadiusKm?: number;
      } = {
        name: form.name.trim(),
        phone: form.phone.trim() ? form.phone.trim() : null,
        notificationRadiusKm: form.notificationRadiusKm,
      };
      if (form.latitude !== null && form.longitude !== null) {
        body.latitude = form.latitude;
        body.longitude = form.longitude;
      }
      const { data, error } = await api.PATCH("/me", { body });
      if (error) throw new Error(error.error.message);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      Alert.alert("Profil mis à jour", "Tes changements ont été enregistrés.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err) => {
      Alert.alert("Échec de la mise à jour", err.message);
    },
  });

  async function handleUseCurrentLocation() {
    setLocating(true);
    try {
      const status = await getCurrentLocation();
      if (status.kind === "granted") {
        setForm((prev) =>
          prev
            ? {
                ...prev,
                latitude: status.coords.latitude,
                longitude: status.coords.longitude,
              }
            : prev
        );
      } else if (status.kind === "denied") {
        Alert.alert(
          "Position refusée",
          "Active la géoloc dans les paramètres pour utiliser cette fonction."
        );
      } else {
        Alert.alert(
          "Position indisponible",
          "Impossible de récupérer ta position. Réessaie plus tard."
        );
      }
    } finally {
      setLocating(false);
    }
  }

  if (tokenQuery.isPending) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Modifier mon profil" }} />
        <ActivityIndicator />
      </View>
    );
  }
  if (!tokenQuery.data) return <Redirect href="/login" />;

  if (meQuery.isPending || !form) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Modifier mon profil" }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (meQuery.isError) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Modifier mon profil" }} />
        <Text style={styles.errorTitle}>Impossible de charger le profil</Text>
        <Text style={styles.errorBody}>{meQuery.error.message}</Text>
      </View>
    );
  }

  const canSave = form.name.trim().length > 0 && !saveMut.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Stack.Screen options={{ title: "Modifier mon profil" }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Field label="Nom">
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(v) =>
              setForm((p) => (p ? { ...p, name: v } : p))
            }
            placeholder="Ton prénom (ou pseudo)"
            autoCapitalize="words"
            autoComplete="name"
            editable={!saveMut.isPending}
          />
        </Field>

        <Field label="Téléphone" optional>
          <TextInput
            style={styles.input}
            value={form.phone}
            onChangeText={(v) =>
              setForm((p) => (p ? { ...p, phone: v } : p))
            }
            placeholder="06 12 34 56 78"
            keyboardType="phone-pad"
            autoComplete="tel"
            editable={!saveMut.isPending}
          />
        </Field>

        <Field label="Position">
          <View style={styles.locationCard}>
            {form.latitude !== null && form.longitude !== null ? (
              <Text style={styles.locationCoords}>
                {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}
              </Text>
            ) : (
              <Text style={styles.locationEmpty}>
                Aucune position enregistrée
              </Text>
            )}
            <Pressable
              style={styles.locationBtn}
              onPress={handleUseCurrentLocation}
              disabled={locating || saveMut.isPending}
            >
              {locating ? (
                <ActivityIndicator size="small" color="#e8634d" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="crosshairs-gps"
                    size={16}
                    color="#e8634d"
                  />
                  <Text style={styles.locationBtnLabel}>
                    Utiliser ma position
                  </Text>
                </>
              )}
            </Pressable>
          </View>
          <Text style={styles.helper}>
            Ta position sert au matching de proximité (signalements proches).
            Elle n'est jamais affichée publiquement.
          </Text>
        </Field>

        <Field label="Rayon de notification">
          <View style={styles.chipsRow}>
            {RADIUS_PRESETS.map((km) => {
              const active = form.notificationRadiusKm === km;
              return (
                <Pressable
                  key={km}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() =>
                    setForm((p) =>
                      p ? { ...p, notificationRadiusKm: km } : p
                    )
                  }
                  disabled={saveMut.isPending}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      active && styles.chipLabelActive,
                    ]}
                  >
                    {km} km
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.helper}>
            Tu seras alerté des signalements perdus / trouvés dans ce rayon
            autour de ta position.
          </Text>
        </Field>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomInset }]}>
        <Pressable
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={() => canSave && saveMut.mutate()}
          disabled={!canSave}
        >
          {saveMut.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveLabel}>Enregistrer</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 8,
  },
  scroll: { padding: 20, gap: 18 },

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
  helper: { fontSize: 12, color: "#a08585", lineHeight: 16 },

  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e6d4c8",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  locationCoords: { fontSize: 14, color: "#1f1414", fontWeight: "500" },
  locationEmpty: { fontSize: 14, color: "#a08585", fontStyle: "italic" },
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e8634d",
  },
  locationBtnLabel: { color: "#e8634d", fontSize: 13, fontWeight: "600" },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e6d4c8",
    backgroundColor: "white",
  },
  chipActive: { backgroundColor: "#e8634d", borderColor: "#e8634d" },
  chipLabel: { fontSize: 13, fontWeight: "600", color: "#7a5f5f" },
  chipLabelActive: { color: "white" },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderColor: "#f0e4dc",
  },
  saveBtn: {
    backgroundColor: "#e8634d",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveLabel: { color: "white", fontWeight: "600", fontSize: 16 },

  errorTitle: { fontSize: 16, fontWeight: "600", color: "#1f1414" },
  errorBody: { fontSize: 14, color: "#7a5f5f", textAlign: "center" },
});
