import { Routes } from '@angular/router';

/** `/admin/usuarios` — Usuarios (admin). Propiedad del feature `administration`. */
export default [
  {
    path: '',
    loadComponent: () => import('../pages/users/users-page').then((m) => m.UsersPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
