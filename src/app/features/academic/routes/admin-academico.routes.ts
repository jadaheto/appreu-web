import { Routes } from '@angular/router';

/** `/admin/academico` — Gestión académica (feature `academic`). */
export default [
  {
    path: '',
    loadComponent: () =>
      import('../pages/admin/academic-dashboard-page').then((m) => m.AcademicDashboardPage),
  },
  {
    path: 'grados/:gradeId/materias',
    title: 'Plan de estudios',
    loadComponent: () => import('../pages/admin/curriculum-page').then((m) => m.CurriculumPage),
  },
  {
    path: 'salones/:classroomId/carga',
    title: 'Carga académica',
    loadComponent: () =>
      import('../pages/admin/teaching-load-page').then((m) => m.TeachingLoadPage),
  },
  {
    path: 'asistencia',
    title: 'Reporte de asistencia',
    loadComponent: () =>
      import('../pages/admin/attendance-report-page').then((m) => m.AttendanceReportPage),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
