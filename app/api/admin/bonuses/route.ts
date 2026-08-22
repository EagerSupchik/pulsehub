import { authorizeCapability } from "@/backend/admin/authorize";
import { handleRouteError } from "@/backend/shared/http";
import { parseJson } from "@/backend/shared/validation";
import { createBonusSchema } from "@/backend/store/schemas";
import {
  createBonus,
  listAdminBonuses,
  listRedemptions,
} from "@/backend/store/service";

export async function GET(request: Request) {
  try {
    const context = await authorizeCapability(request, "bonuses.manage");
    const [bonuses, redemptions] = await Promise.all([
      listAdminBonuses(context.company.id),
      listRedemptions(context.company.id),
    ]);
    return Response.json({ bonuses, redemptions });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await authorizeCapability(request, "bonuses.manage");
    const input = await parseJson(request, createBonusSchema);
    return Response.json(
      {
        bonus: await createBonus(
          context.company.id,
          context.membership.id,
          input,
        ),
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
