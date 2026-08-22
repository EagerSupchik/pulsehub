import { handleRouteError, jsonError } from "@/backend/shared/http";
import { parseJson } from "@/backend/shared/validation";
import { activityThresholdsSchema } from "@/backend/activity/schemas";
import {
  getActivityTracking,
  updateActivityThresholds,
} from "@/backend/activity/service";
import { authorizeCapability } from "@/backend/admin/authorize";
import { requireTenantContext } from "@/backend/tenancy/context";
import { getAssignedPermissions } from "@/backend/admin/service";

export async function GET(request: Request) {
  try {
    const baseContext = await requireTenantContext(request);
    const context =
      baseContext.membership.role === "manager"
        ? baseContext
        : await authorizeCapability(request, "activity.company.read");
    const assigned = await getAssignedPermissions(
      context.company.id,
      context.membership.id,
    );
    const canReadCompany =
      ["hr", "admin"].includes(context.membership.role) ||
      assigned.includes("activity.company.read");
    if (!canReadCompany && !context.profile?.departmentId) {
      throw jsonError(
        403,
        "DEPARTMENT_REQUIRED",
        "Для руководителя не указан отдел",
      );
    }
    const departmentId = canReadCompany ? null : context.profile?.departmentId;
    return Response.json(
      await getActivityTracking(context.company.id, departmentId),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await authorizeCapability(
      request,
      "activity.settings.manage",
    );
    const input = await parseJson(request, activityThresholdsSchema);
    return Response.json({
      thresholds: await updateActivityThresholds(
        context.company.id,
        context.membership.id,
        input,
      ),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
