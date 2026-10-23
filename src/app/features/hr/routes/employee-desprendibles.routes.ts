import { Routes } from '@angular/router';

/**
 * `/portal-empleado/desprendibles` — Mis desprendibles e imprimible.
 * `mis-datos` vive ahora en `/portal-empleado/mis-datos` (menú "Mis datos");
 * la ruta antigua redirige allí.
 */
export default [
  {
    path: '',
    loadComponent: () => import('../pages/portal/my-payslips-page').then((m) => m.MyPayslipsPage),
  },
  { path: 'mis-datos', redirectTo: '/portal-empleado/mis-datos' },
  {
    path: ':id',
    title: 'Desprendible de pago',
    data: { scope: 'me' },
    loadComponent: () => import('../pages/payslip-page').then((m) => m.PayslipPage),
  },
] satisfies Routes;
