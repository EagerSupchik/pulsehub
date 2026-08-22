import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) throw new Error("DATABASE_URL is required");

const globalForDatabase = globalThis as typeof globalThis & {
  pulseHubSql?: ReturnType<typeof postgres>;
};

const sql =
  globalForDatabase.pulseHubSql ??
  postgres(connectionString, {
    max: process.env.NODE_ENV === "production" ? 10 : 3,
  });

if (process.env.NODE_ENV !== "production") globalForDatabase.pulseHubSql = sql;

const database = drizzle(sql, { schema });

export function getDb() {
  return database;
}

export type Database = ReturnType<typeof getDb>;
