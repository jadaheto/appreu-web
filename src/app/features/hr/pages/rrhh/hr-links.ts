import type { SectionLink } from '../../components/section-nav';

export const HR_BASE = '/admin/rrhh';
export const PAYROLL_BASE = '/admin/nomina';

/** Pestañas del módulo Capital Humano. */
export const HR_LINKS: readonly SectionLink[] = [
  { label: 'Empleados', route: HR_BASE, icon: 'users', exact: true },
  { label: 'Permisos y licencias', route: `${HR_BASE}/permisos`, icon: 'calendar' },
  { label: 'Nómina', route: PAYROLL_BASE, icon: 'wallet' },
];
