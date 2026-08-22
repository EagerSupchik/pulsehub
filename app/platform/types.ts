export type Role = "employee" | "manager" | "hr" | "admin";
export type ActivityLevel = "green" | "yellow" | "red" | "unrated";
export type PageId =
  | "home"
  | "tasks"
  | "events"
  | "store"
  | "career"
  | "activity"
  | "admin_roles"
  | "admin_crm"
  | "admin_notifications"
  | "admin_events"
  | "admin_bonuses"
  | "admin_ai";
export interface NavItem {
  id: PageId;
  label: string;
  icon: string;
}

export interface User {
  id: string;
  tenantId: string;
  name: string;
  initials: string;
  position: string;
  department: string;
  role: Role;
  activityPoints: number;
  walletPoints: number;
  level: ActivityLevel;
  companyName?: string;
  email?: string;
  capabilities: string[];
}

export interface CurrentAccountResponse {
  user: { id: string; name: string; email: string; image: string | null };
  company: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    accentColor: string;
  };
  membership: { id: string; role: Role; capabilities: string[] };
  employee: {
    jobTitle: string | null;
    activityPoints: number;
    walletPoints: number;
    department: { id: string; name: string } | null;
  } | null;
}

export interface Task {
  id: string;
  externalId?: string;
  title: string;
  project: string;
  dueAt: string | null;
  completedAt?: string | null;
  pointsAwardedAt?: string | null;
  lastSyncedAt?: string | null;
  sourceUrl?: string | null;
  sourceName?: string;
  sourceProvider?: string;
  sourceStatus?: string;
  points: number;
  status: "new" | "progress" | "done" | "cancelled";
  priority: "high" | "medium" | "low";
}

export interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  location: string;
  attendees: number;
  capacity: number;
  joined: boolean;
  kind: string;
}

export interface RewardItem {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  price: number;
  emoji: string;
  tint: string;
  stock?: number | null;
  status?: "active" | "archived";
}

export interface Employee {
  id: string;
  name: string;
  initials: string;
  position: string;
  departmentId: string;
  level: ActivityLevel;
  score: number;
  delta: number;
  tasks: number;
  lastActiveAt: string | null;
  insight: string;
}

export interface ActivityTrackingResponse {
  periodDays: number;
  periodStart: string;
  periodEnd: string;
  thresholds: { greenMinimum: number; yellowMinimum: number };
  departments: Department[];
  employees: Employee[];
}

export interface Department {
  id: string;
  name: string;
  employees: number;
  average: number;
  trend: number;
  counts: Record<ActivityLevel, number>;
}
