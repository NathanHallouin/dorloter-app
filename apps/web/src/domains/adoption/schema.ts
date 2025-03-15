import {
  boolean,
  date,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "@/server/db/schema";
import { sexEnum } from "@infra/db/enums";
import { shelters, shelterTags } from "@shelters/schema";

// ─── Enums adoption ────────────────────────────────────────────────────────

export const speciesEnum = pgEnum("species", ["chat", "chien"]);

export const ageCategoryEnum = pgEnum("age_category", [
  "chaton",
  "jeune",
  "adulte",
  "senior",
]);

// fiv/felv : chat uniquement (null pour les autres espèces).
export const fivFelvEnum = pgEnum("fiv_felv", [
  "negatif",
  "fiv_positif",
  "felv_positif",
  "fiv_felv_positif",
  "non_teste",
]);

export const compatibilityEnum = pgEnum("compatibility", [
  "oui",
  "non",
  "inconnu",
]);

export const petStatusEnum = pgEnum("pet_status", [
  "pre_adoptable",
  "disponible",
  "reserve",
  "adopte",
  "retire",
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "envoyee",
  "en_cours",
  "acceptee",
  "refusee",
  "annulee",
]);

export const housingTypeEnum = pgEnum("housing_type", [
  "appartement",
  "maison",
  "autre",
]);

// ─── Tables ────────────────────────────────────────────────────────────────

export const pets = pgTable(
  "pets",
  {
    id: uuid().primaryKey().defaultRandom(),
    shelterId: uuid("shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    species: speciesEnum().notNull(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    breed: varchar({ length: 100 }),
    color: varchar({ length: 100 }),
    sex: sexEnum().default("inconnu").notNull(),
    ageCategory: ageCategoryEnum("age_category"),
    estimatedBirth: date("estimated_birth"),
    isSterilized: boolean("is_sterilized").default(false).notNull(),
    isChipped: boolean("is_chipped").default(false).notNull(),
    isVaccinated: boolean("is_vaccinated").default(false).notNull(),
    // Champs spécifiques chat : null pour les chiens et autres espèces.
    fivFelv: fivFelvEnum("fiv_felv"),
    indoorOnly: boolean("indoor_only"),
    // Compatibilités : communes mais parfois non pertinentes — on garde
    // nullable pour ne pas forcer "inconnu" sur toutes les fiches.
    okWithCats: compatibilityEnum("ok_with_cats").default("inconnu").notNull(),
    okWithDogs: compatibilityEnum("ok_with_dogs").default("inconnu").notNull(),
    okWithChildren: compatibilityEnum("ok_with_children")
      .default("inconnu")
      .notNull(),
    specialNeeds: text("special_needs"),
    status: petStatusEnum().default("disponible").notNull(),
    adoptionFee: decimal("adoption_fee", { precision: 8, scale: 2 }),
    // ─── Campagne de collecte « animal en besoin » (lien externe) ────────
    // Dorloter n'héberge pas la collecte (cf. 2.5). Si renseignée, on
    // affiche un encart sur la fiche publique avec lien sortant vers
    // la plateforme du refuge. Les montants sont saisis manuellement par
    // le refuge pour la transparence (pas de synchro PSP).
    campaignUrl: text("campaign_url"),
    campaignTitle: varchar("campaign_title", { length: 120 }),
    campaignDescription: text("campaign_description"),
    campaignGoalAmount: decimal("campaign_goal_amount", {
      precision: 8,
      scale: 2,
    }),
    campaignCollectedAmount: decimal("campaign_collected_amount", {
      precision: 8,
      scale: 2,
    }),
    isDemo: boolean("is_demo").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("pets_shelter_id_idx").on(table.shelterId),
    index("pets_status_idx").on(table.status),
    index("pets_species_status_idx").on(table.species, table.status),
  ]
);

export const petPhotos = pgTable("pet_photos", {
  id: uuid().primaryKey().defaultRandom(),
  petId: uuid("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  url: text().notNull(),
  /**
   * Mini base64 data-URL (LQIP) — placeholder flou affiché par next/image
   * pendant le chargement. Généré à l'upload via sharp, ~500 octets.
   * Optionnel pour rester compatible avec les photos déjà en base.
   */
  blurDataUrl: text("blur_data_url"),
  isPrimary: boolean("is_primary").default(false).notNull(),
  order: integer().default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const applications = pgTable(
  "applications",
  {
    id: uuid().primaryKey().defaultRandom(),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: applicationStatusEnum().default("envoyee").notNull(),
    housingType: housingTypeEnum("housing_type"),
    hasOutdoorAccess: boolean("has_outdoor_access").default(false),
    hasOtherPets: text("has_other_pets"),
    hasChildren: boolean("has_children").default(false),
    childrenAges: text("children_ages"),
    experience: text(),
    motivation: text().notNull(),
    availability: text(),
    shelterNotes: text("shelter_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("applications_pet_status_idx").on(table.petId, table.status),
  ]
);

/**
 * Assignation M2M entre un pet et un tag refuge. Pas de ligne créée si
 * pas d'assignation : pas de bloat. La contrainte unique sur la paire
 * empêche les doublons.
 */
export const petTagAssignments = pgTable(
  "pet_tag_assignments",
  {
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => shelterTags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.petId, table.tagId] }),
    index("pet_tag_assignments_tag_idx").on(table.tagId),
  ]
);

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.petId] }),
    index("favorites_user_id_idx").on(table.userId),
  ]
);

