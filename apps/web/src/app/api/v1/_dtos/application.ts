/**
 * DTO application — vue utilisateur (mes candidatures).
 *
 * Pas exposé : `shelterNotes` (commentaires internes du refuge).
 */

export interface MyApplicationDto {
  id: string;
  status: "envoyee" | "en_cours" | "acceptee" | "refusee" | "annulee";
  motivation: string;
  createdAt: string;
  updatedAt: string;
  pet: {
    id: string;
    name: string;
    species: "chat" | "chien";
    breed: string | null;
    ageCategory: "chaton" | "jeune" | "adulte" | "senior" | null;
    sex: "male" | "femelle" | "inconnu";
    status: "pre_adoptable" | "disponible" | "reserve" | "adopte" | "retire";
    primaryPhotoUrl: string | null;
  };
}

interface ApplicationRow {
  application: {
    id: string;
    status: "envoyee" | "en_cours" | "acceptee" | "refusee" | "annulee";
    motivation: string;
    createdAt: Date;
    updatedAt: Date;
  };
  pet: {
    id: string;
    name: string;
    species: "chat" | "chien";
    breed: string | null;
    ageCategory: "chaton" | "jeune" | "adulte" | "senior" | null;
    sex: "male" | "femelle" | "inconnu";
    status: "pre_adoptable" | "disponible" | "reserve" | "adopte" | "retire";
  };
  primaryPhotoUrl: string | null;
}

export function toMyApplicationDto(row: ApplicationRow): MyApplicationDto {
  return {
    id: row.application.id,
    status: row.application.status,
    motivation: row.application.motivation,
    createdAt: row.application.createdAt.toISOString(),
    updatedAt: row.application.updatedAt.toISOString(),
    pet: {
      id: row.pet.id,
      name: row.pet.name,
      species: row.pet.species,
      breed: row.pet.breed,
      ageCategory: row.pet.ageCategory,
      sex: row.pet.sex,
      status: row.pet.status,
      primaryPhotoUrl: row.primaryPhotoUrl,
    },
  };
}
