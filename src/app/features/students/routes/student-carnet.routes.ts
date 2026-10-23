import { Routes } from '@angular/router';

/** `/portal-estudiante/carnet` — Carnet digital imprimible con QR. Propiedad del feature `students`. */
export default [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('../pages/portal/my-id-card-page').then((m) => m.MyIdCardPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
