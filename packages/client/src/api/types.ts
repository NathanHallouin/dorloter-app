/**
 * Types du contrat d'API (/api/v1), maintenus à la main pour les fronts web et pro.
 *
 * Enveloppes :
 *   - succès        : { data: T }
 *   - liste paginée : { data: T[], pagination: { cursor, hasMore } }
 *   - erreur        : { error: { code, message, details? } }
 *
 * NB : ces types sont parallèles au client typé généré `@dorloter/api-client`
 * (types.gen.ts, généré depuis l'OpenAPI) que consomme le mobile. À terme,
 * unifier le web dessus pour supprimer cette duplication maintenue à la main.
 */

export interface ApiResponse<T> {
  data: T;
}

export interface PaginationMeta {
  cursor: string | null;
  hasMore: boolean;
}

export interface PageResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ─── Auth / identity ────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: string;
  phone: string | null;
  bio: string | null;
  city: string | null;
  isPublic: boolean;
  latitude: number | null;
  longitude: number | null;
  notificationRadiusKm: number;
  digestOptin: boolean;
  createdAt: string | null;
  emailVerified: boolean;
}

/** Usage d'un fichier déposé : détermine le préfixe de rangement côté stockage. */
export type UploadKind = "report" | "pet" | "shelter" | "pension" | "voice";

export interface PresignResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresInSec: number;
  maxBytes: number;
}

/** Photo d'une galerie d'animal (console refuge). */
export interface PetPhoto {
  id: string;
  url: string;
  isPrimary: boolean;
  order: number;
}

/**
 * Résultat d'une suppression de compte. `anonymise` signale qu'un contrat
 * d'adoption signé devait être conservé : la fiche a été vidée de toute donnée
 * identifiante plutôt que supprimée.
 */
export interface AccountDeletionResult {
  outcome: "supprime" | "anonymise";
  message: string;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  city?: string;
  bio?: string;
  isPublic?: boolean;
  latitude?: number;
  longitude?: number;
  notificationRadiusKm?: number;
  digestOptin?: boolean;
}

/** Digest « Nouveautés dans votre rayon » (feature 5.2). */
export interface DigestItem {
  id: string;
  name: string;
  species: Species;
  breed: string | null;
  ageCategory: AgeCategory | null;
  sex: Sex;
  photoUrl: string | null;
  shelterName: string;
  shelterSlug: string;
  distanceMeters: number | null;
  createdAt: string;
}

