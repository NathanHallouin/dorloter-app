/**
 * Types du contrat d'API Java (/api/v1). Reflètent les DTOs Spring Boot.
 *
 * Enveloppes :
 *   - succès        : { data: T }
 *   - liste paginée : { data: T[], pagination: { cursor, hasMore } }
 *   - erreur        : { error: { code, message, details? } }
 *
 * (Ces types peuvent aussi être régénérés depuis l'OpenAPI Java via
 *  `bun api:types:java` à la racine du monorepo.)
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
  createdAt: string | null;
  emailVerified: boolean;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  city?: string;
  bio?: string;
  isPublic?: boolean;
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
  userId: string;
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

// ─── Vétérinaires ───────────────────────────────────────────────────────────

export interface VetSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  acceptsCats: boolean;
  acceptsDogs: boolean;
  acceptsNac: boolean;
  emergencyAvailable: boolean;
  consultationPrice: number | null;
}

export interface VetDetail extends VetSummary {
  siret: string;
  orderNumber: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  location: { latitude: number; longitude: number } | null;
  services: Record<string, boolean> | null;
  openingHours: string | null;
  photos: PetPhoto[];
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
