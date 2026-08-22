import { authorizeCapability } from "@/backend/admin/authorize";
import { unassignAccessRole } from "@/backend/admin/service";
import { handleRouteError } from "@/backend/shared/http";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roleId: string; membershipId: string }> },
) {
  try {
    const context = await authorizeCapability(request, "roles.manage");
    const { roleId, membershipId } = await params;
    await unassignAccessRole(context.company.id, roleId, membershipId);
    return Response.json({ assigned: false });
  } catch (error) {
    return handleRouteError(error);
  }
}
