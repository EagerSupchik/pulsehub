export function jsonError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

export function handleRouteError(error: unknown) {
  if (error instanceof Response) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  ) {
    return jsonError(
      409,
      "RESOURCE_ALREADY_EXISTS",
      "Такая запись уже существует",
    );
  }

  console.error(error);
  return jsonError(500, "INTERNAL_SERVER_ERROR", "Не удалось выполнить запрос");
}
