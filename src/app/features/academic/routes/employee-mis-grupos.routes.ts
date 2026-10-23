import { Routes } from '@angular/router';

/** `/portal-empleado/mis-grupos` — Panel y boletines del director de grupo (feature `academic`). */
export default [
  {
    path: '',
    loadComponent: () => import('../pages/employee/my-groups-page').then((m) => m.MyGroupsPage),
  },
  {
    path: 'boletin/:studentId/:periodId',
    title: 'Boletín',
    data: { backLink: '/portal-empleado/mis-grupos', backLabel: 'Volver a mis grupos' },
    loadComponent: () => import('../pages/report-card-page').then((m) => m.ReportCardPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
