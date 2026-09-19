import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const globalForDatabase = globalThis as typeof globalThis & {
  pulseHubSql?: ReturnType<typeof postgres>;
  pulseHubDatabase?: ReturnType<typeof drizzle<typeof schema>>;
};

export function getDb() {
  if (globalForDatabase.pulseHubDatabase) {
    return globalForDatabase.pulseHubDatabase;
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const sqlClient =
    globalForDatabase.pulseHubSql ??
    postgres(connectionString, {
      max: process.env.NODE_ENV === "production" ? 10 : 3,
    });
  const database = drizzle(sqlClient, { schema });
  globalForDatabase.pulseHubSql = sqlClient;
  globalForDatabase.pulseHubDatabase = database;
  return database;
}

export type Database = ReturnType<typeof getDb>;
