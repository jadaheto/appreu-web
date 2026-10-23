import { Routes } from '@angular/router';

/** `/admin/stickers` — Gestión de stickers (admin/RR. HH.). */
export default [
  {
    path: '',
    data: { mode: 'admin' },
    loadComponent: () => import('../pages/stickers/stickers-page').then((m) => m.StickersPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
