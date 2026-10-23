import { Routes } from '@angular/router';

/** `/portal-estudiante/notas` — Notas por período (feature `academic`). */
export default [
  {
    path: '',
    loadComponent: () => import('../pages/student/my-grades-page').then((m) => m.MyGradesPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