export interface MyDigest {
  hasLocation: boolean;
  radiusKm: number;
  items: DigestItem[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

// ─── Adoption ───────────────────────────────────────────────────────────────

export type Species = "chat" | "chien";
export type Sex = "male" | "femelle" | "inconnu";
export type AgeCategory = "chaton" | "jeune" | "adulte" | "senior";
export type PetStatus =
  | "pre_adoptable"
  | "disponible"
  | "reserve"
  | "adopte"
  | "retire";

export interface PetSummary {
  id: string;
  species: Species;
  name: string;
  breed: string | null;
  color: string | null;
  sex: Sex;
  ageCategory: AgeCategory | null;
  status: PetStatus;
  adoptionFee: number | null;
  okWithCats: string;
  okWithDogs: string;
  okWithChildren: string;
  primaryPhoto: { url: string; blurDataUrl: string | null } | null;
  shelter: { id: string; slug: string; name: string } | null;
}

export interface PetPhoto {
  id: string;
  url: string;
  blurDataUrl: string | null;
  isPrimary: boolean;
  order: number;
}

export interface Pet extends Omit<PetSummary, "primaryPhoto" | "shelter"> {
  description: string | null;
  estimatedBirth: string | null;
  isSterilized: boolean;
  isChipped: boolean;
  isVaccinated: boolean;
  fivFelv: string | null;
  indoorOnly: boolean | null;
  okWithCats: string;
  okWithDogs: string;
  okWithChildren: string;
  specialNeeds: string | null;
  photos: PetPhoto[];
  shelter: {
    id: string;
    slug: string;
    name: string;
    address: string | null;
    isVerified: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  petId: string;
  status: string;
  motivation: string;
  createdAt: string;
}

// ─── Back-office refuge ─────────────────────────────────────────────────────

export interface ShelterPet {
  id: string;
  name: string;
  species: Species;
  sex: Sex;
  breed: string | null;
  color: string | null;
  description: string | null;
  ageCategory: AgeCategory | null;
  status: PetStatus;
  adoptionFee: number | null;
  isSterilized: boolean;
  isChipped: boolean;
  isVaccinated: boolean;
  okWithCats: string;
  okWithDogs: string;
  okWithChildren: string;
  specialNeeds: string | null;
  fivFelv: string | null;
  indoorOnly: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShelterTeamMember {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  role: "owner" | "gestionnaire" | "benevole";
  status: string;
  createdAt: string;
}

export interface FosterPlacement {
  id: string;
  petId: string;
  petName: string;
  startedAt: string;
}

export type FosterStatus = "invited" | "requested" | "active" | "declined" | "ended";

/** Famille d'accueil vue par le refuge (le membre est un vrai compte utilisateur). */
export interface FosterFamily {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  capacity: number;
  acceptsCats: boolean;
  acceptsDogs: boolean;
  notes: string | null;
  status: FosterStatus;
  source: "shelter" | "user";
  placements: FosterPlacement[];
}

/** Relation famille d'accueil vue par l'utilisateur. */
export interface MyFostership {
  id: string;
  shelterId: string;
  shelterName: string | null;
  shelterSlug: string | null;
  city: string | null;
  capacity: number;
  acceptsCats: boolean;
  acceptsDogs: boolean;
  notes: string | null;
  status: FosterStatus;
  source: "shelter" | "user";
  placements: FosterPlacement[];
}

export interface FosterPrefsInput {
  city?: string;
  capacity?: number;
  acceptsCats?: boolean;
  acceptsDogs?: boolean;
  notes?: string;
}

export interface ShelterConversation {
  id: string;
  userId: string;
  petId: string | null;
  subject: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  lastSenderType: string | null;
  unreadCount: number;
  createdAt: string;
}

export interface ShelterApplication {
  id: string;
  petId: string;
  petName: string | null;
  petSpecies: string | null;
  userId: string;
  applicantName: string | null;
  applicantEmail: string | null;
  applicantPhone: string | null;
  status: string;
  housingType: string | null;
  hasOutdoorAccess: boolean | null;
  hasOtherPets: string | null;
  hasChildren: boolean | null;
  childrenAges: string | null;
  experience: string | null;
  motivation: string;
  availability: string | null;
  shelterNotes: string | null;
  createdAt: string;
}

// ─── Pensions ───────────────────────────────────────────────────────────────

export interface PensionSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  acceptsCats: boolean;
  acceptsDogs: boolean;
  pricePerDayCat: number | null;
  pricePerDayDog: number | null;
  rating: { average: number; count: number } | null;
}

export interface PensionDetail extends PensionSummary {
  siret: string;
  agrementNumber: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  location: { latitude: number; longitude: number } | null;
  capacityCats: number | null;
  capacityDogs: number | null;
  services: Record<string, boolean> | null;
  openingHours: string | null;
  photos: { id: string; url: string; isPrimary: boolean }[];
}

export interface Booking {
  id: string;
  pensionId: string;
  pensionName: string | null;
  pensionSlug: string | null;
  petName: string | null;
  species: Species;
  startDate: string;
  endDate: string;
  nights: number;
  totalPrice: number | null;
  status: string;
  createdAt: string;
}

export interface CreateBookingInput {
  species: string;
  petName?: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

// ─── Perdus / trouvés ───────────────────────────────────────────────────────

export interface ReportSummary {
  id: string;
  type: "perdu" | "trouve";
  status: string;
  species: Species;
  petName: string | null;
  breed: string | null;
  color: string | null;
  sex: Sex;
  location: { lat: number; lng: number };
  address: string | null;
  dateEvent: string;
  primaryPhoto: { url: string; blurDataUrl: string | null } | null;
  createdAt: string;
}

export interface ReportDetail extends ReportSummary {
  description: string;
  isChipped: boolean;
  chipNumber: string | null;
  distinctiveSigns: string | null;
  photos: PetPhoto[];
  resolvedAt: string | null;
  updatedAt: string;
}

export interface ReportMatch {
  id: string;
  score: number;
  distanceMeters: number | null;
  status: string;
  report: ReportSummary;
}

export interface Contact {
  phone: string | null;
  email: string | null;
}

// ─── Messagerie ─────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  shelterId: string;
  petId: string | null;
  subject: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  lastSenderType: string | null;
  unreadCount: number;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: "user" | "shelter";
  content: string | null;
  attachmentType: string | null;
  attachmentUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

// ─── Refuges ────────────────────────────────────────────────────────────────

export interface ShelterListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  location: { latitude: number; longitude: number } | null;
}

export interface ShelterDetail extends ShelterListItem {
  missionLong: string | null;
  foundedYear: number | null;
  siret: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  donationUrl: string | null;
  donationLabel: string | null;
  donationDescription: string | null;
  visitHours: string | null;
  isVerified: boolean;
  acceptsFosterApplications: boolean;
}

/** Événement public à venir d'un refuge (annonce sur la fiche publique). */
export interface ShelterPublicEvent {
  id: string;
  title: string;
  type: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  needs: string | null;
}

/** Besoin du refuge (article de stock en alerte). */
export interface ShelterNeed {
  name: string;
  category: string;
  urgent: boolean;
}

// ─── Modération ─────────────────────────────────────────────────────────────

export interface ContentReport {
  id: string;
  contentType: string;
  contentId: string;
  reason: string;
  comment: string | null;
  status: string;
  createdAt: string;
}

// ─── Notifications ──────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

// ─── Contrats (adoption / convention famille d'accueil) ──────────────────────

export type ContractType = "adoption" | "foster";
export type ContractStatus =
  | "brouillon"
  | "envoye"
  | "signe"
  | "active"
  | "terminee"
  | "resilie"
  | "annule";

export interface Contract {
  id: string;
  type: ContractType;
  status: ContractStatus;
  reference: string;
  petId: string | null;
  petName: string | null;
  userId: string;
  adopterName: string | null;
  adopterEmail: string | null;
  applicationId: string | null;
  fosterFamilyId: string | null;
  shelterName: string | null;
  effectiveDate: string | null;
  endDate: string | null;
  adoptionFee: number | null;
  terms: Record<string, unknown>;
  notes: string | null;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdoptionContractInput {
  applicationId?: string;
  petId?: string;
  userId?: string;
  adoptionFee?: number;
  effectiveDate?: string;
  terms?: Record<string, unknown>;
  notes?: string;
}

export interface CreateFosterContractInput {
  fosterFamilyId: string;
  petId?: string;
  effectiveDate?: string;
  endDate?: string;
  terms?: Record<string, unknown>;
  notes?: string;
}

export interface UpdateContractInput {
  adoptionFee?: number;
  effectiveDate?: string;
  endDate?: string;
  terms?: Record<string, unknown>;
  notes?: string;
}

// ─── Suivi médical & sanitaire ───────────────────────────────────────────────

export type HealthEventType =
  | "vaccin"
  | "vermifuge"
  | "antiparasitaire"
  | "sterilisation"
  | "test_fiv_felv"
  | "visite"
  | "traitement"
  | "pesee"
  | "autre";

export interface HealthEvent {
  id: string;
  petId: string;
  type: HealthEventType;
  eventDate: string;
  label: string | null;
  vetLabel: string | null;
  result: string | null;
  nextDueDate: string | null;
  cost: number | null;
  weightKg: number | null;
  notes: string | null;
  documentUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpcomingHealth {
  petId: string;
  petName: string;
  event: HealthEvent;
}

export interface CreateHealthEventInput {
  type: HealthEventType;
  eventDate?: string;
  label?: string;
  vetLabel?: string;
  result?: string;
  nextDueDate?: string;
  cost?: number;
  weightKg?: number;
  notes?: string;
  documentUrl?: string;
}

export type UpdateHealthEventInput = Partial<Omit<CreateHealthEventInput, "type">>;

// ─── Bénévoles & planning ────────────────────────────────────────────────────

export type VolunteerStatus = "candidate" | "active" | "inactive";
export type ShiftKind = "permanence" | "promenade" | "nettoyage" | "accueil" | "transport" | "autre";
export type SignupStatus = "inscrit" | "present" | "absent";

export interface Volunteer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  skills: string | null;
  availability: string | null;
  status: VolunteerStatus;
  notes: string | null;
  createdAt: string;
}

export interface VolunteerShift {
  id: string;
  title: string;
  kind: ShiftKind;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  capacity: number | null;
  notes: string | null;
}

export interface ShiftSignup {
  id: string;
  shiftId: string;
  volunteerId: string;
  volunteerName: string;
  status: SignupStatus;
  hours: number | null;
}

export interface CreateVolunteerInput {
  name: string;
  email?: string;
  phone?: string;
  skills?: string;
  availability?: string;
  status?: VolunteerStatus;
  notes?: string;
}
export type UpdateVolunteerInput = Partial<CreateVolunteerInput>;

export interface CreateShiftInput {
  title: string;
  kind?: ShiftKind;
  startsAt: string;
  endsAt?: string;
  location?: string;
  capacity?: number;
  notes?: string;
}
export type UpdateShiftInput = Partial<CreateShiftInput>;

export interface UpdateSignupInput {
  status?: SignupStatus;
  hours?: number;
}

// ─── Événements & opérations terrain ─────────────────────────────────────────

export type EventType =
  | "collecte"
  | "journee_adoption"
  | "porte_ouverte"
  | "marche"
  | "sensibilisation"
  | "autre";

export interface ShelterEvent {
  id: string;
  title: string;
  type: EventType;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  isPublic: boolean;
  capacity: number | null;
  needs: string | null;
  notes: string | null;
  resultAmount: number | null;
  resultNotes: string | null;
  createdAt: string;
}

export interface EventSignup {
  id: string;
  eventId: string;
  volunteerId: string;
  volunteerName: string;
  status: SignupStatus;
}

/** Événement public agrégé (calendrier public /evenements). */
export interface CalendarEvent {
  id: string;
  title: string;
  type: EventType;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  needs: string | null;
  capacity: number | null;
  shelter: {
    id: string;
    slug: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
  };
  /** Distance au point de recherche, en mètres (si lat/lng fournis). */
  distanceMeters: number | null;
}

export interface CreateEventInput {
  title: string;
  type?: EventType;
  startsAt: string;
  endsAt?: string;
  location?: string;
  isPublic?: boolean;
  capacity?: number;
  needs?: string;
  notes?: string;
}

export interface UpdateEventInput {
  title?: string;
  type?: EventType;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  isPublic?: boolean;
  capacity?: number;
  needs?: string;
  notes?: string;
  resultAmount?: number;
  resultNotes?: string;
}

// ─── Registre entrée / sortie & statistiques ─────────────────────────────────

export type IntakeOrigin = "abandon" | "errance" | "transfert" | "saisie" | "naissance" | "autre";
export type OutcomeType = "adoption" | "transfert" | "deces" | "retour_proprietaire" | "euthanasie" | "autre";

export interface RegistreEntry {
  id: string;
  name: string;
  species: Species;
  icadNumber: string | null;
  intakeDate: string | null;
  intakeOrigin: IntakeOrigin | null;
  intakeNotes: string | null;
  outcomeDate: string | null;
  outcomeType: OutcomeType | null;
  outcomeNotes: string | null;
  status: string;
}

export interface RegistreStats {
  total: number;
  present: number;
  presentCats: number;
  presentDogs: number;
  enteredThisYear: number;
  adoptionsThisYear: number;
  avgStayDays: number | null;
}

export interface SetIntakeInput {
  date?: string;
  origin?: IntakeOrigin;
  notes?: string;
  icadNumber?: string;
}

export interface SetOutcomeInput {
  date?: string;
  type?: OutcomeType;
  notes?: string;
}

// ─── Stock & besoins ─────────────────────────────────────────────────────────

export type InventoryCategory = "alimentation" | "litiere" | "medical" | "materiel" | "autre";

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: string | null;
  threshold: number | null;
  notes: string | null;
}

export interface CreateInventoryItemInput {
  name: string;
  category?: InventoryCategory;
  quantity?: number;
  unit?: string;
  threshold?: number;
  notes?: string;
}
export type UpdateInventoryItemInput = Partial<CreateInventoryItemInput>;

// ── Modèles de réponses aux candidatures (back-office refuge) ──────────────────
export type TemplateCategory = "acceptation" | "refus" | "infos" | "rdv" | "generique";

export interface ResponseTemplate {
  id: string;
  category: TemplateCategory;
  name: string;
  subject: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  category?: TemplateCategory;
  name: string;
  subject?: string;
  body: string;
}
export type UpdateTemplateInput = Partial<CreateTemplateInput>;

// ── Statistiques refuge avancées ──────────────────────────────────────────────
export interface ShelterStats {
  totals: { pets: number; available: number; adopted: number; reserved: number };
  adoptions: { thisMonth: number; thisYear: number; total: number };
  applications: { total: number; pending: number };
  /** Taux de conversion candidatures -> adoptions signées, en % (0-100). */
  conversionRate: number;
  /** Durée moyenne publication -> adoption, en jours. */
  avgDaysToAdoption: number | null;
  hardToPlace: { id: string; name: string; species: string; daysListed: number; applications: number }[];
  adoptionsByMonth: { month: string; count: number }[];
}

// ── Suivi post-adoption ───────────────────────────────────────────────────────
export type FollowupStatus = "a_faire" | "fait" | "annule";

export interface AdoptionFollowup {
  id: string;
  contractId: string;
  contractReference: string;
  petId: string | null;
  petName: string | null;
  species: Species | null;
  userId: string;
  adopterName: string | null;
  adopterEmail: string | null;
  adopterPhone: string | null;
  label: string;
  dueDate: string;
  status: FollowupStatus;
  /** true si à faire et échéance dépassée. */
  overdue: boolean;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Communication : campagnes email (newsletter)
export type CampaignAudience = "benevoles" | "abonnes" | "tous";

export interface EmailCampaign {
  id: string;
  subject: string;
  body: string;
  audience: CampaignAudience;
  recipientCount: number;
  sentAt: string | null;
  createdAt: string;
}

export interface SendCampaignInput {
  subject: string;
  body: string;
  audience: CampaignAudience;
}

export type AudienceCounts = Record<CampaignAudience, number>;
