import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  out: "./src/server/db/migrations",
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  // Les migrations créent/modifient des tables — elles doivent tourner avec
  // une connexion propriétaire (DATABASE_URL_MIGRATIONS, superuser `miaou`).
  // À défaut, on retombe sur DATABASE_URL_ADMIN puis DATABASE_URL.
  dbCredentials: {
    url:
      process.env.DATABASE_URL_MIGRATIONS ??
      process.env.DATABASE_URL_ADMIN ??
      process.env.DATABASE_URL!,
  },
  schemaFilter: ["public"],
  extensionsFilters: ["postgis"],
  // Exclure explicitement les tables/vues gérées par PostGIS — le filtre
  // `extensionsFilters` seul ne les ignore pas dans drizzle-kit v1 beta.
  tablesFilter: [
    "!spatial_ref_sys",
    "!geography_columns",
    "!geometry_columns",
    "!raster_columns",
    "!raster_overviews",
  ],
});
