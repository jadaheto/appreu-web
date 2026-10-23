import { APP_PATHS } from '../routing/app-paths';

export const ROLES = [
  'superadmin',
  'admin',
  'finance',
  'hr',
  'teacher',
  'employee',
  'student',
  'parent',
] as const;
export type Role = (typeof ROLES)[number];

export const PORTALS = ['admin', 'employee', 'student'] as const;
export type Portal = (typeof PORTALS)[number];

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: 'Superadministrador',
  admin: 'Administrador',
  finance: 'Finanzas',
  hr: 'Talento Humano',
  teacher: 'Docente',
  employee: 'Empleado',
  student: 'Estudiante',
  parent: 'Acudiente',
};

/** Roles del portal administrativo. */
export const ADMIN_ROLES: readonly Role[] = ['superadmin', 'admin', 'finance', 'hr'];
export const EMPLOYEE_ROLES: readonly Role[] = ['teacher', 'employee'];
export const STUDENT_ROLES: readonly Role[] = ['student', 'parent'];

/** Misma regla que `portalForRole` del backend (`shared/domain/role.ts`). */
export function portalForRole(role: Role): Portal {
  if (ADMIN_ROLES.includes(role)) return 'admin';
  if (EMPLOYEE_ROLES.includes(role)) return 'employee';
  return 'student';
}

export const PORTAL_HOME: Record<Portal, string> = {
  admin: `/${APP_PATHS.admin}`,
  employee: `/${APP_PATHS.employeePortal}`,
  student: `/${APP_PATHS.studentPortal}`,
};

export const PORTAL_LABELS: Record<Portal, string> = {
  admin: 'Portal Administrativo',
  employee: 'Portal del Empleado',
  student: 'Portal del Estudiante',
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function roleLabel(role: string | null | undefined): string {
  return role && isRole(role) ? ROLE_LABELS[role] : (role ?? '');
}
