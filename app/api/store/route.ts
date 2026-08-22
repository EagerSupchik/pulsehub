import { requireTenantContext } from "@/backend/tenancy/context";
import { handleRouteError } from "@/backend/shared/http";
import { listStoreBonuses } from "@/backend/store/service";

export async function GET(request: Request) {
  try {
    const context = await requireTenantContext(request);
    return Response.json({
      bonuses: await listStoreBonuses(context.company.id),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
