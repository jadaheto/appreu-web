import { Routes } from '@angular/router';
import { APP_PATHS } from '../core';

/** Rutas hijas de `/portal-empleado` (teacher, employee). Ver `features/README.md`. */
export default [
  {
    path: '',
    pathMatch: 'full',
    title: 'Mi Portal',
    loadComponent: () =>
      import('../features/dashboard/pages/employee-dashboard-page').then(
        (m) => m.EmployeeDashboardPage,
      ),
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
    path: 'calificaciones',
    title: 'Calificaciones',
    loadChildren: () => import('../features/academic/routes/employee-calificaciones.routes'),
  },
  {
    path: 'mis-grupos',
    title: 'Mis grupos',
    loadChildren: () => import('../features/academic/routes/employee-mis-grupos.routes'),
  },
  {
    path: 'asistencia-qr',
    title: 'Asistencia QR',
    loadChildren: () => import('../features/academic/routes/employee-asistencia-qr.routes'),
  },
  {
    path: 'desprendibles',
    title: 'Desprendibles',
    loadChildren: () => import('../features/hr/routes/employee-desprendibles.routes'),
  },
  {
    path: 'certificados',
    title: 'Certificados',
    loadChildren: () => import('../features/hr/routes/employee-certificados.routes'),
  },
  {
    path: 'mis-datos',
    title: 'Mis datos',
    loadComponent: () =>
      import('../features/hr/pages/portal/my-profile-page').then((m) => m.MyProfilePage),
  },
  {
    path: 'permisos',
    title: 'Permisos',
    loadChildren: () => import('../features/hr/routes/employee-permisos.routes'),
  },
  {
    path: 'stickers',
    title: 'Stickers',
    loadChildren: () => import('../features/hr/routes/employee-stickers.routes'),
  },
  {
    path: 'historial-ia',
    title: 'Historial IA',
    loadChildren: () => import('../features/communications/routes/employee-historial-ia.routes'),
  },
  {
    path: '**',
    title: 'En construcción',
    loadComponent: () =>
      import('../features/errors/pages/coming-soon-page').then((m) => m.ComingSoonPage),
  },
] satisfies Routes;
