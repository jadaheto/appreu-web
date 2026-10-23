import { Routes } from '@angular/router';

/** `/portal-estudiante/incidencias` — Mis incidencias. Propiedad del feature `students`. */
export default [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('../pages/portal/my-incidents-page').then((m) => m.MyIncidentsPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
