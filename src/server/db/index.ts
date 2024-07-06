import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { relations } from "./relations";

export const db = drizzle({
  connection: process.env.DATABASE_URL!,
  schema,
  relations,
});
