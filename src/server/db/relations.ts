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
    sessions: r.many.sessions(),
    accounts: r.many.accounts(),
  },

  shelters: {
    cats: r.many.cats(),
    admins: r.many.users(),
  },

  cats: {
    shelter: r.one.shelters({
      from: r.cats.shelterId,
      to: r.shelters.id,
    }),
    photos: r.many.catPhotos(),
    applications: r.many.applications(),
    favorites: r.many.favorites(),
  },

  catPhotos: {
    cat: r.one.cats({
      from: r.catPhotos.catId,
      to: r.cats.id,
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
    cat: r.one.cats({
      from: r.applications.catId,
      to: r.cats.id,
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
    cat: r.one.cats({
      from: r.favorites.catId,
      to: r.cats.id,
    }),
  },

  notifications: {
    user: r.one.users({
      from: r.notifications.userId,
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
