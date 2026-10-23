import { Routes } from '@angular/router';

/**
 * `/admin/configuracion` — Configuración (admin, finanzas, RR. HH.). Propiedad del feature
 * `administration`. Cada rol ve las pestañas que la API le permite editar; `?tab=<sección>`
 * abre una pestaña concreta.
 */
export default [
  {
    path: '',
    loadComponent: () => import('../pages/settings/settings-page').then((m) => m.SettingsPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
