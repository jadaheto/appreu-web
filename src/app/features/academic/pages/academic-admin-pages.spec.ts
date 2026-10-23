import { HttpTestingController } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthUser, ConfirmService, SessionStore } from '../../../core';
import { makeUser, provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import { todayIso } from '../data-access/academic.labels';
import type {
  Classroom,
  ClassroomTeachingLoad,
  DailyAttendanceReport,
  GradeCurriculum,
  ReportCardSummary,
} from '../data-access/academic.models';
import { AttendanceReportPage } from './admin/attendance-report-page';
import { CurriculumPage } from './admin/curriculum-page';
import { TeachingLoadPage } from './admin/teaching-load-page';
import { MyReportCardsPage } from './student/my-report-cards-page';

const classroom: Classroom = {
  id: 10,
  name: '1A',
  gradeId: 1,
  gradeName: 'Primero',
  gradeLevel: 'primaria',
  capacity: 30,
  academicYear: 2026,
  studentsCount: 28,
  isFull: false,
  director: { employeeId: 3, name: 'Marta Díaz', since: '2026-01-20' },
};

const curriculum: GradeCurriculum = {
  grade: { id: 1, name: 'Primero', level: 'primaria' },
  subjects: [
    { id: 20, gradeId: 1, name: 'Matemáticas', code: 'MAT01', area: 'Ciencias', hoursPerWeek: 4 },
    { id: 21, gradeId: 1, name: 'Inglés', code: 'ING01', area: null, hoursPerWeek: 3 },
  ],
};

const load: ClassroomTeachingLoad = {
  classroom,
  lines: [
    {
      subject: curriculum.subjects[0],
      assignmentId: 7,
      teacher: { id: 4, code: 'EMP4', name: 'Carlos Ruiz', employeeType: 'docente' },
    },
    { subject: curriculum.subjects[1], assignmentId: null, teacher: null },
  ],
};

describe('páginas académicas: plan de estudios, carga, asistencia y boletines', () => {
  let http: HttpTestingController;

  function setup<T>(
    cmp: Type<T>,
    user: Partial<AuthUser> = {},
    inputs: Record<string, unknown> = {},
  ): { fixture: ComponentFixture<T>; el: HTMLElement } {
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
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  /** Deja correr efectos/microtareas sin esperar a que respondan las peticiones pendientes. */
  async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r));
    }
    fixture.detectChanges();
  }

  const button = (root: ParentNode, text: string): HTMLButtonElement => {
    const btn = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(text),
    );
    if (!btn) throw new Error(`No se encontró el botón «${text}»`);
    return btn;
  };

  const choose = (select: HTMLSelectElement, index: number) => {
    select.value = select.options[index].value;
    select.dispatchEvent(new Event('change'));
  };

  const type = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  afterEach(() => http.verify());

  it('plan de estudios: lista materias, valida y agrega una materia con código en mayúsculas', async () => {
    const { fixture, el } = setup(CurriculumPage, {}, { gradeId: 1 });
    await settle(fixture);
    http.expectOne(`${TEST_API}/academic/grades/1/subjects`).flush(curriculum);
    http.expectOne(`${TEST_API}/academic/grades`).flush([
      { id: 1, name: 'Primero', level: 'primaria' },
      { id: 2, name: 'Segundo', level: 'primaria' },
    ]);
    await settle(fixture);
    expect(el.querySelector('h1')?.textContent).toContain('Primero');
    expect(el.textContent).toContain('2 materias');
    expect(el.textContent).toContain('7 horas semanales');
    expect(el.textContent).toContain('General'); // área vacía
    expect(el.querySelectorAll('nav.chips button').length).toBe(2);

    button(el, 'Nueva materia').click();
    await settle(fixture);
    const form = document.querySelector<HTMLFormElement>('#subject-form')!;
    form.dispatchEvent(new Event('submit'));
    await settle(fixture);
    http.expectNone(`${TEST_API}/academic/grades/1/subjects`);
    expect(document.body.textContent).toContain('Este campo es obligatorio.');

    const [name, code] = Array.from(form.querySelectorAll<HTMLInputElement>('input'));
    type(name, ' Ciencias Naturales ');
    type(code, 'cn01');
    form.dispatchEvent(new Event('submit'));
    const req = http.expectOne(`${TEST_API}/academic/grades/1/subjects`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Ciencias Naturales', code: 'CN01', hoursPerWeek: 1 });
    req.flush({
      id: 22,
      gradeId: 1,
      name: 'Ciencias Naturales',
      code: 'CN01',
      area: null,
      hoursPerWeek: 1,
    });
    await settle(fixture);
    http.expectOne(`${TEST_API}/academic/grades/1/subjects`).flush(curriculum);
    await settle(fixture);
  });

  it('plan de estudios: eliminar una materia pide confirmación', async () => {
    const { fixture, el } = setup(CurriculumPage, {}, { gradeId: 1 });
    await settle(fixture);
    http.expectOne(`${TEST_API}/academic/grades/1/subjects`).flush(curriculum);
    http.expectOne(`${TEST_API}/academic/grades`).flush([]);
    await settle(fixture);

    const confirm = TestBed.inject(ConfirmService);
    el.querySelector<HTMLButtonElement>('button[aria-label="Eliminar materia"]')!.click();
    await settle(fixture);
    expect(confirm.state()?.title).toContain('Matemáticas');
    confirm.respond(true);
    await settle(fixture);
    const del = http.expectOne(`${TEST_API}/academic/subjects/20`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
    await settle(fixture);
    http.expectOne(`${TEST_API}/academic/grades/1/subjects`).flush(curriculum);
    await settle(fixture);
  });

  it('carga académica: alerta materias sin docente y asigna uno validando la selección', async () => {
    const { fixture, el } = setup(TeachingLoadPage, {}, { classroomId: 10 });
    await settle(fixture);
    http.expectOne(`${TEST_API}/academic/classrooms/10/assignments`).flush(load);
    await settle(fixture);
    http.expectOne(`${TEST_API}/academic/classrooms?year=2026`).flush([classroom]);
    await settle(fixture);
    expect(el.querySelector('h1')?.textContent).toContain('1A');
    expect(el.textContent).toContain('Marta Díaz');
    expect(el.textContent).toContain('1 materia(s) del plan de estudios sin docente');
    expect(el.textContent).toContain('Carlos Ruiz');
    expect(el.textContent).toContain('Sin docente');

    button(el, 'Asignar docente').click();
    await settle(fixture);
    http.expectOne(`${TEST_API}/academic/teachers`).flush([
      { id: 4, code: 'EMP4', name: 'Carlos Ruiz', employeeType: 'docente' },
      { id: 5, code: 'EMP5', name: 'Lucía Mora', employeeType: 'docente' },
    ]);
    await settle(fixture);
    const modal = document.querySelector('ui-modal')!;
    button(modal, 'Guardar').click();
    await settle(fixture);
    http.expectNone(`${TEST_API}/academic/assignments`);
    expect(document.body.textContent).toContain('Selecciona la materia.');
    expect(document.body.textContent).toContain('Selecciona el docente.');

    const [subject, teacher] = Array.from(modal.querySelectorAll<HTMLSelectElement>('select'));
    choose(subject, 1); // única materia sin docente: Inglés
    choose(teacher, 2); // Lucía Mora
    await settle(fixture);
    button(modal, 'Guardar').click();
    const req = http.expectOne(`${TEST_API}/academic/assignments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ employeeId: 5, subjectId: 21, classroomId: 10 });
    req.flush({ id: 8, employeeId: 5, subjectId: 21, classroomId: 10, academicYear: 2026 });
    await settle(fixture);
    http.expectOne(`${TEST_API}/academic/classrooms/10/assignments`).flush(load);
    await settle(fixture);
  });

  it('reporte de asistencia: totales del día y filtro por salón', async () => {
    const today = todayIso();
    const report: DailyAttendanceReport = {
      date: today,
      totals: { present: 25, late: 2, absent: 3, excused: 1 },
      records: {
        items: [
          {
            id: 1,
            date: today,
            time: '07:02:00',
            status: 'late',
            source: 'qr',
            student: { id: 15, fullName: 'Ana Pérez', code: 'E15', documentNumber: '123' },
            classroomName: '1A',
            subjectName: 'Matemáticas',
            teacherName: 'Carlos Ruiz',
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
      },
    };
    const { fixture, el } = setup(AttendanceReportPage);
    await settle(fixture);
    const first = http.expectOne((r) => r.url === `${TEST_API}/academic/attendance`);
    expect(first.request.params.get('date')).toBe(today);
    expect(first.request.params.get('page')).toBe('1');
    expect(first.request.params.has('classroomId')).toBe(false);
    first.flush(report);
    http.expectOne(`${TEST_API}/academic/classrooms`).flush([classroom]);
    await settle(fixture);
    const cards = el.querySelectorAll('ui-stat-card');
    expect(cards.length).toBe(4);
    expect(cards[0].textContent).toContain('25');
    expect(el.textContent).toContain('Ana Pérez');
    expect(el.textContent).toContain('Doc: 123');
    expect(el.textContent).toContain('Tarde');

    const select = el.querySelector<HTMLSelectElement>('ui-filter-bar select')!;
    choose(select, 1);
    await settle(fixture);
    el.querySelector<HTMLFormElement>('ui-filter-bar form')!.dispatchEvent(new Event('submit'));
    await settle(fixture);
    const filtered = http.expectOne((r) => r.url === `${TEST_API}/academic/attendance`);
    expect(filtered.request.params.get('classroomId')).toBe('10');
    filtered.flush({ ...report, records: { ...report.records, items: [], total: 0 } });
    await settle(fixture);
    expect(el.textContent).toContain('Sin registros');
  });

  it('mis boletines: tarjetas por período y descarga del PDF', async () => {
    const card: ReportCardSummary = {
      periodId: 3,
      periodName: 'Primer Período',
      academicYear: 2026,
      startDate: '2026-02-01',
      endDate: '2026-04-15',
      averageScore: 4.4,
      passing: true,
      performance: { level: 'alto', label: 'Alto' },
      generatedAt: '2026-04-20T10:00:00Z',
      viewCount: 1,
      lastViewedAt: null,
      documentPath: 'boletines/1-3.pdf',
    };
    const { fixture, el } = setup(MyReportCardsPage, { id: 6, role: 'student', portal: 'student' });
    await settle(fixture);
    http.expectOne(`${TEST_API}/portal/context`).flush({
      role: 'student',
      students: [{ id: 1, code: 'E1', fullName: 'Ana Pérez', placement: null }],
    });
    await settle(fixture);
    http.expectOne(`${TEST_API}/academic/students/1/report-cards`).flush([card]);
    await settle(fixture);
    expect(el.querySelectorAll('article.card').length).toBe(1);
    expect(el.textContent).toContain('Primer Período');
    expect(el.textContent).toContain('4.4');
    expect(el.textContent).toContain('Consultado 1 vez');
    expect(el.querySelector('a[href$="/1/3"]')).not.toBeNull();

    el.querySelector<HTMLButtonElement>(
      'button[aria-label="Descargar PDF de Primer Período"]',
    )!.click();
    const pdf = http.expectOne(`${TEST_API}/academic/report-cards/1/3/pdf`);
    expect(pdf.request.responseType).toBe('blob');
    pdf.flush(new Blob(['%PDF']));
    await settle(fixture);
  });

  it('mis boletines: estado vacío cuando aún no se generan', async () => {
    const { fixture, el } = setup(MyReportCardsPage, { id: 6, role: 'student', portal: 'student' });
    await settle(fixture);
    http.expectOne(`${TEST_API}/portal/context`).flush({
      role: 'student',
      students: [{ id: 1, code: 'E1', fullName: 'Ana Pérez', placement: null }],
    });
    await settle(fixture);
    http.expectOne(`${TEST_API}/academic/students/1/report-cards`).flush([]);
    await settle(fixture);
    expect(el.textContent).toContain('Aún no hay boletines');
  });
});
