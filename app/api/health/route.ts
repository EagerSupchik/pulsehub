import { getRuntimeConfigurationErrors } from "@/backend/config/runtime";

export async function GET() {
  const ready = getRuntimeConfigurationErrors().length === 0;
  return Response.json(
    {
      service: "pulsehub",
      status: ready ? "ready" : "not-ready",
      checks: {
        database: process.env.DATABASE_URL ? "configured" : "not-configured",
        authentication:
          process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_URL
            ? "configured"
            : "not-configured",
      },
    },
    { status: ready ? 200 : 503 },
  );
}
