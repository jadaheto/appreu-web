import { Routes } from '@angular/router';

/** `/admin/auditoria` — Registro de accesos (admin). Propiedad del feature `administration`. */
export default [
  {
    path: '',
    loadComponent: () => import('../pages/audit/audit-page').then((m) => m.AuditPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
