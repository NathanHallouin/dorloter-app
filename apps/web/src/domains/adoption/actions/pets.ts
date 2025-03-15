"use server";

import { revalidatePath } from "next/cache";
import { db } from "@infra/db";
import { pets, petPhotos, shelterFollows, shelters } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentSession } from "@infra/auth/session";
import { petFormSchema } from "@adoption/validation-pet";
import { publish } from "@infra/event-bus";
import type { PetPublishedEvent } from "../events";
import type { ActionResponse } from "@/types";

async function requireShelterAdmin() {
  const session = await getCurrentSession();
  if (!session) return null;
  if (session.user.role !== "shelter_admin" || !session.user.shelterId) return null;
  return session;
}

export async function createPet(formData: FormData): Promise<ActionResponse<{ id: string }>> {
  const session = await requireShelterAdmin();
  if (!session) return { success: false, error: "Non autorisé" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = petFormSchema.safeParse({
    ...raw,
    isSterilized: raw.isSterilized === "on",
    isChipped: raw.isChipped === "on",
    isVaccinated: raw.isVaccinated === "on",
    indoorOnly: raw.species === "chat" ? raw.indoorOnly === "on" : null,
    fivFelv: raw.species === "chat" ? (raw.fivFelv ?? "non_teste") : null,
  });

  if (!parsed.success) {
    return { success: false, error: "Données invalides." };
  }

  const data = parsed.data;

  const [pet] = await db
    .insert(pets)
    .values({
      shelterId: session.user.shelterId!,
      species: data.species,
      name: data.name,
      description: data.description,
      breed: data.breed,
      color: data.color,
      sex: data.sex,
      ageCategory: data.ageCategory,
      estimatedBirth: data.estimatedBirth || null,
      isSterilized: data.isSterilized,
      isChipped: data.isChipped,
      isVaccinated: data.isVaccinated,
      fivFelv: data.fivFelv ?? null,
      indoorOnly: data.indoorOnly ?? null,
      okWithCats: data.okWithCats,
      okWithDogs: data.okWithDogs,
      okWithChildren: data.okWithChildren,
      specialNeeds: data.specialNeeds,
      adoptionFee: data.adoptionFee,
    })
    .returning({ id: pets.id });

  // Photos : URLs transmises par le formulaire après upload côté client.
  // `photoBlur` apparié par index avec `photoUrl` (chaîne vide = pas de blur).
  const photoUrls = formData
    .getAll("photoUrl")
    .filter((v) => typeof v === "string") as string[];
  const photoBlurs = formData
    .getAll("photoBlur")
    .filter((v) => typeof v === "string") as string[];
  if (photoUrls.length > 0) {
    await db.insert(petPhotos).values(
      photoUrls.map((url, i) => ({
        petId: pet!.id,
        url,
        blurDataUrl: photoBlurs[i] ? photoBlurs[i] : null,
        isPrimary: i === 0,
        order: i,
      }))
    );
  }

  revalidatePath("/shelter-animaux");
  revalidatePath("/adopter");

  // Fanout aux followers du refuge (non bloquant)
  void notifyShelterFollowers(
    session.user.shelterId!,
    pet!.id,
    data.name,
    data.species
  ).catch((err) =>
    console.error("createPet: fanout followers échoué", err)
  );

  return { success: true, data: { id: pet!.id } };
}

async function notifyShelterFollowers(
  shelterId: string,
  petId: string,
  petName: string,
  species: "chat" | "chien"
) {
  const [shelter] = await db
    .select({ name: shelters.name })
    .from(shelters)
    .where(eq(shelters.id, shelterId))
    .limit(1);
  if (!shelter) return;

  const followers = await db
    .select({ userId: shelterFollows.userId })
    .from(shelterFollows)
    .where(eq(shelterFollows.shelterId, shelterId));

  if (followers.length === 0) return;

  publish<PetPublishedEvent>({
    type: "adoption.pet_published",
    petId,
    petName,
    species,
    shelterId,
    shelterName: shelter.name,
    followerIds: followers.map((f) => f.userId),
  });
}

export async function updatePet(
  petId: string,
  formData: FormData
): Promise<ActionResponse> {
  const session = await requireShelterAdmin();
  if (!session) return { success: false, error: "Non autorisé" };

  // Vérifier que le chat appartient au refuge
  const existing = await db
    .select({ shelterId: pets.shelterId })
    .from(pets)
    .where(eq(pets.id, petId))
    .limit(1);

  if (!existing[0] || existing[0].shelterId !== session.user.shelterId) {
    return { success: false, error: "Animal introuvable." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = petFormSchema.safeParse({
    ...raw,
    isSterilized: raw.isSterilized === "on",
    isChipped: raw.isChipped === "on",
    isVaccinated: raw.isVaccinated === "on",
    indoorOnly: raw.indoorOnly === "on",
  });

  if (!parsed.success) {
    return { success: false, error: "Données invalides." };
  }

  const data = parsed.data;

  await db
    .update(pets)
    .set({
      name: data.name,
      description: data.description,
      breed: data.breed,
      color: data.color,
      sex: data.sex,
      ageCategory: data.ageCategory,
      estimatedBirth: data.estimatedBirth || null,
      isSterilized: data.isSterilized,
      isChipped: data.isChipped,
      isVaccinated: data.isVaccinated,
      fivFelv: data.fivFelv,
      okWithCats: data.okWithCats,
      okWithDogs: data.okWithDogs,
      okWithChildren: data.okWithChildren,
      indoorOnly: data.indoorOnly,
      specialNeeds: data.specialNeeds,
      adoptionFee: data.adoptionFee,
      campaignUrl: data.campaignUrl || null,
      campaignTitle: data.campaignTitle || null,
      campaignDescription: data.campaignDescription || null,
      campaignGoalAmount: data.campaignGoalAmount || null,
      campaignCollectedAmount: data.campaignCollectedAmount || null,
      updatedAt: new Date(),
    })
    .where(eq(pets.id, petId));

  revalidatePath("/shelter-animaux");
  revalidatePath(`/adopter/${petId}`);
  revalidatePath("/adopter");

  return { success: true };
}

export async function updatePetStatus(
  petId: string,
  status: "pre_adoptable" | "disponible" | "reserve" | "adopte" | "retire"
): Promise<ActionResponse> {
  const session = await requireShelterAdmin();
  if (!session) return { success: false, error: "Non autorisé" };

  const existing = await db
    .select({ shelterId: pets.shelterId })
    .from(pets)
    .where(eq(pets.id, petId))
    .limit(1);

  if (!existing[0] || existing[0].shelterId !== session.user.shelterId) {
    return { success: false, error: "Animal introuvable." };
  }

  await db
    .update(pets)
    .set({ status, updatedAt: new Date() })
    .where(eq(pets.id, petId));

  revalidatePath("/shelter-animaux");
  revalidatePath("/adopter");

  return { success: true };
}

export async function addPetPhoto(
  petId: string,
  url: string,
  isPrimary = false
): Promise<ActionResponse> {
  const session = await requireShelterAdmin();
  if (!session) return { success: false, error: "Non autorisé" };

  const existing = await db
    .select({ shelterId: pets.shelterId })
    .from(pets)
    .where(eq(pets.id, petId))
    .limit(1);

  if (!existing[0] || existing[0].shelterId !== session.user.shelterId) {
    return { success: false, error: "Animal introuvable." };
  }

  // Si c'est la photo principale, retirer le flag des autres
  if (isPrimary) {
    await db
      .update(petPhotos)
      .set({ isPrimary: false })
      .where(eq(petPhotos.petId, petId));
  }

  await db.insert(petPhotos).values({
    petId,
    url,
    isPrimary,
    order: 0,
  });

  revalidatePath(`/shelter-animaux`);
  revalidatePath(`/adopter/${petId}`);

  return { success: true };
}

export async function deletePetPhoto(photoId: string): Promise<ActionResponse> {
  const session = await requireShelterAdmin();
  if (!session) return { success: false, error: "Non autorisé" };

  // Vérifier que la photo appartient bien à un chat du refuge
  const [photo] = await db
    .select({ petId: petPhotos.petId, shelterId: pets.shelterId })
    .from(petPhotos)
    .innerJoin(pets, eq(pets.id, petPhotos.petId))
    .where(eq(petPhotos.id, photoId))
    .limit(1);

  if (!photo || photo.shelterId !== session.user.shelterId) {
    return { success: false, error: "Photo introuvable." };
  }

  await db.delete(petPhotos).where(eq(petPhotos.id, photoId));

  revalidatePath("/shelter-animaux");
  revalidatePath(`/adopter/${photo.petId}`);

  return { success: true };
}

export async function reorderPetPhotos(
  petId: string,
  orderedIds: string[]
): Promise<ActionResponse> {
  const session = await requireShelterAdmin();
  if (!session) return { success: false, error: "Non autorisé" };

  // Vérifier que le chat appartient au refuge
  const [pet] = await db
    .select({ shelterId: pets.shelterId })
    .from(pets)
    .where(eq(pets.id, petId))
    .limit(1);

  if (!pet || pet.shelterId !== session.user.shelterId) {
    return { success: false, error: "Animal introuvable." };
  }

  // Vérifier que toutes les photos appartiennent bien à ce chat
  if (orderedIds.length > 0) {
    const existing = await db
      .select({ id: petPhotos.id })
      .from(petPhotos)
      .where(eq(petPhotos.petId, petId));
    const validIds = new Set(existing.map((p) => p.id));
    if (!orderedIds.every((id) => validIds.has(id))) {
      return { success: false, error: "Photos invalides." };
    }
  }

  // Mise à jour ordre + photo principale (index 0)
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i]!;
    await db
      .update(petPhotos)
      .set({ order: i, isPrimary: i === 0 })
      .where(eq(petPhotos.id, id));
  }

  revalidatePath("/shelter-animaux");
  revalidatePath(`/adopter/${petId}`);

  return { success: true };
}

export async function setPrimaryPetPhoto(
  photoId: string
): Promise<ActionResponse> {
  const session = await requireShelterAdmin();
  if (!session) return { success: false, error: "Non autorisé" };

  const [photo] = await db
    .select({ petId: petPhotos.petId, shelterId: pets.shelterId })
    .from(petPhotos)
    .innerJoin(pets, eq(pets.id, petPhotos.petId))
    .where(eq(petPhotos.id, photoId))
    .limit(1);

  if (!photo || photo.shelterId !== session.user.shelterId) {
    return { success: false, error: "Photo introuvable." };
  }

  await db
    .update(petPhotos)
    .set({ isPrimary: false })
    .where(eq(petPhotos.petId, photo.petId));
  await db
    .update(petPhotos)
    .set({ isPrimary: true })
    .where(eq(petPhotos.id, photoId));

  revalidatePath("/shelter-animaux");
  revalidatePath(`/adopter/${photo.petId}`);

  return { success: true };
}
