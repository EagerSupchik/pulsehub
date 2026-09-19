import { getRuntimeConfigurationErrors } from "@/backend/config/runtime";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const configurationReady = getRuntimeConfigurationErrors().length === 0;
  let databaseReady = false;
  if (configurationReady) {
    try {
      await getDb().execute(sql`select 1`);
      databaseReady = true;
    } catch {
      databaseReady = false;
    }
  }
  const ready = configurationReady && databaseReady;
  return Response.json(
    {
      service: "pulsehub",
      status: ready ? "ready" : "not-ready",
      checks: {
        database: databaseReady ? "ready" : "not-ready",
        authentication:
          process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_URL
            ? "configured"
            : "not-configured",
      },
    },
    { status: ready ? 200 : 503 },
  );
}
