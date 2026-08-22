import { aiSettingsSchema } from "@/backend/admin/schemas";
import { getAiSettings, saveAiSettings } from "@/backend/admin/service";
import { handleRouteError } from "@/backend/shared/http";
import { parseJson } from "@/backend/shared/validation";
import { authorizeCapability } from "@/backend/admin/authorize";

export async function GET(request: Request) {
  try {
    const context = await authorizeCapability(request, "ai.manage");
    return Response.json({ settings: await getAiSettings(context.company.id) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const context = await authorizeCapability(request, "ai.manage");
    const input = await parseJson(request, aiSettingsSchema);
    return Response.json({
      settings: await saveAiSettings(
        context.company.id,
        context.membership.id,
        input,
      ),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
