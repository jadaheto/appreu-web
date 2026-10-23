import { Routes } from '@angular/router';

/** `/admin/rrhh` — Capital humano: directorio, ficha, alta/edición y permisos. */
export default [
  {
    path: '',
    loadComponent: () => import('../pages/rrhh/employees-page').then((m) => m.EmployeesPage),
  },
  {
    path: 'permisos',
    title: 'Permisos y licencias',
    loadComponent: () => import('../pages/rrhh/leaves-page').then((m) => m.LeavesPage),
  },
  {
    path: 'empleados/nuevo',
    title: 'Nuevo empleado',
    loadComponent: () => import('../pages/rrhh/employee-form-page').then((m) => m.EmployeeFormPage),
  },
  {
    path: 'empleados/:id',
    title: 'Ficha del empleado',
    loadComponent: () =>
      import('../pages/rrhh/employee-detail-page').then((m) => m.EmployeeDetailPage),
  },
  {
    path: 'empleados/:id/editar',
    title: 'Editar empleado',
    loadComponent: () => import('../pages/rrhh/employee-form-page').then((m) => m.EmployeeFormPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
