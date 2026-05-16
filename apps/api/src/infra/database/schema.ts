/**
 * Schéma `dorloter_api` typé pour Kysely.
 *
 * Conventions du projet reproduites ici :
 * - les enums métier sont des `varchar` + CHECK, donc typés `string` (la valeur
 *   DB française est lue et réémise telle quelle) ;
 * - les colonnes `numeric` sont lues en nombre (parseur pg configuré) ;
 * - les colonnes `date` sont lues en `yyyy-mm-dd` (parseur pg configuré) ;
 * - les colonnes `geometry(Point, 4326)` ne sont jamais sélectionnées telles
 *   quelles : on lit `ST_Y`/`ST_X` et on écrit `ST_SetSRID(ST_MakePoint(...))`.
 */

import type { ColumnType, Generated } from 'kysely';

/** `timestamptz` : lu en `Date`, écrit en `Date` ou littéral SQL. */
type Timestamp = ColumnType<Date, Date | string, Date | string>;

/** `timestamptz` avec valeur par défaut en base : optionnel à l'insertion. */
type TimestampDefault = ColumnType<Date, Date | string | undefined, Date | string>;

/** `date` : lu et écrit en `yyyy-mm-dd`. */
type DateOnly = ColumnType<string, string, string>;

/** `date` avec valeur par défaut en base : optionnel à l'insertion. */
type DateOnlyDefault = ColumnType<string, string | undefined, string>;

/** `geometry(Point, 4326)` : écrit uniquement via une expression `ST_*`. */
type Geometry = ColumnType<never, unknown, unknown>;

/** `jsonb` : lu et écrit en valeur JSON quelconque. */
type Json = ColumnType<unknown, unknown, unknown>;

// --- Identité ------------------------------------------------------------------

export interface UsersTable {
  id: Generated<string>;
  email: string;
  email_verified: Generated<boolean>;
  name: string;
  image: string | null;
  role: Generated<string>;
  phone: string | null;
  shelter_id: string | null;
  pension_id: string | null;
  bio: string | null;
  city: string | null;
  is_public: Generated<boolean>;
  location: Geometry | null;
  notification_radius_km: Generated<number>;
  digest_optin: Generated<boolean>;
  /** Dernière activité réelle (connexion ou renouvellement de jeton). */
  last_seen_at: TimestampDefault;
  /** Date de la relance envoyée avant suppression pour inactivité. */
  inactivity_notified_at: Timestamp | null;
  created_at: TimestampDefault;
  updated_at: TimestampDefault;
}

export interface AccountsTable {
  id: Generated<string>;
  user_id: string;
  account_id: string;
  provider_id: string;
  password: string | null;
  access_token: string | null;
  refresh_token: string | null;
  id_token: string | null;
  created_at: TimestampDefault;
  updated_at: TimestampDefault;
}

export interface AuthRefreshTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: Timestamp;
  revoked_at: Timestamp | null;
  user_agent: string | null;
  ip_address: string | null;
  created_at: TimestampDefault;
}

// --- Refuges -------------------------------------------------------------------

export interface SheltersTable {
  id: Generated<string>;
  name: string;
  slug: string;
  description: string | null;
  mission_long: string | null;
  founded_year: number | null;
  siret: string | null;
  address: string | null;
  location: Geometry | null;
  donation_url: string | null;
  donation_label: string | null;
  donation_description: string | null;
  visit_hours: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  cover_url: string | null;
  is_verified: Generated<boolean>;
  accepts_foster_applications: Generated<boolean>;
  created_at: TimestampDefault;
  updated_at: TimestampDefault;
}

export interface ShelterMembersTable {
  id: Generated<string>;
  shelter_id: string;
  user_id: string;
  role: string;
  status: Generated<string>;
  invited_by: string | null;
  created_at: TimestampDefault;
  updated_at: TimestampDefault;
}

export interface ShelterFollowsTable {
  user_id: string;
  shelter_id: string;
  created_at: TimestampDefault;
}

// --- Adoption ------------------------------------------------------------------

