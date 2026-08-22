import { handleRouteError } from "@/backend/shared/http";
import { requireTenantContext } from "@/backend/tenancy/context";
import { baseCapabilities } from "@/backend/admin/authorize";
import { getAssignedPermissions } from "@/backend/admin/service";

export async function GET(request: Request) {
  try {
    const context = await requireTenantContext(request);
    const assignedPermissions = await getAssignedPermissions(
      context.company.id,
      context.membership.id,
    );
    const capabilities = [
      ...new Set([
        ...baseCapabilities(context.membership.role),
        ...assignedPermissions,
      ]),
    ];

    return Response.json({
      user: {
        id: context.session.user.id,
        name: context.session.user.name,
        email: context.session.user.email,
        image: context.session.user.image,
      },
      company: {
        id: context.company.id,
        name: context.company.name,
        slug: context.company.slug,
        logoUrl: context.company.logoUrl,
        accentColor: context.company.accentColor,
      },
      membership: {
        id: context.membership.id,
        role: context.membership.role,
        capabilities,
      },
      employee: context.profile
        ? {
            jobTitle: context.profile.jobTitle,
            activityPoints: context.profile.activityPoints,
            walletPoints: context.profile.walletPoints,
            department: context.department
              ? {
                  id: context.department.id,
                  name: context.department.name,
                }
              : null,
          }
        : null,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
