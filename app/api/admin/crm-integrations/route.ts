import { createCrmIntegrationSchema } from "@/backend/tasks/schemas";
import {
  createCrmIntegration,
  listCrmIntegrations,
} from "@/backend/tasks/service";
import { handleRouteError } from "@/backend/shared/http";
import { parseJson } from "@/backend/shared/validation";
import { authorizeCapability } from "@/backend/admin/authorize";
import { listAssignableMembers } from "@/backend/admin/service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const context = await authorizeCapability(request, "crm.manage");
    const [integrations, memberDirectory] = await Promise.all([
      listCrmIntegrations(context.company.id),
      listAssignableMembers(context.company.id, {
        page: Number(url.searchParams.get("memberPage")) || 1,
        pageSize: 25,
        search: url.searchParams.get("memberSearch") ?? "",
      }),
    ]);
    return Response.json({
      integrations,
      members: memberDirectory.members,
      memberPagination: memberDirectory.pagination,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await authorizeCapability(request, "crm.manage");
    const input = await parseJson(request, createCrmIntegrationSchema);
    const result = await createCrmIntegration(context.company.id, input);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
