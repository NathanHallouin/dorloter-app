/**
 * Quiz adoption · `/adopter/quiz`.
 *
 * 7 questions step-by-step pour aider l'utilisateur à profiler son
 * adoption idéale. Aucune réponse n'est persistée serveur · tout reste
 * en local. À la fin, on construit des filtres `/pets` et on redirige
 * vers l'onglet Adopter avec ces filtres pré-appliqués.
 *
 * Mêmes 7 questions et même mapping que la version web (voir
 * `apps/web/src/domains/adoption/components/match-quiz.tsx`).
 */

import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type AnswerKey =
  | "species"
  | "housing"
  | "outdoor"
  | "children"
  | "otherPets"
  | "experience"
  | "time";

type Answers = Partial<Record<AnswerKey, string>>;

interface Question {
  key: AnswerKey;
  title: string;
  options: Array<{ value: string; label: string }>;
}

const QUESTIONS: Question[] = [
  {
    key: "species",
    title: "Vous penchez plutôt vers…",
    options: [
      { value: "chat", label: "Chat" },
      { value: "chien", label: "Chien" },
      { value: "any", label: "Aucune préférence" },
    ],
  },
  {
    key: "housing",
    title: "Où vivez-vous ?",
    options: [
      { value: "appartement", label: "Appartement" },
      { value: "maison", label: "Maison" },
    ],
  },
  {
    key: "outdoor",
    title: "Avez-vous un jardin ou un balcon sécurisé ?",
    options: [
      { value: "oui", label: "Oui" },
      { value: "non", label: "Non" },
    ],
  },
  {
    key: "children",
    title: "Y a-t-il des enfants à la maison ?",
    options: [
      { value: "young", label: "Oui, des jeunes enfants" },
      { value: "older", label: "Oui, plus grands" },
      { value: "none", label: "Pas d'enfants" },
    ],
  },
  {
    key: "otherPets",
    title: "Avez-vous déjà des animaux ?",
    options: [
      { value: "cat", label: "Un chat" },
      { value: "dog", label: "Un chien" },
      { value: "both", label: "Les deux" },
      { value: "none", label: "Aucun" },
    ],
  },
  {
    key: "experience",
    title: "C'est votre premier animal ?",
    options: [
      { value: "first", label: "Oui, premier compagnon" },
      { value: "had", label: "J'ai déjà eu un animal" },
    ],
  },
  {
    key: "time",
    title: "Combien de temps pouvez-vous lui consacrer chaque jour ?",
    options: [
      { value: "low", label: "Peu · je travaille à l'extérieur" },
      { value: "medium", label: "Le matin et le soir" },
      { value: "high", label: "Beaucoup · je télétravaille ou je suis dispo" },
    ],
  },
];

interface Recommendation {
  filters: Record<string, string>;
  highlights: string[];
}

function computeRecommendation(answers: Answers): Recommendation {
  const filters: Record<string, string> = {};
  const highlights: string[] = [];

  if (answers.species && answers.species !== "any") {
    filters.species = answers.species;
    highlights.push(
      answers.species === "chat" ? "Tu cherches un chat" : "Tu cherches un chien"
    );
  } else {
    highlights.push("Chats et chiens · tu es ouvert·e");
  }

  if (answers.children === "young" || answers.children === "older") {
    filters.okWithChildren = "oui";
    highlights.push("Animaux compatibles avec les enfants");
  }

  if (answers.otherPets === "cat" || answers.otherPets === "both") {
    filters.okWithCats = "oui";
    highlights.push("Compatible avec les chats déjà à la maison");
  }
  if (answers.otherPets === "dog" || answers.otherPets === "both") {
    filters.okWithDogs = "oui";
    highlights.push("Compatible avec les chiens déjà à la maison");
  }

  if (answers.housing === "appartement" && answers.outdoor === "non") {
    highlights.push(
      "Vie en appartement sans extérieur · privilégie un chat plutôt qu'un chien actif"
    );
  }

  if (answers.experience === "first") {
    highlights.push(
      "Premier animal · un adulte calme et sociable sera plus facile à accueillir"
    );
  }

  if (answers.time === "low") {
    highlights.push("Peu de temps dispo · privilégie un animal indépendant");
  } else if (answers.time === "high") {
    highlights.push(
      "Beaucoup de temps · un animal social ou actif appréciera ta présence"
    );
  }

  return { filters, highlights };
}

