import { Routes } from '@angular/router';
import { PortalStudentContext } from '../components/portal-student-context';

/**
 * `/portal-estudiante/facturas` — Facturas. Propiedad del feature `finance`.
 * La API no expone facturas electrónicas al portal: se muestran cuentas de cobro y recibos.
 */
export default [
  {
    path: '',
    providers: [PortalStudentContext],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('../pages/portal/portal-invoices-page').then((m) => m.PortalInvoicesPage),
      },
      {
        path: 'recibos/:receiptNumber',
        title: 'Recibo de caja',
        data: { back: '/portal-estudiante/facturas' },
        loadComponent: () => import('../pages/print/print-pages').then((m) => m.ReceiptPrintPage),
      },
      {
        path: 'cobros/:chargeId/documento',
        title: 'Cuenta de cobro',
        data: { back: '/portal-estudiante/facturas' },
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
