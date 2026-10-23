import { HttpTestingController } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthUser, ConfirmService, SessionStore } from '../../../core';
import { makeUser, provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import { AttendanceCalendar } from '../components/attendance-calendar';
import { todayIso } from '../data-access/academic.labels';
import type {
  AcademicDashboard,
  AcademicPeriod,
  GradeSheet,
  ReportCardDocument,
} from '../data-access/academic.models';
import { AcademicDashboardPage } from './admin/academic-dashboard-page';
import { PeriodsPage } from './admin/periods-page';
import { GradeEntryPage } from './employee/grade-entry-page';
import { MyGroupsPage } from './employee/my-groups-page';
import { QrAttendancePage } from './employee/qr-attendance-page';
import { ReportCardPage } from './report-card-page';
import { MyAttendancePage } from './student/my-attendance-page';
import { MyGradesPage } from './student/my-grades-page';

const period = (over: Partial<AcademicPeriod> = {}): AcademicPeriod => ({
  id: 1,
  name: 'Primer Período',
  academicYear: 2026,
  startDate: '2026-02-01',
  endDate: '2026-04-15',
  status: 'open',
  closedAt: null,
  acceptsGrades: true,
  ...over,
});

const dashboard: AcademicDashboard = {
  academicYear: 2026,
  totals: { grades: 2, classrooms: 1, teachingAssignments: 5 },
  grades: [
    {
      id: 1,
      name: 'Primero',
      level: 'primaria',
      subjectsCount: 6,
      classroomsCount: 1,
      studentsCount: 30,
    },
    {
      id: 2,
      name: 'Sexto',
      level: 'secundaria',
      subjectsCount: 0,
      classroomsCount: 0,
      studentsCount: 0,
    },
  ],
  classrooms: [
    {
      id: 10,
      name: '1A',
      gradeId: 1,
      gradeName: 'Primero',
      gradeLevel: 'primaria',
      capacity: 30,
      academicYear: 2026,
      studentsCount: 30,
      isFull: true,
      director: null,
    },
  ],
};

const sheet = (editable = true): GradeSheet => ({
  classroom: { id: 10, name: '1A', academicYear: 2026 },
  subject: { id: 20, name: 'Matemáticas' },
  period: { id: 1, name: 'Primer Período', status: editable ? 'open' : 'closed' },
  editable,
  weights: { cognitive: 60, procedural: 30, attitudinal: 10 },
  rows: [
    {
      studentId: 100,
      code: 'E100',
      fullName: 'PÉREZ ANA',
      cognitive: 4,
      procedural: 4,
      attitudinal: 5,
      finalScore: 4.1,
      passing: true,
      performance: { level: 'alto', label: 'Alto' },
      observations: null,
    },
    {
      studentId: 101,
      code: 'E101',
      fullName: 'GÓMEZ LUIS',
      cognitive: null,
      procedural: null,
      attitudinal: null,
      finalScore: null,
      passing: null,
      performance: null,
      observations: null,
    },
  ],
});

describe('páginas del contexto académico', () => {
  let http: HttpTestingController;

  function setup<T>(
    cmp: Type<T>,
    user: Partial<AuthUser> = {},
    providers: unknown[] = [],
    inputs: Record<string, unknown> = {},
  ): { fixture: ComponentFixture<T>; el: HTMLElement } {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [...provideTestHttp(), ...(providers as never[])],
    });
    TestBed.inject(SessionStore).set({
      token: 't',
      expiresAt: Date.now() + 60_000,
      tenant: null,
      user: makeUser(user),
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(cmp);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  /**
   * Deja correr efectos y microtareas (los `rxResource` disparan sus peticiones en un
   * efecto) sin esperar a que terminen las peticiones pendientes: `whenStable()` se
   * colgaría mientras haya una petición HTTP sin responder.
   */
  async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r));
    }
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  it('gestión académica: KPIs, grados y salones llenos', async () => {
    const { fixture, el } = setup(AcademicDashboardPage);
    http.expectOne(`${TEST_API}/academic/dashboard`).flush(dashboard);
    await settle(fixture);
    expect(el.querySelector('h1')?.textContent).toContain('2026');
    expect(el.querySelectorAll('ui-stat-card').length).toBe(4);
    expect(el.textContent).toContain('Primero');
    expect(el.textContent).toContain('Primaria');

    el.querySelectorAll<HTMLButtonElement>('[role=tab]')[1].click();
    await settle(fixture);
    expect(el.textContent).toContain('1A');
    expect(el.textContent).toContain('Sin asignar');
    expect(el.textContent).toContain('Lleno');
  });

  it('gestión académica: crea un grado validando el formulario', async () => {
    const { fixture, el } = setup(AcademicDashboardPage);
    http.expectOne(`${TEST_API}/academic/dashboard`).flush(dashboard);
    await settle(fixture);
    const newGrade = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Nuevo grado'),
    )!;
    newGrade.click();
    await settle(fixture);
    const form = document.querySelector<HTMLFormElement>('#grade-form')!;
    form.dispatchEvent(new Event('submit'));
    await settle(fixture);
    http.expectNone(`${TEST_API}/academic/grades`);
    expect(document.body.textContent).toContain('Este campo es obligatorio.');

    const input = form.querySelector<HTMLInputElement>('input')!;
    input.value = 'Transición';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    const req = http.expectOne(`${TEST_API}/academic/grades`);
    expect(req.request.body).toEqual({ name: 'Transición', level: 'primaria' });
    req.flush({ id: 3, name: 'Transición', level: 'primaria' });
    await settle(fixture);
    http.expectOne(`${TEST_API}/academic/dashboard`).flush(dashboard);
    await settle(fixture);
  });

  it('períodos: estados, cierre con confirmación y generación de boletines', async () => {
    const { fixture, el } = setup(PeriodsPage);
    http
      .expectOne(`${TEST_API}/academic/periods`)
      .flush([
        period(),
        period({ id: 2, name: 'Segundo Período', status: 'closed', acceptsGrades: false }),
      ]);
    await settle(fixture);
    expect(el.textContent).toContain('Abierto');
    expect(el.textContent).toContain('Esperando cierre');

    const confirm = TestBed.inject(ConfirmService);
    const generate = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Generar ahora'),
    )!;
    generate.click();
    await settle(fixture);
    expect(confirm.state()?.title).toContain('Segundo Período');
    confirm.respond(true);
    await settle(fixture);
    http
      .expectOne(`${TEST_API}/academic/periods/2/report-cards`)
      .flush({ periodId: 2, generated: 28 });
    await settle(fixture);
    http.expectOne(`${TEST_API}/academic/periods`).flush([
      period(),
      period({
        id: 2,
        name: 'Segundo Período',
        status: 'bulletins_generated',
        acceptsGrades: false,
      }),
    ]);
    await settle(fixture);
    expect(el.textContent).toContain('Se generaron 28 boletines');
    expect(el.textContent).toContain('Generados');
  });

  it('calificaciones: guarda solo las filas con notas y recarga la definitiva', async () => {
    const params = new BehaviorSubject(convertToParamMap({ classroomId: '10', subjectId: '20' }));
    const { fixture, el } = setup(GradeEntryPage, { role: 'teacher', portal: 'employee' }, [
      { provide: ActivatedRoute, useValue: { queryParamMap: params.asObservable() } },
    ]);
    http.expectOne(`${TEST_API}/academic/me/assignments`).flush([
      {
        assignmentId: 1,
        academicYear: 2026,
        classroom: { id: 10, name: '1A', gradeName: 'Primero' },
        subject: { id: 20, name: 'Matemáticas', area: null, hoursPerWeek: 4 },
        studentsCount: 2,
      },
    ]);
    http.expectOne(`${TEST_API}/academic/periods`).flush([period()]);
    http
      .expectOne((r) => r.url === `${TEST_API}/academic/grade-sheets` && r.method === 'GET')
      .flush(sheet());
    await settle(fixture);
    expect(el.textContent).toContain('PÉREZ ANA');
    expect(el.textContent).toContain('4.1');

    const inputs = el.querySelectorAll<HTMLInputElement>('input.cell[type=number]');
    expect(inputs.length).toBe(6);
    inputs[3].value = '7';
    inputs[3].dispatchEvent(new Event('input'));
    await settle(fixture);
    const save = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Guardar todas'),
    )!;
    expect(save.disabled).toBe(true);

    inputs[3].value = '3.5';
    inputs[3].dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(el.textContent).toContain('1 sin guardar');
    save.click();
    const req = http.expectOne(
      (r) => r.url === `${TEST_API}/academic/grade-sheets` && r.method === 'PUT',
    );
    expect(req.request.body.periodId).toBe(1);
    expect(req.request.body.entries).toEqual([
      { studentId: 100, cognitive: 4, procedural: 4, attitudinal: 5, observations: null },
      { studentId: 101, cognitive: 3.5, procedural: null, attitudinal: null, observations: null },
    ]);
    req.flush({ saved: 2 });
    await settle(fixture);
    http
      .expectOne((r) => r.url === `${TEST_API}/academic/grade-sheets` && r.method === 'GET')
      .flush(sheet());
    await settle(fixture);
  });

  it('calificaciones: período cerrado en solo lectura', async () => {
    const params = new BehaviorSubject(
      convertToParamMap({ classroomId: '10', subjectId: '20', periodId: '1' }),
    );
    const { fixture, el } = setup(GradeEntryPage, { role: 'teacher', portal: 'employee' }, [
      { provide: ActivatedRoute, useValue: { queryParamMap: params.asObservable() } },
    ]);
    http.expectOne(`${TEST_API}/academic/me/assignments`).flush([
      {
        assignmentId: 1,
        academicYear: 2026,
        classroom: { id: 10, name: '1A', gradeName: 'Primero' },
        subject: { id: 20, name: 'Matemáticas', area: null, hoursPerWeek: 4 },
        studentsCount: 2,
      },
    ]);
    http.expectOne(`${TEST_API}/academic/periods`).flush([]);
    http
      .expectOne(
        (r) => r.url === `${TEST_API}/academic/grade-sheets` && r.params.get('periodId') === '1',
      )
      .flush(sheet(false));
    await settle(fixture);
    expect(el.textContent).toContain('Sin período abierto');
    expect(el.textContent).toContain('solo lectura');
    const inputs = el.querySelectorAll<HTMLInputElement>('input.cell');
    expect(inputs.length).toBe(8);
    expect(Array.from(inputs).every((i) => i.disabled)).toBe(true);
    expect(
      Array.from(el.querySelectorAll('button')).some((b) =>
        b.textContent?.includes('Guardar todas'),
      ),
    ).toBe(false);
  });

  it('mis grupos: panel del director y boletines del período generado', async () => {
    const { fixture, el } = setup(MyGroupsPage, { role: 'teacher', portal: 'employee' });
    http.expectOne(`${TEST_API}/academic/director/classrooms`).flush(dashboard.classrooms);
    await settle(fixture);
    http.expectOne(`${TEST_API}/academic/director/classrooms/10/dashboard`).flush({
      classroom: dashboard.classrooms[0],
      month: '2026-03',
      totals: { students: 2, boys: 1, girls: 1, monthlyAbsences: 7, critical: true },
      students: [
        {
          studentId: 1,
          code: 'E1',
          fullName: 'PÉREZ ANA',
          gender: 'F',
          documentType: 'TI',
          documentNumber: '123',
          phone: '3001234567',
        },
        {
          studentId: 2,
          code: 'E2',
          fullName: 'GÓMEZ LUIS',
          gender: 'M',
          documentType: null,
          documentNumber: null,
          phone: null,
        },
      ],
    });
    await settle(fixture);
    http
      .expectOne(`${TEST_API}/academic/periods?year=2026`)
      .flush([period({ status: 'bulletins_generated', acceptsGrades: false })]);
    await settle(fixture);
    expect(el.textContent).toContain('Crítico');
    expect(el.querySelector('a[href="tel:3001234567"]')).not.toBeNull();

    el.querySelectorAll<HTMLButtonElement>('[role=tab]')[1].click();
    await settle(fixture);
    http.expectOne(`${TEST_API}/academic/director/classrooms/10/report-cards?periodId=1`).flush({
      classroom: { id: 10, name: '1A' },
      period: { id: 1, name: 'Primer Período' },
      totals: {
        students: 2,
        generated: 1,
        groupAverage: 4.2,
        topStudent: { studentId: 1, fullName: 'PÉREZ ANA', averageScore: 4.2 },
      },
      rows: [
        {
          studentId: 1,
          code: 'E1',
          fullName: 'PÉREZ ANA',
          averageScore: 4.2,
          passing: true,
          viewCount: 3,
          status: 'generated',
        },
        {
          studentId: 2,
          code: 'E2',
          fullName: 'GÓMEZ LUIS',
          averageScore: null,
          passing: null,
          viewCount: 0,
          status: 'pending',
        },
      ],
    });
    await settle(fixture);
    expect(el.textContent).toContain('1 / 2');
    expect(el.textContent).toContain('Pendiente');
    expect(el.querySelector('a[href$="/boletin/1/1"]')).not.toBeNull();
  });

  it('asistencia QR: registra el código manual y lo muestra en el feed', async () => {
    const { fixture, el } = setup(QrAttendancePage, { role: 'teacher', portal: 'employee' });
    http.expectOne(`${TEST_API}/academic/me/assignments`).flush([
      {
        assignmentId: 1,
        academicYear: 2026,
        classroom: { id: 10, name: '1A', gradeName: 'Primero' },
        subject: { id: 20, name: 'Matemáticas', area: null, hoursPerWeek: 4 },
        studentsCount: 2,
      },
    ]);
    http.expectOne(`${TEST_API}/academic/periods`).flush([period()]);
    await settle(fixture);
    expect(el.textContent).toContain('Esperando primer escaneo');

    const form = el.querySelector<HTMLFormElement>('form.manual-code')!;
    const input = form.querySelector<HTMLInputElement>('input')!;
    input.value = 'APREU1|demo|15|2026|firma';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    const req = http.expectOne(`${TEST_API}/academic/attendance/qr`);
    expect(req.request.body).toEqual({
      rawQr: 'APREU1|demo|15|2026|firma',
      classroomId: 10,
      subjectId: 20,
    });
    req.flush({
      recordId: 1,
      student: { id: 15, firstName: 'Ana', lastName: 'Pérez', documentNumber: '123' },
      date: '2026-03-15',
      time: '07:05:00',
    });
    await settle(fixture);
    expect(el.textContent).toContain('Ana Pérez');
    expect(el.textContent).toContain('1 presentes');

    input.value = 'malo';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    http
      .expectOne(`${TEST_API}/academic/attendance/qr`)
      .flush(
        { statusCode: 422, code: 'QR_NOT_AUTHENTIC', message: 'El carnet no es auténtico.' },
        { status: 422, statusText: 'Unprocessable' },
      );
    await settle(fixture);
    expect(el.textContent).toContain('Escaneo inválido');
    expect(el.textContent).toContain('El carnet no es auténtico.');
  });

  it('mis notas: selector de hijos para acudientes y notas del período', async () => {
    const { fixture, el } = setup(MyGradesPage, { id: 5, role: 'parent', portal: 'student' });
    http.expectOne(`${TEST_API}/portal/context`).flush({
      role: 'parent',
      students: [
        {
          id: 1,
          code: 'E1',
          fullName: 'Ana Pérez',
          placement: { gradeName: 'Primero', classroomName: '1A', academicYear: 2026 },
        },
        { id: 2, code: 'E2', fullName: 'Luis Pérez', placement: null },
      ],
    });
    await settle(fixture);
    const grades = {
      student: { id: 1, code: 'E1', fullName: 'Ana Pérez' },
      academicYear: 2026,
      periods: [{ id: 1, name: 'Primer Período', status: 'open' }],
      selectedPeriodId: 1,
      lines: [
        {
          subjectId: 20,
          subjectName: 'Matemáticas',
          area: 'Ciencias',
          teacherName: 'Carlos Ruiz',
          cognitive: 2,
          procedural: 3,
          attitudinal: 4,
          finalScore: 2.5,
          passing: false,
          performance: { level: 'bajo', label: 'Bajo' },
          observations: 'Debe reforzar',
        },
      ],
      average: 2.5,
      averagePerformance: { level: 'bajo', label: 'Bajo' },
      passing: false,
    };
    http.expectOne(`${TEST_API}/academic/students/1/grades`).flush(grades);
    await settle(fixture);
    expect(el.querySelector('app-portal-student-bar ui-select')).not.toBeNull();
    expect(el.textContent).toContain('Matemáticas');
    expect(el.textContent).toContain('Prof. Carlos Ruiz');
    expect(el.querySelector('app-grade-value.failing')?.textContent).toContain('2.5');

    const select = el.querySelector<HTMLSelectElement>('app-portal-student-bar select')!;
    select.value = select.options[1].value;
    select.dispatchEvent(new Event('change'));
    await settle(fixture);
    http
      .expectOne(`${TEST_API}/academic/students/2/grades`)
      .flush({ ...grades, periods: [], lines: [] });
    await settle(fixture);
    expect(el.textContent).toContain('Aún no hay notas');
  });

  it('mi asistencia: resumen del mes y calendario', async () => {
    const { fixture, el } = setup(MyAttendancePage, { id: 6, role: 'student', portal: 'student' });
    http.expectOne(`${TEST_API}/portal/context`).flush({
      role: 'student',
      students: [{ id: 1, code: 'E1', fullName: 'Ana Pérez', placement: null }],
    });
    await settle(fixture);
    const month = todayIso().slice(0, 7);
    http.expectOne(`${TEST_API}/academic/students/1/attendance?month=${month}`).flush({
      student: { id: 1, code: 'E1', fullName: 'Ana Pérez' },
      month,
      summary: { present: 1, absent: 1, late: 0, excused: 0, daysAttended: 1, totalRecords: 2 },
      recent: [
        {
          id: 1,
          date: `${month}-02`,
          time: '07:00:00',
          status: 'present',
          source: 'qr',
          student: null,
          classroomName: '1A',
          subjectName: 'Matemáticas',
          teacherName: 'Carlos',
        },
        {
          id: 2,
          date: `${month}-03`,
          time: '07:00:00',
          status: 'absent',
          source: 'manual',
          student: null,
          classroomName: '1A',
          subjectName: 'Inglés',
          teacherName: 'Carlos',
        },
      ],
    });
    await settle(fixture);
    expect(el.querySelector('app-portal-student-bar ui-select')).toBeNull();
    expect(el.querySelectorAll('ui-stat-card').length).toBe(4);
    expect(el.querySelectorAll('app-attendance-calendar .mark--present').length).toBeGreaterThan(1);
    expect(el.textContent).toContain('Ausente');
  });

  it('boletín: vista imprimible con promedio, desempeño y descarga PDF', async () => {
    const { fixture, el } = setup(ReportCardPage, { role: 'student', portal: 'student' }, [], {
      studentId: 1,
      periodId: 3,
    });
    const doc: ReportCardDocument = {
      institution: { name: 'Colegio Demo', nit: '900', address: 'Calle 1', logo: null },
      student: { id: 1, code: 'E1', fullName: 'Ana Pérez', documentNumber: '123' },
      classroom: { name: '1A', gradeName: 'Primero' },
      groupDirectorName: 'Marta Díaz',
      period: {
        id: 3,
        name: 'Primer Período',
        academicYear: 2026,
        startDate: '2026-02-01',
        endDate: '2026-04-15',
      },
      lines: [
        {
          subjectId: 1,
          subjectName: 'Matemáticas',
          area: 'Ciencias',
          teacherName: null,
          cognitive: 4.5,
          procedural: 4,
          attitudinal: 5,
          finalScore: 4.4,
          passing: true,
          performance: { level: 'alto', label: 'Alto' },
          observations: null,
        },
      ],
      averageScore: 4.4,
      averagePerformance: { level: 'alto', label: 'Alto' },
      passing: true,
      absences: 2,
      generatedAt: '2026-04-20T10:00:00Z',
      viewCount: 1,
    };
    http.expectOne(`${TEST_API}/academic/report-cards/1/3`).flush(doc);
    await settle(fixture);
    expect(el.querySelector('ui-printable-sheet')).not.toBeNull();
    expect(el.textContent).toContain('Colegio Demo');
    expect(el.textContent).toContain('Ciencias');
    expect(el.textContent).toContain('4.4');
    expect(el.textContent).toContain('Marta Díaz');

    const pdf = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Descargar PDF'),
    )!;
    pdf.click();
    const req = http.expectOne(`${TEST_API}/academic/report-cards/1/3/pdf`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF']));
  });
});

describe('AttendanceCalendar', () => {
  it('arma semanas de lunes a domingo y marca los estados', () => {
    const fixture = TestBed.createComponent(AttendanceCalendar);
    fixture.componentRef.setInput('month', '2026-03');
    fixture.componentRef.setInput('today', '2026-03-10');
    fixture.componentRef.setInput('records', [
      {
        id: 1,
        date: '2026-03-02',
        time: '07:00',
        status: 'late',
        source: 'qr',
        student: null,
        classroomName: null,
        subjectName: null,
        teacherName: null,
      },
    ]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // Marzo de 2026 empieza en domingo: 6 semanas.
    expect(el.querySelectorAll('tbody tr').length).toBe(6);
    expect(el.querySelector('td.today')?.textContent).toContain('10');
    expect(el.querySelector('td[aria-label="2: Tarde"]')).not.toBeNull();
  });
});
