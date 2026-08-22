import { handleRouteError } from "@/backend/shared/http";
import { requireTenantContext } from "@/backend/tenancy/context";
import { registerForEvent } from "@/backend/events/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const context = await requireTenantContext(request);
    const { eventId } = await params;
    return Response.json(
      await registerForEvent(
        context.company.id,
        context.membership.id,
        eventId,
      ),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
