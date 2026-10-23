import { Routes } from '@angular/router';

/** `/admin/nomina` — Nómina: períodos, parámetros, detalle de liquidación y desprendibles. */
export default [
  {
    path: '',
    loadComponent: () => import('../pages/nomina/payroll-page').then((m) => m.PayrollPage),
  },
  {
    path: 'parametros',
    title: 'Parámetros de nómina',
    loadComponent: () =>
      import('../pages/nomina/payroll-parameters-page').then((m) => m.PayrollParametersPage),
  },
  {
    path: 'periodos/:id',
    title: 'Período de nómina',
    loadComponent: () =>
      import('../pages/nomina/payroll-period-page').then((m) => m.PayrollPeriodPage),
  },
  {
    path: 'desprendibles/:id',
    title: 'Desprendible de pago',
    data: { scope: 'admin' },
    loadComponent: () => import('../pages/payslip-page').then((m) => m.PayslipPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
