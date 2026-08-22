import { aiChatSchema } from "@/backend/ai/schemas";
import { chatWithEmployeeContext } from "@/backend/ai/service";
import { handleRouteError } from "@/backend/shared/http";
import { parseJson } from "@/backend/shared/validation";
import { requireTenantContext } from "@/backend/tenancy/context";

export async function POST(request: Request) {
  try {
    const context = await requireTenantContext(request);
    const input = await parseJson(request, aiChatSchema);
    return Response.json({
      message: await chatWithEmployeeContext(
        context.company.id,
        context.membership.id,
        input.messages,
      ),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
