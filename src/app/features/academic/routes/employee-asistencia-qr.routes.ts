import { Routes } from '@angular/router';

/** `/portal-empleado/asistencia-qr` — Asistencia por QR y manual (feature `academic`). */
export default [
  {
    path: '',
    loadComponent: () =>
      import('../pages/employee/qr-attendance-page').then((m) => m.QrAttendancePage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
