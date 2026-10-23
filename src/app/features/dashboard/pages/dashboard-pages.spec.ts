import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthUser, SessionStore } from '../../../core';
import { makeUser, provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import type { AdminDashboard } from '../data-access/dashboard.models';
import { AdminDashboardPage } from './admin-dashboard-page';
import { EmployeeDashboardPage } from './employee-dashboard-page';
import { formatTenure } from './portal-dashboard.base';
import { StudentDashboardPage } from './student-dashboard-page';

const FINANCE = {
  todayRevenue: { amount: 2_450_000, payments: 12 },
  overdue: { amount: 1_000_000, debtors: 5 },
  averageTicket: { amount: 350_000, month: '2026-10' },
  monthlyRevenue: [
    { month: '2026-09', label: 'sep', amount: 10 },
    { month: '2026-10', label: 'oct', amount: 20 },
  ],
  recentPayments: [
    {
      paymentId: 1,
      receiptNumber: 'R-001',
      amount: 50_000,
      method: 'nequi',
      paidAt: '2026-10-16 09:30:00',
      studentId: 3,
      studentName: 'Luis Gómez',
      studentCode: 'E-3',
    },
  ],
  topDebtors: [
    {
      studentId: 4,
      studentName: 'Sara Ruiz',
      studentCode: 'E-4',
      gradeName: 'Quinto',
      balance: 900_000,
      oldestDueDate: '2026-06-01',
      daysOverdue: 120,
      risk: 'critical' as const,
    },
  ],
};

function adminBody(overrides: Partial<AdminDashboard> = {}): AdminDashboard {
  return {
    today: '2026-10-16',
    academicYear: 2026,
    students: { active: 400, total: 420, byLevel: [{ level: 'primaria', total: 200 }] },
    finance: FINANCE,
    staff: { activeEmployees: 35 },
    incidents: { pending: 2 },
    ...overrides,
  };
}

describe('páginas de inicio', () => {
  let http: HttpTestingController;

  function setup<T>(cmp: new () => T, user: Partial<AuthUser>) {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestHttp() });
    TestBed.inject(SessionStore).set({
      token: 't',
      expiresAt: Date.now() + 60_000,
      tenant: null,
      user: makeUser(user),
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(cmp);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, settle: () => settle(fixture) };
  }

  /**
   * Deja correr microtareas y efectos (los `rxResource` disparan su petición en
   * un efecto) sin esperar a que terminen las peticiones pendientes: con
   * `whenStable()` la prueba se colgaría mientras haya un GET sin responder.
   */
  async function settle(fixture: ComponentFixture<unknown>) {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r));
    }
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  it('admin: pinta KPIs financieros, gráficas y tablas', async () => {
    const { el, settle } = setup(AdminDashboardPage, { name: 'Ana Pérez' });
    http.expectOne(`${TEST_API}/dashboard/admin`).flush(adminBody());
    await settle();
    expect(el.querySelector('h1')?.textContent).toContain('Hola, Ana');
    expect(el.querySelector('ui-alert')).toBeNull();
    expect(el.querySelector('ui-stat-card .value')?.textContent).toContain('2.450.000');
    expect(el.querySelector('ui-bar-chart')).not.toBeNull();
    expect(el.querySelector('ui-donut-chart')).not.toBeNull();
    expect(el.textContent).toContain('R-001');
    expect(el.textContent).toContain('Crítico');
  });

  it('admin: RR. HH. (sin finanzas) ve alumnos, personal e incidencias', async () => {
    const { el, settle } = setup(AdminDashboardPage, { role: 'hr' });
    http.expectOne(`${TEST_API}/dashboard/admin`).flush(adminBody({ finance: null }));
    await settle();
    const labels = Array.from(el.querySelectorAll('ui-stat-card .label')).map((l) => l.textContent);
    expect(labels).not.toContain('Ingresos hoy');
    expect(labels).toContain('Alumnos activos');
    expect(labels).toContain('Empleados activos');
    expect(labels).toContain('Incidencias pendientes');
    expect(el.querySelector('ui-bar-chart')).toBeNull();
  });

  it('admin: muestra el error de la API con opción de reintentar', async () => {
    const { el, settle } = setup(AdminDashboardPage, {});
    http
      .expectOne(`${TEST_API}/dashboard/admin`)
      .flush({ message: 'Fallo' }, { status: 500, statusText: 'Error' });
    await settle();
    expect(el.querySelector('ui-alert')?.textContent).toContain('Fallo');
  });

  it('empleado: KPIs de /me/employee/dashboard y accesos rápidos', async () => {
    const { el, settle } = setup(EmployeeDashboardPage, { role: 'teacher', portal: 'employee' });
    http.expectOne(`${TEST_API}/me/employee/dashboard`).flush({
      employee: {
        id: 1,
        code: 'EMP-1',
        fullName: 'Ana',
        email: null,
        position: 'Docente',
        department: null,
        hireDate: null,
        status: 'active',
      },
      monthsEmployed: 27,
      lastPayslip: {
        paymentId: 9,
        periodName: 'Oct',
        periodLabel: 'Octubre 2026',
        paymentDate: null,
        gross: 1,
        totalDeductions: 0,
        net: 1_500_000,
        status: 'paid',
      },
      pendingLeaves: 1,
      approvedLeavesThisYear: 2,
      absenceDaysThisYear: 3,
    });
    await settle();
    const values = Array.from(el.querySelectorAll('ui-stat-card .value')).map((v) => v.textContent);
    expect(values[0]).toContain('1.500.000');
    expect(values[1]).toContain('2 años y 3 meses');
    const shortcuts = Array.from(el.querySelectorAll('a.shortcut')).map((a) =>
      a.getAttribute('href'),
    );
    expect(shortcuts).toContain('/portal-empleado/calificaciones');
    expect(shortcuts).not.toContain('/portal-empleado');
  });

  it('empleado: aviso si el usuario no tiene ficha (404)', async () => {
    const { el, settle } = setup(EmployeeDashboardPage, { role: 'employee', portal: 'employee' });
    http
      .expectOne(`${TEST_API}/me/employee/dashboard`)
      .flush({ message: 'No encontrado' }, { status: 404, statusText: 'NF' });
    await settle();
    expect(el.querySelector('ui-alert')?.textContent).toContain('Sin ficha de empleado');
    expect(el.querySelectorAll('ui-stat-card').length).toBe(0);
  });

  it('estudiante: compone contexto + dashboard del estudiante y permite cambiar de hijo', async () => {
    const { el, settle } = setup(StudentDashboardPage, { role: 'parent', portal: 'student' });
    const student = (id: number, name: string) => ({
      id,
      code: `E-${id}`,
      fullName: name,
      firstName: name,
      lastName: '',
      initials: 'X',
      status: 'active',
      placement: {
        classroomId: 1,
        classroomName: '5A',
        gradeId: 1,
        gradeName: 'Quinto',
        gradeLevel: 'primaria',
        academicYear: 2026,
      },
    });
    http.expectOne(`${TEST_API}/portal/context`).flush({
      role: 'parent',
      students: [student(7, 'Luis'), student(8, 'Marta')],
    });
    await settle();
    http.expectOne(`${TEST_API}/portal/students/7/dashboard`).flush({
      student: student(7, 'Luis'),
      finance: { charged: 100, paid: 0, balance: 250_000, overdueCount: 1 },
      performance: { academicYear: 2026, average: 4.2, percentage: 84, recordCount: 10 },
      recentIncidents: [
        { id: 1, type: 'x', priority: 'low', title: 'Retardo', status: 'pending', createdAt: null },
      ],
    });
    await settle();
    expect(el.querySelector('ui-stat-card .value')?.textContent).toContain('250.000');
    expect(el.textContent).toContain('4.2');
    expect(el.textContent).toContain('Retardo');

    const chips = Array.from(el.querySelectorAll('button.ui-chip')) as HTMLButtonElement[];
    expect(chips.length).toBe(2);
    chips[1].click();
    await settle();
    http
      .expectOne(`${TEST_API}/portal/students/8/dashboard`)
      .flush({}, { status: 403, statusText: 'F' });
    await settle();

    const shortcuts = Array.from(el.querySelectorAll('a.shortcut')).map((a) =>
      a.getAttribute('href'),
    );
    expect(shortcuts).toContain('/portal-estudiante/pagos');
    expect(shortcuts).not.toContain('/portal-estudiante/historial-ia');
  });

  it('estudiante: aviso si la cuenta no tiene estudiantes vinculados', async () => {
    const { el, settle } = setup(StudentDashboardPage, { role: 'student', portal: 'student' });
    http.expectOne(`${TEST_API}/portal/context`).flush({ role: 'student', students: [] });
    await settle();
    expect(el.querySelector('ui-alert')?.textContent).toContain('sin estudiantes vinculados');
  });

  it('formatTenure', () => {
    expect(formatTenure(0)).toBe('Menos de un mes');
    expect(formatTenure(1)).toBe('1 mes');
    expect(formatTenure(12)).toBe('1 año');
    expect(formatTenure(27)).toBe('2 años y 3 meses');
  });
});
