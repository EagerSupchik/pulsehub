import { authorizeCapability } from "@/backend/admin/authorize";
import { handleRouteError } from "@/backend/shared/http";
import { parseJson } from "@/backend/shared/validation";
import { createEmployeeSchema } from "@/backend/users/schemas";
import {
  createCompanyEmployee,
  listCompanyEmployees,
} from "@/backend/users/service";

export async function GET(request: Request) {
  try {
    const context = await authorizeCapability(request, "users.manage");
    return Response.json({
      employees: await listCompanyEmployees(context.company.id),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await authorizeCapability(request, "users.manage");
    const input = await parseJson(request, createEmployeeSchema);
    const result = await createCompanyEmployee(
      context.company.id,
      context.session.user.id,
      context.membership.role,
      input,
    );
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
