import { authorizeCapability } from "@/backend/admin/authorize";
import { handleRouteError } from "@/backend/shared/http";
import { parseJson } from "@/backend/shared/validation";
import { updateRedemptionSchema } from "@/backend/store/schemas";
import { updateRedemption } from "@/backend/store/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ redemptionId: string }> },
) {
  try {
    const context = await authorizeCapability(request, "bonuses.manage");
    const { redemptionId } = await params;
    const input = await parseJson(request, updateRedemptionSchema);
    return Response.json({
      redemption: await updateRedemption(
        context.company.id,
        redemptionId,
        input.status,
      ),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
