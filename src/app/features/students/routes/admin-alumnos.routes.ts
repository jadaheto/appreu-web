import { Routes } from '@angular/router';

/**
 * `/admin/alumnos` — Alumnos. Propiedad del feature `students`.
 * Directorio, matrícula, ficha 360, certificado imprimible y verificación.
 */
export default [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('../pages/admin/students-list-page').then((m) => m.StudentsListPage),
  },
  {
    path: 'nuevo',
    title: 'Nueva matrícula',
    loadComponent: () =>
      import('../pages/admin/student-enroll-page').then((m) => m.StudentEnrollPage),
  },
  {
    path: 'verificar',
    title: 'Verificar certificado',
    loadComponent: () =>
      import('../pages/certificate-verify-page').then((m) => m.CertificateVerifyPage),
  },
  {
    path: 'verificar/:code',
    title: 'Verificar certificado',
    loadComponent: () =>
      import('../pages/certificate-verify-page').then((m) => m.CertificateVerifyPage),
  },
  {
    path: 'certificados/:certificateId',
    title: 'Certificado de estudio',
    loadComponent: () =>
      import('../pages/certificate-print-page').then((m) => m.CertificatePrintPage),
  },
  {
    path: ':id',
    title: 'Ficha del alumno',
    loadComponent: () =>
      import('../pages/admin/student-detail-page').then((m) => m.StudentDetailPage),
  },
  {
    path: '**',
    redirectTo: '',
  },
] satisfies Routes;
