import { updateAdminEventSchema } from "@/backend/admin/schemas";
import { deleteAdminEvent, updateAdminEvent } from "@/backend/admin/service";
import { handleRouteError } from "@/backend/shared/http";
import { parseJson } from "@/backend/shared/validation";
import { authorizeCapability } from "@/backend/admin/authorize";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const context = await authorizeCapability(request, "events.manage");
    const input = await parseJson(request, updateAdminEventSchema);
    const { eventId } = await params;
    return Response.json({
      event: await updateAdminEvent(context.company.id, eventId, input),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const context = await authorizeCapability(request, "events.manage");
    const { eventId } = await params;
    await deleteAdminEvent(context.company.id, eventId);
    return Response.json({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
