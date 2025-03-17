import {
  boolean,
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
import { geometry } from "drizzle-orm/pg-core/columns/postgis_extension/geometry";
import { users } from "@/server/db/schema";

export const shelters = pgTable(
  "shelters",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 255 }).unique().notNull(),
    description: text(),
    missionLong: text("mission_long"),
    siret: varchar({ length: 14 }),
    foundedYear: integer("founded_year"),
    address: text(),
    location: geometry({ type: "point", srid: 4326, mode: "xy" }),
    phone: varchar({ length: 20 }),
    email: varchar({ length: 255 }),
    website: text(),
    donationUrl: text("donation_url"),
    /** Libellé affiché sur le bouton de don, ex. « HelloAsso », « Leetchi », « Notre cagnotte ». */
    donationLabel: varchar("donation_label", { length: 80 }),
    /** Message custom : comment l'argent est utilisé, déductibilité, etc. */
    donationDescription: text("donation_description"),
    visitHours: text("visit_hours"),
    logoUrl: text("logo_url"),
    coverUrl: text("cover_url"),
    isVerified: boolean("is_verified").default(false).notNull(),
    isDemo: boolean("is_demo").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("shelters_location_idx").using("gist", table.location),
  ]
);

export const shelterFollows = pgTable(
  "shelter_follows",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    shelterId: uuid("shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.shelterId] }),
    index("shelter_follows_shelter_idx").on(table.shelterId),
  ]
);

/**
 * Catégories de templates de réponse aux candidatures. Servent à filtrer
 * la sélection dans le flow accept/refus pour ne proposer que des
 * réponses adaptées au contexte.
 */
export const responseTemplateKindEnum = pgEnum("response_template_kind", [
  "acceptation",
  "refus",
  "demande_infos",
  "rdv",
  "generique",
]);

/**
 * Templates de réponses pré-rédigés par chaque refuge pour gagner du temps
 * sur les candidatures. Le `body` supporte des variables `{{nomCandidat}}`,
 * `{{prenomCandidat}}`, `{{nomAnimal}}`, `{{nomRefuge}}` qui sont
 * remplacées au moment du choix dans le flow.
 */
export const shelterResponseTemplates = pgTable(
  "shelter_response_templates",
  {
    id: uuid().primaryKey().defaultRandom(),
    shelterId: uuid("shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    name: varchar({ length: 255 }).notNull(),
    kind: responseTemplateKindEnum().default("generique").notNull(),
    body: text().notNull(),
    position: integer().default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("shelter_response_templates_shelter_idx").on(
      table.shelterId,
      table.kind,
      table.position
    ),
  ]
);

// ─── Calendrier d'événements refuge ───────────────────────────────────────

export const shelterEventTypeEnum = pgEnum("shelter_event_type", [
  "portes_ouvertes",
  "collecte",
  "salon",
  "rencontre",
  "urgence_appel",
  "autre",
]);

/**
 * Événements publiés par les refuges : portes ouvertes, collectes,
 * salons animaliers, rencontres avec un animal en FA, appels à l'aide.
 * Affichés sur la page publique `/evenements` et notifiables aux users
 * du secteur (cf. extension push hyper-localisées).
 *
 * Pour la V1, seuls les refuges sont émetteurs. Extension future : ajouter
 * un discriminateur `organizerType` pour permettre aussi pensions/vétos.
 */
export const shelterEvents = pgTable(
  "shelter_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    shelterId: uuid("shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    type: shelterEventTypeEnum().default("autre").notNull(),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at"),
    /** Lieu textuel libre. Si null, on retombe sur l'adresse du refuge. */
    venueAddress: text("venue_address"),
    /** Localisation géo. Si null, on retombe sur la position du refuge. */
    location: geometry({ type: "point", srid: 4326, mode: "xy" }),
    /** URL externe (inscription HelloAsso, page Facebook, formulaire). */
    externalUrl: text("external_url"),
    isPublished: boolean("is_published").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("shelter_events_shelter_idx").on(table.shelterId, table.startsAt),
    index("shelter_events_published_idx").on(
      table.isPublished,
      table.startsAt
    ),
    index("shelter_events_location_idx").using("gist", table.location),
  ]
);

// ─── Étiquettes / tags personnalisés ──────────────────────────────────────

export const shelterTagColorEnum = pgEnum("shelter_tag_color", [
  "coral",
  "lavande",
  "ambre",
  "vert",
  "bleu",
  "prune",
  "sable",
]);

/**
 * Étiquettes définies par un refuge pour catégoriser ses animaux
 * (« urgent », « besoins FA », « comportement délicat »...). Plafond
 * de 10 par refuge côté action. `isPublic` rend le tag visible sur la
 * fiche publique de l'animal (badge discret), sinon usage interne.
 */
