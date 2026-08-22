import { authorizeCapability } from "@/backend/admin/authorize";
import { handleRouteError } from "@/backend/shared/http";
import { parseJson } from "@/backend/shared/validation";
import { updateMembershipSchema } from "@/backend/users/schemas";
import {
  deleteCompanyEmployee,
  updateCompanyMembership,
} from "@/backend/users/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  try {
    const context = await authorizeCapability(request, "users.manage");
    const input = await parseJson(request, updateMembershipSchema);
    const { membershipId } = await params;
    await updateCompanyMembership(
      context.company.id,
      context.session.user.id,
      context.membership.role,
      membershipId,
      input,
    );
    return Response.json({ updated: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  try {
    const context = await authorizeCapability(request, "users.manage");
    const { membershipId } = await params;
    await deleteCompanyEmployee(
      context.company.id,
      context.session.user.id,
      context.membership.role,
      membershipId,
    );
    return Response.json({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
