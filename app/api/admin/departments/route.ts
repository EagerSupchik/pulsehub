import { asc, eq } from "drizzle-orm";
import { writeAuditLog } from "@/backend/audit/log";
import { createDepartmentSchema } from "@/backend/departments/schemas";
import { handleRouteError } from "@/backend/shared/http";
import { parseJson } from "@/backend/shared/validation";
import { authorizeCapability } from "@/backend/admin/authorize";
import { getDb } from "@/db";
import { departments } from "@/db/schema";

export async function GET(request: Request) {
  try {
    const context = await authorizeCapability(request, "users.manage");
    const rows = await getDb()
      .select()
      .from(departments)
      .where(eq(departments.companyId, context.company.id))
      .orderBy(asc(departments.name));
    return Response.json({ departments: rows });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await authorizeCapability(request, "users.manage");
    const input = await parseJson(request, createDepartmentSchema);
    const db = getDb();
    const id = crypto.randomUUID();
    await db
      .insert(departments)
      .values({ id, companyId: context.company.id, name: input.name });
    await writeAuditLog(db, {
      companyId: context.company.id,
      actorUserId: context.session.user.id,
      action: "department.created",
      targetType: "department",
      targetId: id,
      metadata: { name: input.name },
    });
    return Response.json({ id, name: input.name }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
