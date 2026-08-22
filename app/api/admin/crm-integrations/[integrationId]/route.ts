import { updateCrmIntegrationSchema } from "@/backend/tasks/schemas";
import {
  deleteCrmIntegration,
  updateCrmIntegration,
} from "@/backend/tasks/service";
import { handleRouteError } from "@/backend/shared/http";
import { parseJson } from "@/backend/shared/validation";
import { authorizeCapability } from "@/backend/admin/authorize";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ integrationId: string }> },
) {
  try {
    const context = await authorizeCapability(request, "crm.manage");
    const input = await parseJson(request, updateCrmIntegrationSchema);
    const { integrationId } = await params;
    return Response.json({
      integration: await updateCrmIntegration(
        context.company.id,
        integrationId,
        input,
      ),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ integrationId: string }> },
) {
  try {
    const context = await authorizeCapability(request, "crm.manage");
    const { integrationId } = await params;
    await deleteCrmIntegration(context.company.id, integrationId);
    return Response.json({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
