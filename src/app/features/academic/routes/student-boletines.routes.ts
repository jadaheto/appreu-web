import { Routes } from '@angular/router';

/** `/portal-estudiante/boletines` — Historial y vista imprimible de boletines (feature `academic`). */
export default [
  {
    path: '',
    loadComponent: () =>
      import('../pages/student/my-report-cards-page').then((m) => m.MyReportCardsPage),
  },
  {
    path: ':studentId/:periodId',
    title: 'Boletín',
    data: { backLink: '/portal-estudiante/boletines', backLabel: 'Mis boletines' },
    loadComponent: () => import('../pages/report-card-page').then((m) => m.ReportCardPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
