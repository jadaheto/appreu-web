import { Routes } from '@angular/router';
import { APP_PATHS, roleGuard } from '../core';

/**
 * Rutas hijas de `/admin` (layout administrativo ya aplicado por `PortalShell`).
 * Cada contexto agrega aquí su `loadChildren` ANTES del comodín `**`:
 *
 * ```ts
 * { path: 'usuarios', canActivate: [roleGuard('admin')], title: 'Usuarios',
 *   loadChildren: () => import('../features/users/users.routes') },
 * ```
 */
export default [
  {
    path: '',
    pathMatch: 'full',
    title: 'Dashboard',
    loadComponent: () =>
      import('../features/dashboard/pages/admin-dashboard-page').then((m) => m.AdminDashboardPage),
  },
  {
    path: APP_PATHS.changePassword,
    title: 'Cambiar contraseña',
    loadComponent: () =>
      import('../features/auth/pages/change-password/change-password-page').then(
        (m) => m.ChangePasswordPage,
      ),
  },
  // --- Rutas de cada contexto (un archivo por feature y ruta; ver features/README.md) ---
  {
    path: 'alumnos',
    title: 'Alumnos',
    canActivate: [roleGuard('admin')],
    loadChildren: () => import('../features/students/routes/admin-alumnos.routes'),
  },
  {
    path: 'incidencias',
    title: 'Incidencias',
    canActivate: [roleGuard('admin', 'hr')],
    loadChildren: () => import('../features/students/routes/admin-incidencias.routes'),
  },
  {
    path: 'academico',
    title: 'Gestión académica',
    canActivate: [roleGuard('admin')],
    loadChildren: () => import('../features/academic/routes/admin-academico.routes'),
  },
  {
    path: 'periodos',
    title: 'Períodos académicos',
    canActivate: [roleGuard('admin')],
    loadChildren: () => import('../features/academic/routes/admin-periodos.routes'),
  },
  {
    path: 'finanzas',
    title: 'Finanzas y caja',
    canActivate: [roleGuard('admin', 'finance')],
    loadChildren: () => import('../features/finance/routes/admin-finanzas.routes'),
  },
  {
    path: 'facturacion',
    title: 'Facturación electrónica',
    canActivate: [roleGuard('admin', 'finance')],
    loadChildren: () => import('../features/e-invoicing/routes/admin-facturacion.routes'),
  },
  {
    path: 'contabilidad',
    title: 'Contabilidad',
    canActivate: [roleGuard('admin', 'finance')],
    loadChildren: () => import('../features/accounting/routes/admin-contabilidad.routes'),
  },
  {
    path: 'inventario',
    title: 'Inventario',
    canActivate: [roleGuard('admin')],
    loadChildren: () => import('../features/inventory/routes/admin-inventario.routes'),
  },
  {
    path: 'rrhh',
    title: 'Capital humano',
    canActivate: [roleGuard('admin', 'hr')],
    loadChildren: () => import('../features/hr/routes/admin-rrhh.routes'),
  },
  {
    path: 'nomina',
    title: 'Nómina',
    canActivate: [roleGuard('admin', 'hr', 'finance')],
    loadChildren: () => import('../features/hr/routes/admin-nomina.routes'),
  },
  {
    path: 'stickers',
    title: 'Stickers',
    canActivate: [roleGuard('admin', 'hr')],
    loadChildren: () => import('../features/hr/routes/admin-stickers.routes'),
  },
  {
    path: 'whatsapp',
    title: 'WhatsApp',
    canActivate: [roleGuard('admin', 'finance', 'hr')],
    loadChildren: () => import('../features/communications/routes/admin-whatsapp.routes'),
  },
  {
    path: 'correos',
    title: 'Correos',
    canActivate: [roleGuard('admin', 'finance', 'hr')],
    loadChildren: () => import('../features/communications/routes/admin-correos.routes'),
  },
  {
    path: 'marketing',
    title: 'Marketing IA',
    canActivate: [roleGuard('admin')],
    loadChildren: () => import('../features/communications/routes/admin-marketing.routes'),
  },
  {
    path: 'monitor-ia',
    title: 'Monitor IA',
    canActivate: [roleGuard('admin')],
    loadChildren: () => import('../features/communications/routes/admin-monitor-ia.routes'),
  },
  {
    path: 'usuarios',
    title: 'Usuarios',
    canActivate: [roleGuard('admin')],
    loadChildren: () => import('../features/administration/routes/admin-usuarios.routes'),
  },
  {
    path: 'configuracion',
    title: 'Configuración',
    canActivate: [roleGuard('admin', 'finance', 'hr')],
    loadChildren: () => import('../features/administration/routes/admin-configuracion.routes'),
  },
  {
    path: 'auditoria',
    title: 'Auditoría',
    canActivate: [roleGuard('admin')],
    loadChildren: () => import('../features/administration/routes/admin-auditoria.routes'),
  },
  {
    path: '**',
    title: 'En construcción',
    loadComponent: () =>
      import('../features/errors/pages/coming-soon-page').then((m) => m.ComingSoonPage),
  },
] satisfies Routes;
