import { Routes } from '@angular/router';

/** `/portal-estudiante/historial-ia` — Chat y historial propio de Apreu IA. Propiedad del feature `communications`. */
export default [
  {
    path: '',
    loadComponent: () => import('../pages/ai/ai-history-page').then((m) => m.AiHistoryPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
