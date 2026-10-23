import { Routes } from '@angular/router';

/** `/portal-estudiante/asistencia` — Calendario mensual de asistencia (feature `academic`). */
export default [
  {
    path: '',
    loadComponent: () =>
      import('../pages/student/my-attendance-page').then((m) => m.MyAttendancePage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
