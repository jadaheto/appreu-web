import { Routes } from '@angular/router';

/**
 * `/admin/incidencias` — Incidencias. Propiedad del feature `students`.
 * Bandeja con KPIs y filtros, registro de solicitudes, detalle y revisión.
 */
export default [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('../pages/admin/incidents/incidents-inbox-page').then((m) => m.IncidentsInboxPage),
  },
  {
    path: ':id',
    title: 'Detalle de incidencia',
    loadComponent: () =>
      import('../pages/admin/incidents/incident-detail-page').then((m) => m.IncidentDetailPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
