import { Routes } from '@angular/router';

/** `/portal-empleado/certificados` — Certificado laboral y de ingresos. */
export default [
  {
    path: '',
    loadComponent: () =>
      import('../pages/portal/my-certificates-page').then((m) => m.MyCertificatesPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
