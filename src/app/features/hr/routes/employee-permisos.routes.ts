import { Routes } from '@angular/router';

/** `/portal-empleado/permisos` — Mis solicitudes de permiso. */
export default [
  {
    path: '',
    loadComponent: () => import('../pages/portal/my-leaves-page').then((m) => m.MyLeavesPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
