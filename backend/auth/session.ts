import { auth } from "./auth";

export async function getSession(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

export async function requireSession(request: Request) {
  const session = await getSession(request);

  if (!session) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return session;
}
