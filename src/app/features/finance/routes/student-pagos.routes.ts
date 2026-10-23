import { Routes } from '@angular/router';
import { PortalStudentContext } from '../components/portal-student-context';

/** `/portal-estudiante/pagos` — Pagos. Propiedad del feature `finance`. */
export default [
  {
    path: '',
    providers: [PortalStudentContext],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('../pages/portal/portal-payments-page').then((m) => m.PortalPaymentsPage),
      },
      {
        path: 'recibos/:receiptNumber',
        title: 'Recibo de caja',
        data: { back: '/portal-estudiante/pagos' },
        loadComponent: () => import('../pages/print/print-pages').then((m) => m.ReceiptPrintPage),
      },
      {
        path: 'cobros/:chargeId/documento',
        title: 'Cuenta de cobro',
        data: { back: '/portal-estudiante/pagos' },
        loadComponent: () => import('../pages/print/print-pages').then((m) => m.ChargePrintPage),
      },
      {
        path: '**',
        loadComponent: () =>
          import('../../errors/pages/not-found-page').then((m) => m.NotFoundPage),
      },
    ],
  },
] satisfies Routes;
