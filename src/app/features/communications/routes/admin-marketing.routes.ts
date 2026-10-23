import { Routes } from '@angular/router';

/** `/admin/marketing` — Marketing IA (admin). Propiedad del feature `communications`. */
export default [
  {
    path: '',
    loadComponent: () => import('../pages/marketing/marketing-page').then((m) => m.MarketingPage),
  },
  {
    path: 'generar/:type',
    title: 'Generador de contenido',
    loadComponent: () =>
      import('../pages/marketing/marketing-generator-page').then((m) => m.MarketingGeneratorPage),
  },
  {
    path: 'historial',
    title: 'Historial de marketing',
    loadComponent: () =>
      import('../pages/marketing/marketing-history-page').then((m) => m.MarketingHistoryPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
