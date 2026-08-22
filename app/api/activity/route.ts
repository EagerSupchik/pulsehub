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
    const url = new URL(request.url);
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
    const departmentScopeId = canReadCompany
      ? null
      : context.profile?.departmentId;
    const requestedDepartmentId = url.searchParams.get("departmentId");
    const requestedLevel = url.searchParams.get("level");
    const levels = ["green", "yellow", "red", "unrated"] as const;
    const level = levels.find((item) => item === requestedLevel) ?? "unrated";
    const positiveInteger = (value: string | null, fallback: number) => {
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
    };
    return Response.json(
      await getActivityTracking(context.company.id, departmentScopeId, {
        departmentId: canReadCompany
          ? requestedDepartmentId
          : departmentScopeId,
        level,
        search: url.searchParams.get("search")?.slice(0, 100) ?? "",
        page: positiveInteger(url.searchParams.get("page"), 1),
        pageSize: positiveInteger(url.searchParams.get("pageSize"), 25),
        exportAll: url.searchParams.get("export") === "1",
      }),
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
