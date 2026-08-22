import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  companies,
  companyMemberships,
  departments,
  employeeProfiles,
} from "@/db/schema";
import { requireSession } from "@/backend/auth/session";
import { jsonError } from "@/backend/shared/http";
import { requireRuntimeConfiguration } from "@/backend/config/runtime";

export async function requireTenantContext(request: Request) {
  requireRuntimeConfiguration();
  const session = await requireSession(request);
  const db = getDb();
  const requestedCompanyId =
    session.session.activeCompanyId ??
    request.headers.get("x-pulsehub-company-id");

  const membershipRows = await db
    .select({
      membership: companyMemberships,
      company: companies,
      profile: employeeProfiles,
      department: departments,
    })
    .from(companyMemberships)
    .innerJoin(companies, eq(companyMemberships.companyId, companies.id))
    .leftJoin(
      employeeProfiles,
      eq(employeeProfiles.membershipId, companyMemberships.id),
    )
    .leftJoin(departments, eq(employeeProfiles.departmentId, departments.id))
    .where(
      and(
        eq(companyMemberships.userId, session.user.id),
        eq(companyMemberships.status, "active"),
        requestedCompanyId
          ? eq(companyMemberships.companyId, requestedCompanyId)
          : undefined,
      ),
    )
    .limit(1);

  const context = membershipRows[0];

  if (!context) {
    throw jsonError(
      403,
      "COMPANY_ACCESS_DENIED",
      "У аккаунта нет доступа к этой компании",
    );
  }

  return { session, ...context };
}
