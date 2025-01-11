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
import { shelters } from "@shelters/schema";

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
