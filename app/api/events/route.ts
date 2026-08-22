import { handleRouteError } from "@/backend/shared/http";
import { requireTenantContext } from "@/backend/tenancy/context";
import { listEvents } from "@/backend/events/service";

export async function GET(request: Request) {
  try {
    const context = await requireTenantContext(request);
    return Response.json({
      events: await listEvents(context.company.id, context.membership.id),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
