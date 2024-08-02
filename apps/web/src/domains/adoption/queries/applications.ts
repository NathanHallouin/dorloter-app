import { db } from "@infra/db";
import {
  applications,
  pets,
  petPhotos,
  users,
} from "@/server/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

export async function getApplicationsByUser(userId: string) {
  return db
    .select({
      application: applications,
      pet: pets,
    })
    .from(applications)
    .innerJoin(pets, eq(pets.id, applications.petId))
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.createdAt));
}

export async function getApplicationsForShelter(shelterId: string) {
  return db
    .select({
      application: applications,
      pet: pets,
      applicant: {
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
      },
    })
    .from(applications)
    .innerJoin(pets, eq(pets.id, applications.petId))
    .innerJoin(users, eq(users.id, applications.userId))
    .where(eq(pets.shelterId, shelterId))
    .orderBy(desc(applications.createdAt));
}

export async function getApplicationById(id: string) {
  const [row] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);
  return row ?? null;
}

export async function getPrimaryPhotosForPets(petIds: string[]) {
  if (petIds.length === 0) return new Map<string, string>();

  const rows = await db
    .select({ petId: petPhotos.petId, url: petPhotos.url })
    .from(petPhotos)
    .where(and(inArray(petPhotos.petId, petIds), eq(petPhotos.isPrimary, true)));

  return new Map(rows.map((r) => [r.petId, r.url]));
}
