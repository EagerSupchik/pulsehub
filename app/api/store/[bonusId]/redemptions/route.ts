import { requireTenantContext } from "@/backend/tenancy/context";
import { handleRouteError } from "@/backend/shared/http";
import { redeemBonus } from "@/backend/store/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bonusId: string }> },
) {
  try {
    const context = await requireTenantContext(request);
    const { bonusId } = await params;
    const result = await redeemBonus(
      context.company.id,
      context.membership.id,
      bonusId,
    );
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
