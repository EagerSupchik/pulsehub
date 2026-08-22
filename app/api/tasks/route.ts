import { handleRouteError } from "@/backend/shared/http";
import { requireTenantContext } from "@/backend/tenancy/context";
import {
  listMemberTasks,
  pullCrmTasksOnDemand,
} from "@/backend/tasks/service";

export async function GET(request: Request) {
  try {
    const context = await requireTenantContext(request);
    await pullCrmTasksOnDemand(context.company.id);
    const memberTasks = await listMemberTasks(
      context.company.id,
      context.membership.id,
    );
    return Response.json({ tasks: memberTasks });
  } catch (error) {
    return handleRouteError(error);
  }
}
