import { accessRoleAssignmentSchema } from "@/backend/admin/schemas";
import { assignAccessRole } from "@/backend/admin/service";
import { authorizeCapability } from "@/backend/admin/authorize";
import { handleRouteError } from "@/backend/shared/http";
import { parseJson } from "@/backend/shared/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roleId: string }> },
) {
  try {
    const context = await authorizeCapability(request, "roles.manage");
    const input = await parseJson(request, accessRoleAssignmentSchema);
    const { roleId } = await params;
    await assignAccessRole(context.company.id, roleId, input.membershipId);
    return Response.json({ assigned: true }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
