import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  users: {
    shelter: r.one.shelters({
      from: r.users.shelterId,
      to: r.shelters.id,
    }),
    reports: r.many.reports(),
    applications: r.many.applications(),
    favorites: r.many.favorites(),
    notifications: r.many.notifications(),
    deviceTokens: r.many.deviceTokens(),
    sessions: r.many.sessions(),
    accounts: r.many.accounts(),
  },

  shelters: {
    pets: r.many.pets(),
    admins: r.many.users(),
  },

  pets: {
    shelter: r.one.shelters({
      from: r.pets.shelterId,
      to: r.shelters.id,
    }),
    photos: r.many.petPhotos(),
    applications: r.many.applications(),
    favorites: r.many.favorites(),
  },

  petPhotos: {
    pet: r.one.pets({
      from: r.petPhotos.petId,
      to: r.pets.id,
    }),
  },

  reports: {
    user: r.one.users({
      from: r.reports.userId,
      to: r.users.id,
    }),
    photos: r.many.reportPhotos(),
  },

  reportPhotos: {
    report: r.one.reports({
      from: r.reportPhotos.reportId,
      to: r.reports.id,
    }),
  },

  reportMatches: {
    lostReport: r.one.reports({
      from: r.reportMatches.lostReportId,
      to: r.reports.id,
    }),
    foundReport: r.one.reports({
      from: r.reportMatches.foundReportId,
      to: r.reports.id,
    }),
  },

  applications: {
    pet: r.one.pets({
      from: r.applications.petId,
      to: r.pets.id,
    }),
    user: r.one.users({
      from: r.applications.userId,
      to: r.users.id,
    }),
  },

  favorites: {
    user: r.one.users({
      from: r.favorites.userId,
      to: r.users.id,
    }),
    pet: r.one.pets({
      from: r.favorites.petId,
      to: r.pets.id,
    }),
  },

  notifications: {
    user: r.one.users({
      from: r.notifications.userId,
      to: r.users.id,
    }),
  },

  deviceTokens: {
    user: r.one.users({
      from: r.deviceTokens.userId,
      to: r.users.id,
    }),
  },

  sessions: {
    user: r.one.users({
      from: r.sessions.userId,
      to: r.users.id,
    }),
  },

  accounts: {
    user: r.one.users({
      from: r.accounts.userId,
      to: r.users.id,
    }),
  },
}));
