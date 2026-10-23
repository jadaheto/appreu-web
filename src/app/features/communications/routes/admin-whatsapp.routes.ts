import { Routes } from '@angular/router';

/**
 * `/admin/whatsapp` — WhatsApp (admin, finanzas, RR. HH.). Propiedad del feature `communications`.
 * Las plantillas se consultan con cualquiera de esos roles; solo admin las crea/edita/elimina.
 */
export default [
  {
    path: '',
    loadComponent: () => import('../pages/whatsapp/whatsapp-page').then((m) => m.WhatsAppPage),
  },
  {
    path: 'plantillas',
    title: 'Plantillas de WhatsApp',
    loadComponent: () =>
      import('../pages/whatsapp/templates-page').then((m) => m.WhatsAppTemplatesPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
