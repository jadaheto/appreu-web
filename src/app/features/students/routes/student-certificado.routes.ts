import { Routes } from '@angular/router';

/**
 * `/portal-estudiante/certificado` — Certificado estudiantil. Propiedad del feature `students`.
 * Estado/solicitud y vista imprimible `:certificateId` (la API valida la propiedad).
 */
export default [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('../pages/portal/my-certificates-page').then((m) => m.MyCertificatesPage),
  },
  {
    path: ':certificateId',
    title: 'Certificado de estudio',
    loadComponent: () =>
      import('../pages/certificate-print-page').then((m) => m.CertificatePrintPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
