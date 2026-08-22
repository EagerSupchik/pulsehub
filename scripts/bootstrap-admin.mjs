import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";

const required = [
  "DATABASE_URL",
  "COMPANY_NAME",
  "COMPANY_SLUG",
  "ADMIN_NAME",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
];
for (const key of required) {
  if (!process.env[key]?.trim())
    throw new Error(`Missing required environment variable: ${key}`);
}

const input = {
  companyName: process.env.COMPANY_NAME.trim(),
  companySlug: process.env.COMPANY_SLUG.trim().toLowerCase(),
  adminName: process.env.ADMIN_NAME.trim(),
  adminEmail: process.env.ADMIN_EMAIL.trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD,
  departmentName: process.env.DEPARTMENT_NAME?.trim() || "Administration",
};
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.companySlug)) {
  throw new Error(
    "COMPANY_SLUG must contain lowercase letters, digits and single hyphens",
  );
}
if (input.adminPassword.length < 12)
  throw new Error("ADMIN_PASSWORD must contain at least 12 characters");

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const now = new Date();
const companyId = crypto.randomUUID();
const departmentId = crypto.randomUUID();
const userId = crypto.randomUUID();
const accountId = crypto.randomUUID();
const membershipId = crypto.randomUUID();
const profileId = crypto.randomUUID();
const auditId = crypto.randomUUID();
const passwordHash = await hashPassword(input.adminPassword);

try {
  const conflicts = await sql`
    select
      exists(select 1 from "company" where slug = ${input.companySlug}) as company_exists,
      exists(select 1 from "user" where email = ${input.adminEmail}) as user_exists
  `;
  if (conflicts[0].company_exists || conflicts[0].user_exists) {
    throw new Error(
      "Company slug or administrator email already exists; bootstrap aborted",
    );
  }

  await sql.begin(async (tx) => {
    await tx`insert into "company" (id, name, slug, created_at, updated_at)
        values (${companyId}, ${input.companyName}, ${input.companySlug}, ${now}, ${now})`;
    await tx`insert into "department" (id, company_id, name, created_at, updated_at)
        values (${departmentId}, ${companyId}, ${input.departmentName}, ${now}, ${now})`;
    await tx`insert into "user" (id, name, email, email_verified, role, created_at, updated_at)
        values (${userId}, ${input.adminName}, ${input.adminEmail}, true, 'user', ${now}, ${now})`;
    await tx`insert into "account" (id, user_id, account_id, provider_id, password, created_at, updated_at)
        values (${accountId}, ${userId}, ${userId}, 'credential', ${passwordHash}, ${now}, ${now})`;
    await tx`insert into "company_membership" (id, company_id, user_id, role, status, created_at, updated_at)
        values (${membershipId}, ${companyId}, ${userId}, 'admin', 'active', ${now}, ${now})`;
    await tx`insert into "employee_profile" (id, membership_id, department_id, job_title, created_at, updated_at)
        values (${profileId}, ${membershipId}, ${departmentId}, 'Administrator', ${now}, ${now})`;
    await tx`insert into "audit_log" (id, company_id, actor_user_id, action, target_type, target_id, metadata, created_at)
        values (${auditId}, ${companyId}, ${userId}, 'company.bootstrapped', 'company', ${companyId},
          ${JSON.stringify({ administratorEmail: input.adminEmail })}::jsonb, ${now})`;
  });

  console.log(
    `PulseHub workspace "${input.companyName}" created successfully.`,
  );
  console.log(`Administrator: ${input.adminEmail}`);
} finally {
  await sql.end();
}