export default function QuizScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  const isDone = step >= QUESTIONS.length;
  const current = QUESTIONS[step];
  const progress = isDone ? 1 : (step + 1) / QUESTIONS.length;

  const recommendation = useMemo(
    () => (isDone ? computeRecommendation(answers) : null),
    [isDone, answers]
  );

  function handleAnswer(value: string) {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.key]: value }));
    setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function handleSeeResults() {
    if (!recommendation) return;
    router.replace({
      pathname: "/(tabs)",
      params: recommendation.filters,
    });
  }

  function handleRestart() {
    setStep(0);
    setAnswers({});
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Quiz adoption" }} />

      {/* Barre de progression */}
      <View style={styles.progressBar}>
        <View
          style={[styles.progressFill, { width: `${progress * 100}%` }]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {!isDone && current ? (
          <View style={styles.questionBlock}>
            <Text style={styles.step}>
              Question {step + 1} sur {QUESTIONS.length}
            </Text>
            <Text style={styles.title}>{current.title}</Text>
            <View style={styles.options}>
              {current.options.map((opt) => {
                const selected = answers[current.key] === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => handleAnswer(opt.value)}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        selected && styles.optionLabelSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color={selected ? "white" : "#a08585"}
                    />
                  </Pressable>
                );
              })}
            </View>
            {step > 0 ? (
              <Pressable style={styles.backBtn} onPress={handleBack}>
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={16}
                  color="#7a5f5f"
                />
                <Text style={styles.backBtnLabel}>Question précédente</Text>
              </Pressable>
            ) : null}
          </View>
        ) : recommendation ? (
          <View style={styles.resultsBlock}>
            <MaterialCommunityIcons
              name="paw"
              size={48}
              color="#e8634d"
              style={{ alignSelf: "center" }}
            />
            <Text style={styles.resultsTitle}>Ton profil d'adoptant</Text>
            <Text style={styles.resultsSubtitle}>
              On a ajusté les filtres pour toi. À tester côté catalogue !
            </Text>
            <View style={styles.highlightList}>
              {recommendation.highlights.map((h) => (
                <View key={h} style={styles.highlightRow}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={16}
                    color="#4a9d7a"
                  />
                  <Text style={styles.highlightLabel}>{h}</Text>
                </View>
              ))}
            </View>

            <Pressable style={styles.cta} onPress={handleSeeResults}>
              <Text style={styles.ctaLabel}>Voir les animaux suggérés</Text>
            </Pressable>
            <Pressable onPress={handleRestart} style={styles.restartBtn}>
              <MaterialCommunityIcons
                name="refresh"
                size={16}
                color="#7a5f5f"
              />
              <Text style={styles.restartBtnLabel}>Refaire le quiz</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },

  progressBar: {
    height: 4,
    backgroundColor: "#f0e4dc",
  },
  progressFill: { height: 4, backgroundColor: "#e8634d" },

  scroll: { padding: 20, gap: 20 },

  questionBlock: { gap: 16 },
  step: {
    fontSize: 12,
    fontWeight: "700",
    color: "#a08585",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#1f1414", lineHeight: 28 },

  options: { gap: 10, marginTop: 8 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e6d4c8",
  },
  optionSelected: { backgroundColor: "#e8634d", borderColor: "#e8634d" },
  optionLabel: { fontSize: 15, fontWeight: "500", color: "#1f1414", flex: 1 },
  optionLabelSelected: { color: "white", fontWeight: "600" },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    marginTop: 12,
    paddingVertical: 8,
  },
  backBtnLabel: { color: "#7a5f5f", fontSize: 14, fontWeight: "500" },

  resultsBlock: { gap: 12, alignItems: "stretch" },
  resultsTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f1414",
    textAlign: "center",
  },
  resultsSubtitle: {
    fontSize: 14,
    color: "#7a5f5f",
    textAlign: "center",
    lineHeight: 20,
  },
  highlightList: {
    marginTop: 12,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0e4dc",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  highlightRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  highlightLabel: { flex: 1, fontSize: 14, color: "#1f1414", lineHeight: 18 },

  cta: {
    marginTop: 16,
    backgroundColor: "#e8634d",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  ctaLabel: { color: "white", fontWeight: "600", fontSize: 16 },
  restartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
    paddingVertical: 12,
  },
  restartBtnLabel: { color: "#7a5f5f", fontSize: 14, fontWeight: "500" },
});
