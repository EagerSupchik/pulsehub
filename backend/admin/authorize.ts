import { requireTenantContext } from "@/backend/tenancy/context";
import { jsonError } from "@/backend/shared/http";
import { getAssignedPermissions } from "./service";
import type { permissionKeys } from "./schemas";

export type Capability = (typeof permissionKeys)[number];

const builtInCapabilities = {
  employee: [],
  manager: [],
  hr: [
    "events.manage",
    "events.registrations.read",
    "activity.company.read",
    "activity.settings.manage",
  ],
  admin: [
    "users.manage",
    "roles.manage",
    "events.manage",
    "events.registrations.read",
    "bonuses.manage",
    "activity.company.read",
    "activity.settings.manage",
    "crm.manage",
    "notifications.manage",
    "ai.manage",
  ],
} satisfies Record<string, Capability[]>;

export async function authorizeCapability(
  request: Request,
  capability: Capability,
) {
  const context = await requireTenantContext(request);
  const builtIn = builtInCapabilities[
    context.membership.role
  ] as readonly Capability[];
  if (builtIn.includes(capability)) return context;
  const assigned = await getAssignedPermissions(
    context.company.id,
    context.membership.id,
  );
  if (!assigned.includes(capability))
    throw jsonError(
      403,
      "INSUFFICIENT_PERMISSION",
      "Недостаточно прав для выполнения действия",
    );
  return context;
}

export function baseCapabilities(role: keyof typeof builtInCapabilities) {
  return builtInCapabilities[role];
}
