import { Routes } from '@angular/router';

/** `/portal-empleado/calificaciones` — Planilla de notas del docente (feature `academic`). */
export default [
  {
    path: '',
    loadComponent: () => import('../pages/employee/grade-entry-page').then((m) => m.GradeEntryPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
