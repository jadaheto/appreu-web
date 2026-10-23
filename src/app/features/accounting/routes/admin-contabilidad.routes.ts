import { Routes } from '@angular/router';

/**
 * `/admin/contabilidad` — Contabilidad (roles admin y finance; el guard lo pone el portal).
 * Propiedad del feature `accounting`.
 */
export default [
  {
    path: '',
    loadComponent: () =>
      import('../pages/accounting-shell-page').then((m) => m.AccountingShellPage),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Contabilidad',
        loadComponent: () =>
          import('../pages/dashboard/accounting-dashboard-page').then(
            (m) => m.AccountingDashboardPage,
          ),
      },
      {
        path: 'cuentas',
        title: 'Plan de cuentas',
        loadComponent: () =>
          import('../pages/accounts/chart-of-accounts-page').then((m) => m.ChartOfAccountsPage),
      },
      {
        path: 'terceros',
        title: 'Terceros',
        loadComponent: () =>
          import('../pages/third-parties/third-parties-page').then((m) => m.ThirdPartiesPage),
      },
      {
        path: 'periodos',
        title: 'Periodos contables',
        loadComponent: () => import('../pages/periods/periods-page').then((m) => m.PeriodsPage),
      },
      {
        path: 'asientos',
        title: 'Comprobantes',
        loadComponent: () =>
          import('../pages/entries/journal-entries-page').then((m) => m.JournalEntriesPage),
      },
      {
        path: 'asientos/nuevo',
        title: 'Nuevo comprobante',
        loadComponent: () =>
          import('../pages/entries/journal-entry-editor-page').then(
            (m) => m.JournalEntryEditorPage,
          ),
      },
      {
        path: 'asientos/:id/editar',
        title: 'Editar borrador',
        loadComponent: () =>
          import('../pages/entries/journal-entry-editor-page').then(
            (m) => m.JournalEntryEditorPage,
          ),
      },
      {
        path: 'asientos/:id',
        title: 'Comprobante',
        loadComponent: () =>
          import('../pages/entries/journal-entry-detail-page').then(
            (m) => m.JournalEntryDetailPage,
          ),
      },
      { path: 'reportes', pathMatch: 'full', redirectTo: 'reportes/balance-prueba' },
      {
        path: 'reportes/:tipo',
        title: 'Reportes contables',
        loadComponent: () => import('../pages/reports/reports-page').then((m) => m.ReportsPage),
      },
      {
        path: 'parametrizacion',
        title: 'Contabilización automática',
        loadComponent: () =>
          import('../pages/posting-rules/posting-rules-page').then((m) => m.PostingRulesPage),
      },
      {
        path: '**',
        loadComponent: () =>
          import('../../errors/pages/not-found-page').then((m) => m.NotFoundPage),
      },
    ],
  },
] satisfies Routes;
