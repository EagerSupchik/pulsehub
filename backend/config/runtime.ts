export function getRuntimeConfigurationErrors() {
  const errors: string[] = [];
  if (!process.env.DATABASE_URL) errors.push("DATABASE_URL");
  if (
    !process.env.BETTER_AUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET.length < 32
  ) {
    errors.push("BETTER_AUTH_SECRET");
  }
  if (!process.env.BETTER_AUTH_URL) errors.push("BETTER_AUTH_URL");
  return errors;
}

export function requireRuntimeConfiguration() {
  if (getRuntimeConfigurationErrors().length === 0) return;
  throw Response.json(
    {
      error: {
        code: "SERVICE_NOT_CONFIGURED",
        message: "Сервис ещё не настроен администратором",
      },
    },
    { status: 503 },
  );
}
