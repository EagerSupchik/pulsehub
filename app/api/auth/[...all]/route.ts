import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/backend/auth/auth";
import { getRuntimeConfigurationErrors } from "@/backend/config/runtime";

const handler = toNextJsHandler(auth);
const unavailable = () =>
  Response.json(
    {
      error: {
        code: "SERVICE_NOT_CONFIGURED",
        message: "Сервис авторизации ещё не настроен",
      },
    },
    { status: 503 },
  );

export function GET(request: Request) {
  if (getRuntimeConfigurationErrors().length > 0) return unavailable();
  return handler.GET(request);
}

export function POST(request: Request) {
  if (getRuntimeConfigurationErrors().length > 0) return unavailable();
  return handler.POST(request);
}
