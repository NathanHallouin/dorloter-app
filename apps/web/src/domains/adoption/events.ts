import type { DomainEvent } from "@infra/event-bus";

/**
 * Events publiés par le domaine adoption.
 * Convention : `<domaine>.<fait>` au passé.
 */

export interface PetPublishedEvent extends DomainEvent {
  type: "adoption.pet_published";
  petId: string;
  petName: string;
  species: "chat" | "chien";
  shelterId: string;
  shelterName: string;
  /** IDs des followers du refuge à notifier — résolus par adoption au moment
   * du publish, pour que les listeners n'aient pas à requêter shelter_follows. */
  followerIds: string[];
}

export interface ApplicationStatusChangedEvent extends DomainEvent {
  type: "adoption.application_status_changed";
  applicationId: string;
  petId: string;
  petName: string;
  applicantUserId: string;
  status: "en_cours" | "acceptee" | "refusee";
  shelterNotes: string | null;
}
