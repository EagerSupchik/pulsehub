import { getPersonalityAssessment, savePersonalityAssessment } from "@/backend/personality/service";
import { personalityAssessmentSchema } from "@/backend/personality/schemas";
import { handleRouteError } from "@/backend/shared/http";
import { parseJson } from "@/backend/shared/validation";
import { requireTenantContext } from "@/backend/tenancy/context";

export async function GET(request: Request) {
  try {
    const context = await requireTenantContext(request);
    return Response.json(await getPersonalityAssessment(context.membership.id));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const context = await requireTenantContext(request);
    const input = await parseJson(request, personalityAssessmentSchema);
    return Response.json({
      profile: await savePersonalityAssessment(context.membership.id, input),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
