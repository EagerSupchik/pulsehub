import { z } from "zod";

export const companyRoleSchema = z.enum(["employee", "manager", "hr", "admin"]);

export async function parseJson<T>(
  request: Request,
  schema: z.ZodType<T>,
  maxBytes = 65_536,
): Promise<T> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) {
    throw Response.json(
      {
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "Размер запроса превышает допустимый",
        },
      },
      { status: 413 },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw Response.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Тело запроса должно содержать корректный JSON",
        },
      },
      { status: 400 },
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Проверьте заполнение обязательных полей",
          fields: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );
  }
  return parsed.data;
}
