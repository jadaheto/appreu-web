import { Routes } from '@angular/router';

/** `/portal-empleado/stickers` — Bandeja de stickers del empleado. */
export default [
  {
    path: '',
    data: { mode: 'employee' },
    loadComponent: () => import('../pages/stickers/stickers-page').then((m) => m.StickersPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
