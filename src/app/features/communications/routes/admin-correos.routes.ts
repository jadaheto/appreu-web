import { Routes } from '@angular/router';
import { roleGuard } from '../../../core';

/**
 * `/admin/correos` — Correos (admin, finanzas, RR. HH.). Propiedad del feature `communications`.
 * Los avisos de cobro son de admin/finanzas y las herramientas (SMTP, imágenes) solo de admin.
 */
export default [
  {
    path: '',
    loadComponent: () =>
      import('../pages/email/email-dashboard-page').then((m) => m.EmailDashboardPage),
  },
  {
    path: 'redactar',
    title: 'Redactar aviso',
    loadComponent: () =>
      import('../pages/email/compose-notice-page').then((m) => m.ComposeNoticePage),
  },
  {
    path: 'cobros',
    title: 'Avisos de cobro',
    canActivate: [roleGuard('admin', 'finance')],
    loadComponent: () =>
      import('../pages/email/billing-notices-page').then((m) => m.BillingNoticesPage),
  },
  {
    path: 'herramientas',
    title: 'Herramientas de correo',
    canActivate: [roleGuard('admin')],
    loadComponent: () => import('../pages/email/email-tools-page').then((m) => m.EmailToolsPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
