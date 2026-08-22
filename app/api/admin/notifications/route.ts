import { notificationSettingsSchema } from "@/backend/admin/schemas";
import {
  getNotificationSettings,
  saveNotificationSettings,
} from "@/backend/admin/service";
import { handleRouteError } from "@/backend/shared/http";
import { parseJson } from "@/backend/shared/validation";
import { authorizeCapability } from "@/backend/admin/authorize";

export async function GET(request: Request) {
  try {
    const context = await authorizeCapability(request, "notifications.manage");
    return Response.json({
      settings: await getNotificationSettings(context.company.id),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const context = await authorizeCapability(request, "notifications.manage");
    const input = await parseJson(request, notificationSettingsSchema);
    return Response.json({
      settings: await saveNotificationSettings(
        context.company.id,
        context.membership.id,
        input,
      ),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