// ─── Suivi post-adoption ───────────────────────────────────────────────────

export const adoptionFollowupStageEnum = pgEnum("adoption_followup_stage", [
  "j15",
  "j90",
  "j365",
]);

export const adoptionFollowupStatusEnum = pgEnum(
  "adoption_followup_status",
  ["pending", "sent", "skipped"]
);

/**
 * Workflow de suivi post-adoption. Quand une candidature passe à `acceptee`,
 * on crée trois lignes ici (J+15, J+90, J+365) avec `due_at` calculé. Un
 * cron quotidien scanne les lignes `pending` arrivées à échéance et
 * déclenche l'email correspondant, puis marque `sent`.
 *
 * `skipped` est utilisé quand on ne peut plus / veut plus envoyer (ex.
 * adoption finalement annulée, désinscription utilisateur).
 */
export const adoptionFollowups = pgTable(
  "adoption_followups",
  {
    id: uuid().primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    shelterId: uuid("shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    stage: adoptionFollowupStageEnum().notNull(),
    status: adoptionFollowupStatusEnum().default("pending").notNull(),
    dueAt: timestamp("due_at").notNull(),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("adoption_followups_application_stage_idx").on(
      table.applicationId,
      table.stage
    ),
    index("adoption_followups_due_idx").on(table.status, table.dueAt),
    index("adoption_followups_application_idx").on(table.applicationId),
  ]
);

// ─── Transferts inter-refuges ─────────────────────────────────────────────

export const petTransferStatusEnum = pgEnum("pet_transfer_status", [
  "en_attente",
  "accepte",
  "refuse",
  "annule",
]);

/**
 * Transfert d'un animal d'un refuge à un autre. À l'acceptation,
 * `pets.shelter_id` est mis à jour atomiquement et le transfert passe à
 * `accepte`. Garde une trace permanente pour l'historique.
 *
 * `decisionNote` : note du refuge destinataire (motif d'acceptation
 * ou de refus, conditions de prise en charge).
 */
export const petTransfers = pgTable(
  "pet_transfers",
  {
    id: uuid().primaryKey().defaultRandom(),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    fromShelterId: uuid("from_shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    toShelterId: uuid("to_shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    message: text(),
    status: petTransferStatusEnum().default("en_attente").notNull(),
    decidedByUserId: uuid("decided_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    decisionNote: text("decision_note"),
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    decidedAt: timestamp("decided_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("pet_transfers_pet_idx").on(table.petId),
    index("pet_transfers_from_idx").on(table.fromShelterId, table.status),
    index("pet_transfers_to_idx").on(table.toShelterId, table.status),
  ]
);

// ─── Carnet médical ───────────────────────────────────────────────────────

export const medicalEventTypeEnum = pgEnum("medical_event_type", [
  "vaccin",
  "vermifuge",
  "antiparasitaire",
  "consultation",
  "chirurgie",
  "traitement",
  "autre",
]);

/**
 * Évènements médicaux d'un animal : timeline visible refuge + adoptant
 * (post-adoption). `nextReminderAt` permet au système d'envoyer un
 * rappel quand la date approche (vaccins annuels, vermifuge mensuel...).
 *
 * `vetId` est nullable : un refuge peut renseigner un véto Dorloter
 * partenaire OU saisir un nom libre (`vetNameFreeform`) pour un véto
 * extérieur.
 */
export const petMedicalEvents = pgTable(
  "pet_medical_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    type: medicalEventTypeEnum().notNull(),
    title: varchar({ length: 255 }).notNull(),
    notes: text(),
    eventDate: date("event_date").notNull(),
    nextReminderAt: date("next_reminder_at"),
    vetNameFreeform: varchar("vet_name_freeform", { length: 255 }),
    attachmentUrl: text("attachment_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("pet_medical_events_pet_idx").on(
      table.petId,
      table.eventDate
    ),
    index("pet_medical_events_reminder_idx").on(table.nextReminderAt),
  ]
);

/**
 * Parrainage symbolique d'un animal par un utilisateur. Aucun flux
 * financier : un parrain s'engage symboliquement à suivre l'animal,
 * recevoir des nouvelles du refuge et porter sa visibilité. Plafond
 * 1 parrainage par couple (user, pet) via la PK composite.
 */
export const petSponsorships = pgTable(
  "pet_sponsorships",
  {
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Petit message public du parrain (optionnel, max 280 chars). */
    message: varchar({ length: 280 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.petId, table.userId] }),
    index("pet_sponsorships_user_idx").on(table.userId, table.createdAt),
    index("pet_sponsorships_pet_idx").on(table.petId, table.createdAt),
  ]
);

// Témoignage post-adoption. Unique par (user, pet) : un témoignage max
// par couple adoptant/animal. is_published permet au refuge ou à l'admin
// plateforme de retirer un témoignage litigieux sans le supprimer.
export const testimonials = pgTable(
  "testimonials",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    content: text().notNull(),
    photoUrl: text("photo_url"),
    isPublished: boolean("is_published").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("testimonials_user_pet_idx").on(table.userId, table.petId),
    index("testimonials_pet_idx").on(table.petId, table.isPublished),
  ]
);
