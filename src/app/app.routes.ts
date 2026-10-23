import { Routes } from '@angular/router';
import {
  APP_PATHS,
  authMatchGuard,
  guestGuard,
  homeRedirectGuard,
  portalGuard,
  tenantRouteGuard,
} from './core';
import { DEV_ROUTES } from './features/dev/dev.routes';

export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },
  {
    path: APP_PATHS.login,
    title: 'Iniciar sesión',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/pages/login/login-page').then((m) => m.LoginPage),
  },
  {
    path: APP_PATHS.admin,
    loadComponent: () => import('./core/layout/portal-shell').then((m) => m.PortalShell),
    data: { portal: 'admin' },
    canMatch: [authMatchGuard],
    canActivate: [portalGuard('admin')],
    loadChildren: () => import('./portals/admin.routes'),
  },
  {
    path: APP_PATHS.employeePortal,
    loadComponent: () => import('./core/layout/portal-shell').then((m) => m.PortalShell),
    data: { portal: 'employee' },
    canMatch: [authMatchGuard],
    canActivate: [portalGuard('employee')],
    loadChildren: () => import('./portals/employee.routes'),
  },
  {
    path: APP_PATHS.studentPortal,
    loadComponent: () => import('./core/layout/portal-shell').then((m) => m.PortalShell),
    data: { portal: 'student' },
    canMatch: [authMatchGuard],
    canActivate: [portalGuard('student')],
    loadChildren: () => import('./portals/student.routes'),
  },
  {
    path: APP_PATHS.forbidden,
    title: 'Acceso no autorizado',
    loadComponent: () =>
      import('./features/errors/pages/forbidden-page').then((m) => m.ForbiddenPage),
  },
  {
    path: APP_PATHS.notFound,
    title: 'No encontrado',
    loadComponent: () =>
      import('./features/errors/pages/not-found-page').then((m) => m.NotFoundPage),
  },
  // Verificación pública de certificados (QR / código impreso): sin sesión, solo X-Tenant.
  {
    path: APP_PATHS.verifyCertificate,
    title: 'Verificar certificado',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/students/pages/certificate-verify-page').then(
            (m) => m.CertificateVerifyPage,
          ),
      },
      {
        path: ':code',
        loadComponent: () =>
          import('./features/students/pages/certificate-verify-page').then(
            (m) => m.CertificateVerifyPage,
          ),
      },
    ],
  },
  ...DEV_ROUTES,
  // Tenant por ruta: /<slug> y /<slug>/login fijan el colegio y redirigen a /login.
  {
    path: ':tenant',
    canActivate: [tenantRouteGuard],
    children: [
      { path: '', children: [] },
      { path: APP_PATHS.login, children: [] },
    ],
  },
  {
    path: '**',
    title: 'No encontrado',
    loadComponent: () =>
      import('./features/errors/pages/not-found-page').then((m) => m.NotFoundPage),
  },
];
