import { Routes } from '@angular/router';
import { APP_PATHS } from '../core';

/** Rutas hijas de `/portal-estudiante` (student, parent). Ver `features/README.md`. */
export default [
  {
    path: '',
    pathMatch: 'full',
    title: 'Mi Portal',
    loadComponent: () =>
      import('../features/dashboard/pages/student-dashboard-page').then(
        (m) => m.StudentDashboardPage,
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
    path: 'notas',
    title: 'Mis notas',
    loadChildren: () => import('../features/academic/routes/student-notas.routes'),
  },
  {
    path: 'boletines',
    title: 'Boletines',
    loadChildren: () => import('../features/academic/routes/student-boletines.routes'),
  },
  {
    path: 'asistencia',
    title: 'Asistencia',
    loadChildren: () => import('../features/academic/routes/student-asistencia.routes'),
  },
  {
    path: 'incidencias',
    title: 'Incidencias',
    loadChildren: () => import('../features/students/routes/student-incidencias.routes'),
  },
  {
    path: 'carnet',
    title: 'Carnet',
    loadChildren: () => import('../features/students/routes/student-carnet.routes'),
  },
  {
    path: 'certificado',
    title: 'Certificados',
    loadChildren: () => import('../features/students/routes/student-certificado.routes'),
  },
  {
    path: 'perfil',
    title: 'Mi perfil',
    loadChildren: () => import('../features/students/routes/student-perfil.routes'),
  },
  {
    path: 'pagos',
    title: 'Pagos',
    loadChildren: () => import('../features/finance/routes/student-pagos.routes'),
  },
  {
    path: 'facturas',
    title: 'Facturas',
    loadChildren: () => import('../features/finance/routes/student-facturas.routes'),
  },
  {
    path: 'historial-ia',
    title: 'Historial IA',
    loadChildren: () => import('../features/communications/routes/student-historial-ia.routes'),
  },
  {
    path: '**',
    title: 'En construcción',
    loadComponent: () =>
      import('../features/errors/pages/coming-soon-page').then((m) => m.ComingSoonPage),
  },
] satisfies Routes;
