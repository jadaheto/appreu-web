import { Routes } from '@angular/router';

/**
 * `/admin/facturacion` — Facturación electrónica DIAN. Propiedad del feature `e-invoicing`.
 * Pestañas: documentos (KPIs + listado), emisión manual, emisor y numeración,
 * habilitación (set de pruebas) y diagnóstico (certificado, chequeos, reenvíos).
 */
export default [
  {
    path: '',
    loadComponent: () =>
      import('../pages/e-invoicing-shell-page').then((m) => m.EInvoicingShellPage),
    children: [
      {
        path: '',
        title: 'Facturación electrónica',
        loadComponent: () =>
          import('../pages/documents/documents-page').then((m) => m.DocumentsPage),
      },
      {
        path: 'documentos/:id',
        title: 'Documento electrónico',
        loadComponent: () =>
          import('../pages/document-detail/document-detail-page').then((m) => m.DocumentDetailPage),
      },
      {
        path: 'nueva',
        title: 'Emitir factura electrónica',
        loadComponent: () =>
          import('../pages/issue-invoice/issue-invoice-page').then((m) => m.IssueInvoicePage),
      },
      {
        path: 'configuracion',
        title: 'Emisor y numeración DIAN',
        loadComponent: () =>
          import('../pages/configuration/configuration-page').then((m) => m.ConfigurationPage),
      },
      {
        path: 'habilitacion',
        title: 'Habilitación DIAN',
        loadComponent: () =>
          import('../pages/habilitation/habilitation-page').then((m) => m.HabilitationPage),
      },
      {
        path: 'diagnostico',
        title: 'Diagnóstico DIAN',
        loadComponent: () =>
          import('../pages/diagnostics/diagnostics-page').then((m) => m.DiagnosticsPage),
      },
      { path: '**', redirectTo: '' },
    ],
  },
] satisfies Routes;
