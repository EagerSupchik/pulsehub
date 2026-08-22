import { authorizeCapability } from "@/backend/admin/authorize";
import { handleRouteError } from "@/backend/shared/http";
import { parseJson } from "@/backend/shared/validation";
import { createAccessRoleSchema } from "@/backend/admin/schemas";
import {
  createAccessRole,
  listAccessRoles,
  listAssignableMembers,
} from "@/backend/admin/service";

export async function GET(request: Request) {
  try {
    const context = await authorizeCapability(request, "roles.manage");
    const [roles, members] = await Promise.all([
      listAccessRoles(context.company.id),
      listAssignableMembers(context.company.id),
    ]);
    return Response.json({ roles, members });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await authorizeCapability(request, "roles.manage");
    const input = await parseJson(request, createAccessRoleSchema);
    return Response.json(
      {
        role: await createAccessRole(
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