export interface PetsTable {
  id: Generated<string>;
  shelter_id: string;
  species: string;
  name: string;
  description: string | null;
  breed: string | null;
  color: string | null;
  sex: Generated<string>;
  age_category: string | null;
  estimated_birth: DateOnly | null;
  is_sterilized: Generated<boolean>;
  is_chipped: Generated<boolean>;
  is_vaccinated: Generated<boolean>;
  fiv_felv: string | null;
  indoor_only: boolean | null;
  ok_with_cats: Generated<string>;
  ok_with_dogs: Generated<string>;
  ok_with_children: Generated<string>;
  special_needs: string | null;
  status: Generated<string>;
  adoption_fee: number | null;
  icad_number: string | null;
  intake_date: DateOnly | null;
  intake_origin: string | null;
  intake_notes: string | null;
  outcome_date: DateOnly | null;
  outcome_type: string | null;
  outcome_notes: string | null;
  created_at: TimestampDefault;
  updated_at: TimestampDefault;
}

export interface PetPhotosTable {
  id: Generated<string>;
  pet_id: string;
  url: string;
  blur_data_url: string | null;
  is_primary: Generated<boolean>;
  order: Generated<number>;
  created_at: TimestampDefault;
}

export interface FavoritesTable {
  user_id: string;
  pet_id: string;
  created_at: TimestampDefault;
}

export interface ApplicationsTable {
  id: Generated<string>;
  pet_id: string;
  user_id: string;
  status: Generated<string>;
  housing_type: string | null;
  has_outdoor_access: Generated<boolean | null>;
  has_other_pets: string | null;
  has_children: Generated<boolean | null>;
  children_ages: string | null;
  experience: string | null;
  motivation: string;
  availability: string | null;
  shelter_notes: string | null;
  created_at: TimestampDefault;
  updated_at: TimestampDefault;
}

export interface ContractsTable {
  id: Generated<string>;
  type: string;
  status: Generated<string>;
  shelter_id: string;
  user_id: string;
  pet_id: string | null;
  application_id: string | null;
  foster_family_id: string | null;
  reference: string;
  effective_date: DateOnly | null;
  end_date: DateOnly | null;
  adoption_fee: number | null;
  terms: Json;
  notes: string | null;
  signed_at: Timestamp | null;
  created_at: TimestampDefault;
  updated_at: TimestampDefault;
}

export interface AdoptionFollowupsTable {
  id: Generated<string>;
  contract_id: string;
  shelter_id: string;
  pet_id: string | null;
  user_id: string;
  label: string;
  due_date: DateOnly;
  status: Generated<string>;
  notes: string | null;
  completed_at: Timestamp | null;
  created_at: TimestampDefault;
  updated_at: TimestampDefault;
}

export interface FosterFamiliesTable {
  id: Generated<string>;
  shelter_id: string;
  user_id: string;
  source: Generated<string>;
  city: string | null;
  capacity: Generated<number>;
  accepts_cats: Generated<boolean>;
  accepts_dogs: Generated<boolean>;
  notes: string | null;
  status: Generated<string>;
  created_at: TimestampDefault;
  updated_at: TimestampDefault;
}

export interface FosterPlacementsTable {
  id: Generated<string>;
  foster_family_id: string;
  pet_id: string;
  started_at: DateOnlyDefault;
  ended_at: DateOnly | null;
  notes: string | null;
  created_at: TimestampDefault;
}

export interface HealthEventsTable {
  id: Generated<string>;
  pet_id: string;
  type: string;
  event_date: DateOnlyDefault;
  label: string | null;
  vet_label: string | null;
  result: string | null;
  next_due_date: DateOnly | null;
  cost: number | null;
  weight_kg: number | null;
  notes: string | null;
  document_url: string | null;
  created_at: TimestampDefault;
  updated_at: TimestampDefault;
}

// --- Perdus / trouvés ----------------------------------------------------------

