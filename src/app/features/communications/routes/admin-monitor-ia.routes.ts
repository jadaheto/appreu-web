import { Routes } from '@angular/router';

/** `/admin/monitor-ia` — Monitor de IA (admin). Propiedad del feature `communications`. */
export default [
  {
    path: '',
    loadComponent: () => import('../pages/ai/ai-monitor-page').then((m) => m.AiMonitorPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
