import { handleRouteError } from "@/backend/shared/http";
import { parseJson } from "@/backend/shared/validation";
import { createEventSchema } from "@/backend/events/schemas";
import { createEvent } from "@/backend/events/service";
import { listAdminEvents } from "@/backend/admin/service";
import { authorizeCapability } from "@/backend/admin/authorize";

export async function GET(request: Request) {
  try {
    const context = await authorizeCapability(
      request,
      "events.registrations.read",
    );
    return Response.json({ events: await listAdminEvents(context.company.id) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await authorizeCapability(request, "events.manage");
    const input = await parseJson(request, createEventSchema);
    return Response.json(
      {
        event: await createEvent(
          context.company.id,
          context.membership.id,
          input,
        ),
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