export interface ReportsTable {
  id: Generated<string>;
  user_id: string;
  type: string;
  status: Generated<string>;
  species: string;
  pet_name: string | null;
  description: string;
  breed: string | null;
  color: string | null;
  sex: Generated<string>;
  is_chipped: Generated<boolean>;
  chip_number: string | null;
  distinctive_signs: string | null;
  location: Geometry;
  address: string | null;
  date_event: DateOnly;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  resolved_at: Timestamp | null;
  resolved_by_user_id: string | null;
  created_at: TimestampDefault;
  updated_at: TimestampDefault;
}

export interface ReportPhotosTable {
  id: Generated<string>;
  report_id: string;
  url: string;
  blur_data_url: string | null;
  is_primary: Generated<boolean>;
  order: Generated<number>;
  created_at: TimestampDefault;
}

export interface ReportMatchesTable {
  id: Generated<string>;
  lost_report_id: string;
  found_report_id: string;
  score: number;
  distance_meters: number | null;
  status: Generated<string>;
  created_at: TimestampDefault;
}

// --- Pensions ------------------------------------------------------------------

export interface PensionsTable {
  id: Generated<string>;
  name: string;
  slug: string;
  description: string | null;
  siret: string;
  agrement_number: string | null;
  address: string | null;
  location: Geometry | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  cover_url: string | null;
  accepts_cats: Generated<boolean>;
  accepts_dogs: Generated<boolean>;
  capacity_cats: number | null;
  capacity_dogs: number | null;
  price_per_day_cat: number | null;
  price_per_day_dog: number | null;
  services: Json | null;
  opening_hours: string | null;
  is_verified: Generated<boolean>;
  is_demo: Generated<boolean>;
  created_at: TimestampDefault;
  updated_at: TimestampDefault;
}

export interface PensionPhotosTable {
  id: Generated<string>;
  pension_id: string;
  url: string;
  blur_data_url: string | null;
  is_primary: Generated<boolean>;
  order: Generated<number>;
  created_at: TimestampDefault;
}

export interface PensionReviewsTable {
  id: Generated<string>;
  pension_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_verified: Generated<boolean>;
  is_published: Generated<boolean>;
  created_at: TimestampDefault;
  updated_at: TimestampDefault;
}

export interface PensionBookingsTable {
  id: Generated<string>;
  pension_id: string;
  user_id: string;
  pet_name: string | null;
  species: string;
  start_date: DateOnly;
  end_date: DateOnly;
  nights: number;
  total_price: number | null;
  notes: string | null;
  status: Generated<string>;
  created_at: TimestampDefault;
  updated_at: TimestampDefault;
}

// --- Bénévolat, événements, stock, communication -------------------------------

export interface VolunteersTable {
  id: Generated<string>;
  shelter_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  skills: string | null;
  availability: string | null;
  status: Generated<string>;
  notes: string | null;
  created_at: TimestampDefault;
  updated_at: TimestampDefault;
}

export interface VolunteerShiftsTable {
  id: Generated<string>;
  shelter_id: string;
  title: string;
  kind: Generated<string>;
  starts_at: Timestamp;
  ends_at: Timestamp | null;
  location: string | null;
  capacity: number | null;
  notes: string | null;
  created_at: TimestampDefault;
  updated_at: TimestampDefault;
}

export interface ShiftSignupsTable {
  id: Generated<string>;
  shift_id: string;
  volunteer_id: string;
  status: Generated<string>;
  hours: number | null;
  created_at: TimestampDefault;
}

export interface EventsTable {
  id: Generated<string>;
  shelter_id: string;
  title: string;
  type: Generated<string>;
  starts_at: Timestamp;
  ends_at: Timestamp | null;
  location: string | null;
  is_public: Generated<boolean>;
  capacity: number | null;
  needs: string | null;
  notes: string | null;
  result_amount: number | null;
  result_notes: string | null;
  created_at: TimestampDefault;
  updated_at: TimestampDefault;
}

export interface EventSignupsTable {
  id: Generated<string>;
  event_id: string;
  volunteer_id: string;
  status: Generated<string>;
  created_at: TimestampDefault;
}

