import { Routes } from '@angular/router';

/** `/portal-estudiante/perfil` — Mi perfil (solo lectura). Propiedad del feature `students`. */
export default [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('../pages/portal/my-profile-page').then((m) => m.MyProfilePage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
