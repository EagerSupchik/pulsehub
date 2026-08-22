import { createCrmUserMappingSchema } from "@/backend/tasks/schemas";
import {
  createCrmUserMapping,
  listCrmUserMappings,
} from "@/backend/tasks/service";
import { handleRouteError } from "@/backend/shared/http";
import { parseJson } from "@/backend/shared/validation";
import { authorizeCapability } from "@/backend/admin/authorize";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ integrationId: string }> },
) {
  try {
    const context = await authorizeCapability(request, "crm.manage");
    const { integrationId } = await params;
    return Response.json({
      mappings: await listCrmUserMappings(context.company.id, integrationId),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ integrationId: string }> },
) {
  try {
    const context = await authorizeCapability(request, "crm.manage");
    const input = await parseJson(request, createCrmUserMappingSchema);
    const { integrationId } = await params;
    return Response.json(
      await createCrmUserMapping(context.company.id, integrationId, input),
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
