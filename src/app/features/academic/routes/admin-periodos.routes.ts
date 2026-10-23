import { Routes } from '@angular/router';

/** `/admin/periodos` — Períodos académicos y generación de boletines (feature `academic`). */
export default [
  {
    path: '',
    loadComponent: () => import('../pages/admin/periods-page').then((m) => m.PeriodsPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
