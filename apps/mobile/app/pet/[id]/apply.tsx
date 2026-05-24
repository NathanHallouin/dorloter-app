/**
 * Formulaire de candidature pour adopter un animal · `/pet/[id]/apply`.
 *
 * Présenté en stack au-dessus de la fiche détail (back button).
 *
 * Champs MVP :
 *   - logement (appartement / maison / autre)
 *   - accès extérieur
 *   - autres animaux (texte libre)
 *   - enfants (oui/non) + âges si oui
 *   - expérience (texte libre)
 *   - motivation (>= 20 caractères, requis)
 *   - disponibilité (texte libre)
 *
 * Submit :
 *   - 201 → toast succès, retour à la fiche détail
 *   - 409 (déjà candidaté) → message clair
 *   - 422 (pet plus disponible) → message clair
 *
 * Auth gate : si pas de token, redirige vers login (la fiche détail
 * filtre déjà mais on double-check).
 */

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

type HousingType = "appartement" | "maison" | "autre";

const HOUSING_OPTIONS: { value: HousingType; label: string }[] = [
  { value: "appartement", label: "Appartement" },
  { value: "maison", label: "Maison" },
  { value: "autre", label: "Autre" },
];

const MIN_MOTIVATION = 20;

export default function ApplyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [housingType, setHousingType] = useState<HousingType | undefined>(
    undefined
  );
  const [hasOutdoorAccess, setHasOutdoorAccess] = useState(false);
  const [hasOtherPets, setHasOtherPets] = useState("");
  const [hasChildren, setHasChildren] = useState(false);
  const [childrenAges, setChildrenAges] = useState("");
  const [experience, setExperience] = useState("");
  const [motivation, setMotivation] = useState("");
  const [availability, setAvailability] = useState("");

  const applyMut = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Pet inconnu.");
      const { data, error } = await api.POST("/applications", {
        body: {
          petId: id,
          housingType,
          hasOutdoorAccess,
          hasOtherPets: hasOtherPets.trim() || undefined,
          hasChildren,
          childrenAges: hasChildren && childrenAges.trim()
            ? childrenAges.trim()
            : undefined,
          experience: experience.trim() || undefined,
          motivation: motivation.trim(),
          availability: availability.trim() || undefined,
        },
      });
      if (error) throw error.error;
      if (!data) throw new Error("Réponse vide.");
      return data.data;
    },
    onSuccess: () => {
      // Pas de query "applications" côté mobile pour l'instant · l'invalidate
      // est défensif au cas où on l'ajoute plus tard.
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      Alert.alert(
        "Candidature envoyée",
        "Le refuge va recevoir ta candidature. Tu seras notifié dès qu'il y aura une réponse.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    },
    onError: (err: { code?: string; message?: string } | Error) => {
      const code = "code" in err ? err.code : undefined;
      const message =
        "message" in err && err.message ? err.message : "Erreur réseau.";
      const title =
        code === "CONFLICT"
          ? "Déjà candidaté"
          : code === "UNPROCESSABLE"
            ? "Animal plus disponible"
            : "Candidature impossible";
      Alert.alert(title, message);
    },
  });

  const motivationLength = motivation.trim().length;
  const canSubmit =
    motivationLength >= MIN_MOTIVATION && !applyMut.isPending && !!id;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: "Candidater" }} />

      <Text style={styles.heading}>Présente-toi au refuge</Text>
      <Text style={styles.intro}>
        Quelques infos suffisent · le refuge te contactera pour un échange.
      </Text>

      <Field label="Logement" optional>
        <View style={styles.segmented}>
          {HOUSING_OPTIONS.map((opt) => {
            const active = housingType === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.segment, active && styles.segmentActive]}
                onPress={() =>
                  setHousingType(active ? undefined : opt.value)
                }
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    active && styles.segmentLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <SwitchField
        label="Accès extérieur (jardin, terrasse, balcon)"
        value={hasOutdoorAccess}
        onChange={setHasOutdoorAccess}
      />

      <Field label="Autres animaux à la maison" optional>
        <TextInput
          style={styles.input}
          placeholder="Ex. un chat de 3 ans, un chien Beagle…"
          value={hasOtherPets}
          onChangeText={setHasOtherPets}
          editable={!applyMut.isPending}
        />
      </Field>

      <SwitchField
        label="Enfants au foyer"
        value={hasChildren}
        onChange={setHasChildren}
      />

      {hasChildren ? (
        <Field label="Âges des enfants" optional>
          <TextInput
            style={styles.input}
            placeholder="Ex. 4 et 8 ans"
            value={childrenAges}
            onChangeText={setChildrenAges}
            editable={!applyMut.isPending}
          />
        </Field>
      ) : null}

      <Field label="Expérience avec les animaux" optional>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Premier animal ? Ou plusieurs adoptions précédentes ?"
          value={experience}
          onChangeText={setExperience}
          multiline
          numberOfLines={3}
          editable={!applyMut.isPending}
        />
      </Field>

      <Field label={`Motivation (${MIN_MOTIVATION} caractères mini)`}>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Pourquoi cet animal en particulier ? Ce que tu peux lui offrir…"
          value={motivation}
          onChangeText={setMotivation}
          multiline
          numberOfLines={5}
          editable={!applyMut.isPending}
        />
        <Text
          style={[
            styles.counter,
            motivationLength >= MIN_MOTIVATION && styles.counterOk,
          ]}
        >
          {motivationLength} / {MIN_MOTIVATION}
        </Text>
      </Field>

      <Field label="Disponibilité pour la rencontre" optional>
        <TextInput
          style={styles.input}
          placeholder="Ex. soirs et week-ends"
          value={availability}
          onChangeText={setAvailability}
          editable={!applyMut.isPending}
        />
      </Field>

      <Pressable
        style={[styles.submit, !canSubmit && styles.submitDisabled]}
        onPress={() => canSubmit && applyMut.mutate()}
        disabled={!canSubmit}
      >
        {applyMut.isPending ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.submitLabel}>Envoyer ma candidature</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function SwitchField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 60, gap: 16 },
  heading: { fontSize: 22, fontWeight: "700", color: "#1f1414" },
  intro: { fontSize: 14, color: "#7a5f5f", marginBottom: 4 },

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
  textarea: { minHeight: 80, textAlignVertical: "top" },
  counter: { fontSize: 12, color: "#a08585", textAlign: "right" },
  counterOk: { color: "#4a9d7a" },

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

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e6d4c8",
  },
  switchLabel: { fontSize: 15, color: "#1f1414", flex: 1, marginRight: 12 },

  submit: {
    marginTop: 8,
    backgroundColor: "#e8634d",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  submitDisabled: { opacity: 0.5 },
  submitLabel: { color: "white", fontWeight: "600", fontSize: 16 },
});
