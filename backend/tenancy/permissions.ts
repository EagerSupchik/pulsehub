import type { CompanyRole } from "@/db/schema";

export const permissions = {
  profile: ["read:self"],
  activity: ["read:self"],
  tracking: ["read:department", "read:company", "configure"],
  events: ["create", "read:registrations"],
  users: ["create", "read", "update", "suspend"],
  settings: ["read", "update"],
} as const;

export type PermissionResource = keyof typeof permissions;
export type Permission<R extends PermissionResource> =
  (typeof permissions)[R][number];

const rolePermissions: Record<
  CompanyRole,
  Partial<{ [R in PermissionResource]: readonly Permission<R>[] }>
> = {
  employee: {
    profile: ["read:self"],
    activity: ["read:self"],
  },
  manager: {
    profile: ["read:self"],
    activity: ["read:self"],
    tracking: ["read:department"],
  },
  hr: {
    profile: ["read:self"],
    activity: ["read:self"],
    tracking: ["read:department", "read:company", "configure"],
    events: ["create", "read:registrations"],
    users: ["read", "update", "suspend"],
  },
  admin: {
    profile: ["read:self"],
    activity: ["read:self"],
    tracking: ["read:department", "read:company", "configure"],
    events: ["create", "read:registrations"],
    users: ["create", "read", "update", "suspend"],
    settings: ["read", "update"],
  },
};

export function hasPermission<R extends PermissionResource>(
  role: CompanyRole,
  resource: R,
  permission: Permission<R>,
) {
  const allowed = rolePermissions[role][resource] as
    | readonly string[]
    | undefined;
  return allowed?.includes(permission) ?? false;
}
