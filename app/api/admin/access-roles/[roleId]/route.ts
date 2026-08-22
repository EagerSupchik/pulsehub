import { authorizeCapability } from "@/backend/admin/authorize";
import { handleRouteError } from "@/backend/shared/http";
import { parseJson } from "@/backend/shared/validation";
import { updateAccessRoleSchema } from "@/backend/admin/schemas";
import { deleteAccessRole, updateAccessRole } from "@/backend/admin/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roleId: string }> },
) {
  try {
    const context = await authorizeCapability(request, "roles.manage");
    const input = await parseJson(request, updateAccessRoleSchema);
    const { roleId } = await params;
    return Response.json({
      role: await updateAccessRole(context.company.id, roleId, input),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roleId: string }> },
) {
  try {
    const context = await authorizeCapability(request, "roles.manage");
    const { roleId } = await params;
    await deleteAccessRole(context.company.id, roleId);
    return Response.json({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