export interface InventoryItemsTable {
  id: Generated<string>;
  shelter_id: string;
  name: string;
  category: Generated<string>;
  quantity: Generated<number>;
  unit: string | null;
  threshold: number | null;
  notes: string | null;
  created_at: TimestampDefault;
  updated_at: TimestampDefault;
}

export interface EmailCampaignsTable {
  id: Generated<string>;
  shelter_id: string;
  subject: string;
  body: string;
  audience: string;
  recipient_count: Generated<number>;
  sent_at: Timestamp | null;
  created_at: TimestampDefault;
}

export interface ResponseTemplatesTable {
  id: Generated<string>;
  shelter_id: string;
  category: Generated<string>;
  name: string;
  subject: string | null;
  body: string;
  created_at: TimestampDefault;
  updated_at: TimestampDefault;
}

// --- Messagerie, notifications, gamification, modération ------------------------

export interface ConversationsTable {
  id: Generated<string>;
  user_id: string;
  shelter_id: string;
  pet_id: string | null;
  subject: string | null;
  last_message_at: TimestampDefault;
  last_message_preview: string | null;
  last_sender_type: string | null;
  user_unread_count: Generated<number>;
  shelter_unread_count: Generated<number>;
  archived_by_user: Generated<boolean>;
  archived_by_shelter: Generated<boolean>;
  created_at: TimestampDefault;
  updated_at: TimestampDefault;
}

export interface MessagesTable {
  id: Generated<string>;
  conversation_id: string;
  sender_type: string;
  sender_id: string | null;
  content: string | null;
  attachment_type: string | null;
  attachment_url: string | null;
  attachment_meta: Json | null;
  read_at: Timestamp | null;
  edited_at: Timestamp | null;
  created_at: TimestampDefault;
}

export interface NotificationsTable {
  id: Generated<string>;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Json | null;
  is_read: Generated<boolean>;
  created_at: TimestampDefault;
}

export interface DeviceTokensTable {
  id: Generated<string>;
  user_id: string;
  expo_push_token: string;
  platform: string;
  device_name: string | null;
  last_seen_at: TimestampDefault;
  created_at: TimestampDefault;
}

export interface ResolutionCreditsTable {
  id: Generated<string>;
  report_id: string;
  user_id: string;
  role: string;
  created_at: TimestampDefault;
}

export interface ContentReportsTable {
  id: Generated<string>;
  reporter_id: string | null;
  content_type: string;
  content_id: string;
  reason: string;
  comment: string | null;
  status: Generated<string>;
  resolved_by_id: string | null;
  resolved_at: Timestamp | null;
  created_at: TimestampDefault;
}

/** Base de données complète (schéma `dorloter_api`). */
export interface Database {
  accounts: AccountsTable;
  adoption_followups: AdoptionFollowupsTable;
  applications: ApplicationsTable;
  auth_refresh_tokens: AuthRefreshTokensTable;
  content_reports: ContentReportsTable;
  contracts: ContractsTable;
  conversations: ConversationsTable;
  device_tokens: DeviceTokensTable;
  email_campaigns: EmailCampaignsTable;
  event_signups: EventSignupsTable;
  events: EventsTable;
  favorites: FavoritesTable;
  foster_families: FosterFamiliesTable;
  foster_placements: FosterPlacementsTable;
  health_events: HealthEventsTable;
  inventory_items: InventoryItemsTable;
  messages: MessagesTable;
  notifications: NotificationsTable;
  pension_bookings: PensionBookingsTable;
  pension_photos: PensionPhotosTable;
  pension_reviews: PensionReviewsTable;
  pensions: PensionsTable;
  pet_photos: PetPhotosTable;
  pets: PetsTable;
  report_matches: ReportMatchesTable;
  report_photos: ReportPhotosTable;
  reports: ReportsTable;
  resolution_credits: ResolutionCreditsTable;
  response_templates: ResponseTemplatesTable;
  shelter_follows: ShelterFollowsTable;
  shelter_members: ShelterMembersTable;
  shelters: SheltersTable;
  shift_signups: ShiftSignupsTable;
  users: UsersTable;
  volunteer_shifts: VolunteerShiftsTable;
  volunteers: VolunteersTable;
}
