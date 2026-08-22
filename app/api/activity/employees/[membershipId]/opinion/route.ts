import { and, eq } from "drizzle-orm";
import { authorizeCapability } from "@/backend/admin/authorize";
import { getAssignedPermissions } from "@/backend/admin/service";
import { generateEmployeeOpinion } from "@/backend/ai/service";
import { handleRouteError, jsonError } from "@/backend/shared/http";
import { requireTenantContext } from "@/backend/tenancy/context";
import { getDb } from "@/db";
import { companyMemberships, employeeProfiles } from "@/db/schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  try {
    const base = await requireTenantContext(request);
    const context =
      base.membership.role === "manager"
        ? base
        : await authorizeCapability(request, "activity.company.read");
    const { membershipId } = await params;
    const [target] = await getDb()
      .select({ departmentId: employeeProfiles.departmentId })
      .from(companyMemberships)
      .leftJoin(
        employeeProfiles,
        eq(employeeProfiles.membershipId, companyMemberships.id),
      )
      .where(
        and(
          eq(companyMemberships.companyId, context.company.id),
          eq(companyMemberships.id, membershipId),
        ),
      )
      .limit(1);
    if (!target)
      throw jsonError(404, "EMPLOYEE_NOT_FOUND", "Сотрудник не найден");
    const assigned = await getAssignedPermissions(
      context.company.id,
      context.membership.id,
    );
    const canReadCompany =
      ["hr", "admin"].includes(context.membership.role) ||
      assigned.includes("activity.company.read");
    if (
      !canReadCompany &&
      target.departmentId !== context.profile?.departmentId
    )
      throw jsonError(
        403,
        "INSUFFICIENT_PERMISSION",
        "Нет доступа к этому сотруднику",
      );
    return Response.json({
      opinion: await generateEmployeeOpinion(context.company.id, membershipId),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
