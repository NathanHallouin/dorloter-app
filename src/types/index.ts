import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type {
  users,
  shelters,
  pets,
  petPhotos,
  pensions,
  pensionPhotos,
  reports,
  reportPhotos,
  reportMatches,
  applications,
  favorites,
  notifications,
} from "@/server/db/schema";

// ─── Select types (lecture) ─────────────────────────────────────────────────

export type User = InferSelectModel<typeof users>;
export type Shelter = InferSelectModel<typeof shelters>;
export type Pet = InferSelectModel<typeof pets>;
export type PetPhoto = InferSelectModel<typeof petPhotos>;
export type Pension = InferSelectModel<typeof pensions>;
export type PensionPhoto = InferSelectModel<typeof pensionPhotos>;
export type Report = InferSelectModel<typeof reports>;
export type ReportPhoto = InferSelectModel<typeof reportPhotos>;
export type ReportMatch = InferSelectModel<typeof reportMatches>;
export type Application = InferSelectModel<typeof applications>;
export type Favorite = InferSelectModel<typeof favorites>;
export type Notification = InferSelectModel<typeof notifications>;

// ─── Insert types (création) ────────────────────────────────────────────────

export type NewUser = InferInsertModel<typeof users>;
export type NewShelter = InferInsertModel<typeof shelters>;
export type NewPet = InferInsertModel<typeof pets>;
export type NewPetPhoto = InferInsertModel<typeof petPhotos>;
export type NewReport = InferInsertModel<typeof reports>;
export type NewReportPhoto = InferInsertModel<typeof reportPhotos>;
export type NewReportMatch = InferInsertModel<typeof reportMatches>;
export type NewApplication = InferInsertModel<typeof applications>;
export type NewNotification = InferInsertModel<typeof notifications>;

// ─── Types composés ─────────────────────────────────────────────────────────

export type PetWithPhotos = Pet & {
  photos: PetPhoto[];
};

export type ReportWithPhotos = Report & {
  photos: ReportPhoto[];
};

export type ReportMatchWithReports = ReportMatch & {
  lostReport: ReportWithPhotos;
  foundReport: ReportWithPhotos;
};

export type PetWithShelter = Pet & {
  shelter: Shelter;
  photos: PetPhoto[];
};

// ─── Action response ────────────────────────────────────────────────────────

export type ActionResponse<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};
