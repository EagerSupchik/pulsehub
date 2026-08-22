import { jsonError } from "@/backend/shared/http";
import {
  hasPermission,
  type Permission,
  type PermissionResource,
} from "./permissions";
import { requireTenantContext } from "./context";

export async function authorize<R extends PermissionResource>(
  request: Request,
  resource: R,
  permission: Permission<R>,
) {
  const context = await requireTenantContext(request);
  if (!hasPermission(context.membership.role, resource, permission)) {
    throw jsonError(
      403,
      "INSUFFICIENT_PERMISSION",
      "Недостаточно прав для выполнения действия",
    );
  }
  return context;
}