export const shelterTags = pgTable(
  "shelter_tags",
  {
    id: uuid().primaryKey().defaultRandom(),
    shelterId: uuid("shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    name: varchar({ length: 60 }).notNull(),
    color: shelterTagColorEnum().default("coral").notNull(),
    isPublic: boolean("is_public").default(false).notNull(),
    position: integer().default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("shelter_tags_shelter_name_unique").on(
      table.shelterId,
      table.name
    ),
    index("shelter_tags_shelter_idx").on(table.shelterId, table.position),
  ]
);

// ─── Rendez-vous de visite refuge ──────────────────────────────────────────

/**
 * Créneaux récurrents par jour de semaine que le refuge ouvre aux visites.
 * Granularité 30 min (startMinutes multiple de 30, 0-1410). Chaque cellule
 * est indépendante : on peut ouvrir 14:00 et 15:00 sans avoir 14:30.
 *
 * dayOfWeek suit ISO 8601 : 1=lundi … 7=dimanche (cohérent avec
 * `EXTRACT(ISODOW)` en PostgreSQL).
 */
export const shelterVisitSlots = pgTable(
  "shelter_visit_slots",
  {
    id: uuid().primaryKey().defaultRandom(),
    shelterId: uuid("shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    startMinutes: integer("start_minutes").notNull(),
    capacity: integer().default(1).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("shelter_visit_slots_unique").on(
      table.shelterId,
      table.dayOfWeek,
      table.startMinutes
    ),
    index("shelter_visit_slots_shelter_idx").on(table.shelterId),
  ]
);

export const shelterVisitBookingStatusEnum = pgEnum(
  "shelter_visit_booking_status",
  ["en_attente", "confirme", "annule_par_refuge", "annule_par_user", "honore", "no_show"]
);

/**
 * Réservation effective d'un créneau par un adoptant. `scheduledFor` est
 * la date/heure absolue (pas de FK vers slot — un créneau hebdo se
 * matérialise en plusieurs bookings, et un slot peut être supprimé sans
 * effacer l'historique). `petId` est optionnel : on peut prendre RDV
 * pour un animal précis OU pour discussion générale.
 */
export const shelterVisitBookings = pgTable(
  "shelter_visit_bookings",
  {
    id: uuid().primaryKey().defaultRandom(),
    shelterId: uuid("shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    petId: uuid("pet_id"),
    scheduledFor: timestamp("scheduled_for").notNull(),
    durationMinutes: integer("duration_minutes").default(30).notNull(),
    status: shelterVisitBookingStatusEnum().default("en_attente").notNull(),
    userNotes: text("user_notes"),
    shelterNotes: text("shelter_notes"),
    reminderSentAt: timestamp("reminder_sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("shelter_visit_bookings_shelter_idx").on(
      table.shelterId,
      table.scheduledFor
    ),
    index("shelter_visit_bookings_user_idx").on(table.userId),
    index("shelter_visit_bookings_status_idx").on(
      table.status,
      table.scheduledFor
    ),
    uniqueIndex("shelter_visit_bookings_slot_unique").on(
      table.shelterId,
      table.scheduledFor,
      table.userId
    ),
  ]
);

// ─── Documents refuge ─────────────────────────────────────────────────────

export const shelterDocumentKindEnum = pgEnum("shelter_document_kind", [
  "contrat_adoption",
  "statuts_association",
  "agrement",
  "convention",
  "charte_visite",
  "autre",
]);

export const shelterDocumentVisibilityEnum = pgEnum(
  "shelter_document_visibility",
  ["public", "internal"]
);

/**
 * Documents administratifs ou éditoriaux uploadés par un refuge.
 * `public` : visibles sur la fiche refuge publique (charte de visite,
 * contrat d'adoption type, statuts d'association). `internal` : usage
 * interne au refuge (factures, courriers, comptes-rendus).
 */
export const shelterDocuments = pgTable(
  "shelter_documents",
  {
    id: uuid().primaryKey().defaultRandom(),
    shelterId: uuid("shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    uploadedByUserId: uuid("uploaded_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: shelterDocumentKindEnum().default("autre").notNull(),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
    fileUrl: text("file_url").notNull(),
    fileMimeType: varchar("file_mime_type", { length: 80 }),
    fileSizeBytes: integer("file_size_bytes"),
    visibility: shelterDocumentVisibilityEnum().default("internal").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("shelter_documents_shelter_idx").on(table.shelterId, table.kind),
    index("shelter_documents_public_idx").on(
      table.visibility,
      table.shelterId
    ),
  ]
);

// ─── Newsletter refuge ────────────────────────────────────────────────────

export const shelterNewsletterKindEnum = pgEnum("shelter_newsletter_kind", [
  "general",
  "nouvel_arrivage",
  "urgence_fa",
  "appel_dons",
  "evenement",
]);

/**
 * Historique des newsletters envoyées par un refuge à ses followers.
 * Stockage post-envoi : le contenu effectivement diffusé pour audit
 * RGPD et affichage de l'historique.
 *
 * Pas de cron, pas de retry : l'envoi se fait dans l'action server qui
 * fait le fanout en best-effort. `recipientCount` est le nombre de
 * destinataires au moment de l'envoi.
 */
export const shelterNewsletters = pgTable(
  "shelter_newsletters",
  {
    id: uuid().primaryKey().defaultRandom(),
    shelterId: uuid("shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    sentByUserId: uuid("sent_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: shelterNewsletterKindEnum().default("general").notNull(),
    subject: varchar({ length: 255 }).notNull(),
    body: text().notNull(),
    recipientCount: integer("recipient_count").default(0).notNull(),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
  },
  (table) => [
    index("shelter_newsletters_shelter_idx").on(
      table.shelterId,
      table.sentAt
    ),
  ]
);

export const shelterInvitations = pgTable(
  "shelter_invitations",
  {
    id: uuid().primaryKey().defaultRandom(),
    shelterId: uuid("shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    invitedById: uuid("invited_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: varchar({ length: 255 }).notNull(),
    token: varchar({ length: 255 }).notNull(),
    status: varchar({ length: 20 }).notNull().default("en_attente"),
    acceptedAt: timestamp("accepted_at"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("shelter_invitations_token_idx").on(table.token),
    index("shelter_invitations_shelter_id_idx").on(table.shelterId),
    index("shelter_invitations_email_idx").on(table.email),
  ]
);

// ─── Actualités / blog refuge ─────────────────────────────────────────────

export const shelterNewsPostTypeEnum = pgEnum("shelter_news_post_type", [
  "adoption",
  "evenement",
  "urgence",
  "temoignage",
  "autre",
]);

export const shelterNewsPostStatusEnum = pgEnum("shelter_news_post_status", [
  "brouillon",
  "en_attente_modo",
  "publie",
  "refuse",
  "archive",
]);

/**
 * Articles publiés par les refuges : témoignages d'adoption, comptes-rendus
 * d'événement, appels à l'aide, actualités générales. Affichés sur
 * `/actualites` et dans un flux RSS public.
 *
 * Workflow modération : refuges `is_verified=true` publient direct (status
 * `publie`, `publishedAt` rempli). Les autres passent par `en_attente_modo`
 * et sont validés/refusés par un platform_admin.
 *
 * `body` stocké en markdown léger (titres, gras, italique, listes, liens).
 * Le rendu HTML est calculé côté server avec sanitization stricte.
 */
export const shelterNewsPosts = pgTable(
  "shelter_news_posts",
  {
    id: uuid().primaryKey().defaultRandom(),
    shelterId: uuid("shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: shelterNewsPostTypeEnum().default("autre").notNull(),
    status: shelterNewsPostStatusEnum().default("brouillon").notNull(),
    slug: varchar({ length: 255 }).notNull(),
    title: varchar({ length: 255 }).notNull(),
    excerpt: varchar({ length: 500 }),
    body: text().notNull(),
    coverUrl: text("cover_url"),
    publishedAt: timestamp("published_at"),
    rejectedReason: text("rejected_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("shelter_news_posts_slug_idx").on(table.slug),
    index("shelter_news_posts_shelter_idx").on(
      table.shelterId,
      table.publishedAt
    ),
    index("shelter_news_posts_status_idx").on(table.status, table.publishedAt),
    index("shelter_news_posts_type_idx").on(table.type, table.publishedAt),
  ]
);

// ─── Familles d'accueil ───────────────────────────────────────────────────

export const fosterFamilyStatusEnum = pgEnum("foster_family_status", [
  "candidature",
  "active",
  "pause",
  "refusee",
  "archive",
]);

/**
 * Famille d'accueil rattachée à un refuge. Un user Dorloter peut être
 * FA pour un ou plusieurs refuges. Le workflow : candidature → validation
 * par un shelter_admin → active → placements possibles.
 *
 * Pause = FA temporairement indisponible (vacances, travaux), reste
 * active mais ne reçoit pas de propositions.
 *
 * Pas de FK unique sur (user_id, shelter_id) : la même personne peut
 * recandidater après un refus ou un archivage.
 */
export const fosterFamilies = pgTable(
  "foster_families",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    shelterId: uuid("shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    status: fosterFamilyStatusEnum().default("candidature").notNull(),
    acceptsCats: boolean("accepts_cats").default(true).notNull(),
    acceptsDogs: boolean("accepts_dogs").default(true).notNull(),
    /** Nombre maximum d'animaux hébergés simultanément. */
    maxCapacity: integer("max_capacity").default(1).notNull(),
    hasGarden: boolean("has_garden").default(false).notNull(),
    hasOtherPets: boolean("has_other_pets").default(false).notNull(),
    otherPetsDescription: text("other_pets_description"),
    hasChildren: boolean("has_children").default(false).notNull(),
    childrenAges: text("children_ages"),
    experience: text(),
    motivation: text().notNull(),
    address: text(),
    location: geometry({ type: "point", srid: 4326, mode: "xy" }),
    phone: varchar({ length: 20 }),
    shelterNotes: text("shelter_notes"),
    validatedAt: timestamp("validated_at"),
    validatedByUserId: uuid("validated_by_user_id").references(
      () => users.id,
      { onDelete: "set null" }
    ),
    rejectedReason: text("rejected_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("foster_families_user_idx").on(table.userId),
    index("foster_families_shelter_status_idx").on(
      table.shelterId,
      table.status
    ),
    index("foster_families_location_idx").using("gist", table.location),
  ]
);

// ─── Bénévoles refuge (planning + créneaux) ───────────────────────────────

export const shelterVolunteerStatusEnum = pgEnum("shelter_volunteer_status", [
  "candidature",
  "active",
  "pause",
  "refusee",
  "archive",
]);

/**
 * Bénévole rattaché à un refuge. Un user peut être bénévole pour
 * plusieurs refuges (entrées distinctes). Workflow : candidature →
 * shelter_admin valide → active → s'inscrit à des créneaux.
 *
 * `totalHours` agrégé en lecture (cumul du temps réel des créneaux
 * check-out moins check-in). Pas dénormalisé en colonne dédiée pour
 * éviter une race condition à chaque check-out.
 */
export const shelterVolunteers = pgTable(
  "shelter_volunteers",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    shelterId: uuid("shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    status: shelterVolunteerStatusEnum().default("candidature").notNull(),
    /** Compétences ou disponibilités libres (multilignes accepté). */
    skills: text(),
    availability: text(),
    motivation: text().notNull(),
    phone: varchar({ length: 20 }),
    shelterNotes: text("shelter_notes"),
    validatedAt: timestamp("validated_at"),
    validatedByUserId: uuid("validated_by_user_id").references(
      () => users.id,
      { onDelete: "set null" }
    ),
    rejectedReason: text("rejected_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("shelter_volunteers_user_idx").on(table.userId),
    index("shelter_volunteers_shelter_status_idx").on(
      table.shelterId,
      table.status
    ),
  ]
);

export const shelterShiftStatusEnum = pgEnum("shelter_shift_status", [
  "ouvert",
  "complet",
  "annule",
  "termine",
]);

/**
 * Créneau ponctuel (balade chiens, soins chats, accueil public, etc.)
 * Un refuge le publie, les bénévoles validés s'y inscrivent dans la
 * limite de la capacité. Le statut est dérivé de l'inscription en
 * temps réel mais aussi stocké pour les filtres rapides.
 */
export const shelterShifts = pgTable(
  "shelter_shifts",
  {
    id: uuid().primaryKey().defaultRandom(),
    shelterId: uuid("shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    capacity: integer().default(1).notNull(),
    status: shelterShiftStatusEnum().default("ouvert").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("shelter_shifts_shelter_starts_idx").on(
      table.shelterId,
      table.startsAt
    ),
    index("shelter_shifts_status_starts_idx").on(table.status, table.startsAt),
  ]
);

export const shelterShiftSignupStatusEnum = pgEnum(
  "shelter_shift_signup_status",
  ["inscrit", "confirme", "annule", "absent", "termine"]
);

/**
 * Inscription d'un bénévole à un créneau. `checkInAt`/`checkOutAt`
 * remplis par le shelter_admin lors de la séance (clic dans le panel
 * refuge), et servent à calculer les heures comptabilisées pour le
 * bénévole. Pas d'unique (volunteer + shift) : on bloque l'inscription
 * doublon côté action.
 */
export const shelterShiftSignups = pgTable(
  "shelter_shift_signups",
  {
    id: uuid().primaryKey().defaultRandom(),
    shiftId: uuid("shift_id")
      .notNull()
      .references(() => shelterShifts.id, { onDelete: "cascade" }),
    volunteerId: uuid("volunteer_id")
      .notNull()
      .references(() => shelterVolunteers.id, { onDelete: "cascade" }),
    shelterId: uuid("shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    status: shelterShiftSignupStatusEnum().default("inscrit").notNull(),
    checkInAt: timestamp("check_in_at"),
    checkOutAt: timestamp("check_out_at"),
    notes: text(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("shelter_shift_signups_uniq").on(
      table.shiftId,
      table.volunteerId
    ),
    index("shelter_shift_signups_shift_idx").on(table.shiftId, table.status),
    index("shelter_shift_signups_volunteer_idx").on(
      table.volunteerId,
      table.status
    ),
  ]
);
