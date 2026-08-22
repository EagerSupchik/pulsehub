import { authorizeCapability } from "@/backend/admin/authorize";
import { handleRouteError } from "@/backend/shared/http";
import { parseJson } from "@/backend/shared/validation";
import { updateBonusSchema } from "@/backend/store/schemas";
import { deleteBonus, updateBonus } from "@/backend/store/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ bonusId: string }> },
) {
  try {
    const context = await authorizeCapability(request, "bonuses.manage");
    const { bonusId } = await params;
    const input = await parseJson(request, updateBonusSchema);
    return Response.json({
      bonus: await updateBonus(context.company.id, bonusId, input),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ bonusId: string }> },
) {
  try {
    const context = await authorizeCapability(request, "bonuses.manage");
    const { bonusId } = await params;
    await deleteBonus(context.company.id, bonusId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
