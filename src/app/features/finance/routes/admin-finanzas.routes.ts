import { Routes } from '@angular/router';

/** `/admin/finanzas` — Finanzas y caja. Propiedad del feature `finance`. */
export default [
  {
    path: 'recibos/:receiptNumber',
    title: 'Recibo de caja',
    data: { back: '/admin/finanzas/pagos' },
    loadComponent: () => import('../pages/print/print-pages').then((m) => m.ReceiptPrintPage),
  },
  {
    path: 'cobros/:chargeId/documento',
    title: 'Cuenta de cobro',
    data: { back: '/admin/finanzas/cobros' },
    loadComponent: () => import('../pages/print/print-pages').then((m) => m.ChargePrintPage),
  },
  {
    path: '',
    loadComponent: () => import('../pages/finance-shell-page').then((m) => m.FinanceShellPage),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Dashboard financiero',
        loadComponent: () =>
          import('../pages/dashboard/finance-dashboard-page').then((m) => m.FinanceDashboardPage),
      },
      {
        path: 'caja',
        title: 'Caja',
        loadComponent: () => import('../pages/cashier/cashier-page').then((m) => m.CashierPage),
      },
      {
        path: 'cobros',
        title: 'Cobros',
        loadComponent: () => import('../pages/charges/charges-page').then((m) => m.ChargesPage),
      },
      {
        path: 'pagos',
        title: 'Pagos',
        loadComponent: () => import('../pages/payments/payments-page').then((m) => m.PaymentsPage),
      },
      {
        path: 'cartera',
        title: 'Control de cartera',
        loadComponent: () => import('../pages/aging/aging-page').then((m) => m.AgingPage),
      },
      {
        path: 'estado-cuenta',
        title: 'Estado de cuenta',
        loadComponent: () =>
          import('../pages/account-statement/account-statement-page').then(
            (m) => m.AccountStatementPage,
          ),
      },
      {
        path: 'gastos',
        title: 'Gastos',
        loadComponent: () => import('../pages/expenses/expenses-page').then((m) => m.ExpensesPage),
      },
      {
        path: 'conciliacion',
        title: 'Conciliación bancaria',
        loadComponent: () =>
          import('../pages/reconciliation/reconciliation-page').then((m) => m.ReconciliationPage),
      },
      {
        path: 'archivos-bancarios',
        title: 'Archivos bancarios',
        loadComponent: () =>
          import('../pages/bank-files/bank-files-page').then((m) => m.BankFilesPage),
      },
      {
        path: 'conceptos',
        title: 'Conceptos y tarifas',
        loadComponent: () => import('../pages/concepts/concepts-page').then((m) => m.ConceptsPage),
      },
      {
        path: '**',
        loadComponent: () =>
          import('../../errors/pages/not-found-page').then((m) => m.NotFoundPage),
      },
    ],
  },
] satisfies Routes;
