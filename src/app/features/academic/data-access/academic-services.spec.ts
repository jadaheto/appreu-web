import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SessionStore, SKIP_ERROR_TOAST } from '../../../core';
import { makeUser, provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import { formatScore, monthLabel, safeFileName, shiftMonth } from './academic.labels';
import { AssessmentService } from './assessment.service';
import { AttendanceService } from './attendance.service';
import { PeriodsService } from './periods.service';
import { PortalContextService } from './portal-context.service';
import { AcademicStructureService } from './structure.service';
import { TeacherPortalService } from './teacher-portal.service';

describe('servicios del contexto académico', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestHttp() });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('AcademicStructureService: dashboard, grados, salones y carga docente', () => {
    const api = TestBed.inject(AcademicStructureService);
    api.dashboard(2026).subscribe();
    expect(http.expectOne(`${TEST_API}/academic/dashboard?year=2026`).request.method).toBe('GET');

    api.dashboard(null).subscribe();
    http.expectOne(`${TEST_API}/academic/dashboard`).flush({});

    api.createGrade({ name: 'Primero', level: 'primaria' }).subscribe();
    const create = http.expectOne(`${TEST_API}/academic/grades`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ name: 'Primero', level: 'primaria' });

    api.updateGrade(3, { name: 'Segundo' }).subscribe();
    expect(http.expectOne(`${TEST_API}/academic/grades/3`).request.method).toBe('PATCH');
    api.deleteGrade(3).subscribe();
    expect(http.expectOne(`${TEST_API}/academic/grades/3`).request.method).toBe('DELETE');

    api.addSubject(3, { name: 'Matemáticas', hoursPerWeek: 4 }).subscribe();
    expect(http.expectOne(`${TEST_API}/academic/grades/3/subjects`).request.method).toBe('POST');
    api.updateSubject(9, { name: 'Física' }).subscribe();
    expect(http.expectOne(`${TEST_API}/academic/subjects/9`).request.method).toBe('PATCH');

    api.assignDirector(5, null).subscribe();
    const director = http.expectOne(`${TEST_API}/academic/classrooms/5/director`);
    expect(director.request.method).toBe('PUT');
    expect(director.request.body).toEqual({ employeeId: null });

    api.teachingLoad(5).subscribe();
    http.expectOne(`${TEST_API}/academic/classrooms/5/assignments`);
    api.assignTeacher({ employeeId: 1, subjectId: 2, classroomId: 5 }).subscribe();
    expect(http.expectOne(`${TEST_API}/academic/assignments`).request.body).toEqual({
      employeeId: 1,
      subjectId: 2,
      classroomId: 5,
    });
    api.changeTeacher(7, 4).subscribe();
    expect(http.expectOne(`${TEST_API}/academic/assignments/7`).request.body).toEqual({
      employeeId: 4,
    });
    api.teachers().subscribe();
    http.expectOne(`${TEST_API}/academic/teachers`);
  });

  it('PeriodsService: CRUD, cierre, reapertura y generación de boletines', () => {
    const api = TestBed.inject(PeriodsService);
    api.list().subscribe();
    http.expectOne(`${TEST_API}/academic/periods`).flush([]);
    api.create({ name: 'P1', startDate: '2026-02-01', endDate: '2026-04-15' }).subscribe();
    expect(http.expectOne(`${TEST_API}/academic/periods`).request.method).toBe('POST');
    api.close(2).subscribe();
    expect(http.expectOne(`${TEST_API}/academic/periods/2/close`).request.method).toBe('POST');
    api.reopen(2).subscribe();
    expect(http.expectOne(`${TEST_API}/academic/periods/2/reopen`).request.method).toBe('POST');
    let generated = 0;
    api.generateReportCards(2).subscribe((r) => (generated = r.generated));
    http
      .expectOne(`${TEST_API}/academic/periods/2/report-cards`)
      .flush({ periodId: 2, generated: 30 });
    expect(generated).toBe(30);
  });

  it('AssessmentService: planilla, guardado masivo, notas y boletines', () => {
    const api = TestBed.inject(AssessmentService);
    api.gradeSheet({ classroomId: 1, subjectId: 2, periodId: null }).subscribe();
    const sheet = http.expectOne((r) => r.url === `${TEST_API}/academic/grade-sheets`);
    expect(sheet.request.params.get('classroomId')).toBe('1');
    expect(sheet.request.params.has('periodId')).toBe(false);

    api
      .saveGradeSheet({
        classroomId: 1,
        subjectId: 2,
        periodId: 3,
        entries: [
          { studentId: 9, cognitive: 4.5, procedural: 4, attitudinal: 5, observations: null },
        ],
      })
      .subscribe();
    const save = http.expectOne(`${TEST_API}/academic/grade-sheets`);
    expect(save.request.method).toBe('PUT');
    expect(save.request.body.entries[0].cognitive).toBe(4.5);

    api.studentGrades(9, 3).subscribe();
    http.expectOne(`${TEST_API}/academic/students/9/grades?periodId=3`);
    api.reportCardHistory(9).subscribe();
    http.expectOne(`${TEST_API}/academic/students/9/report-cards`);
    api.reportCard(9, 3).subscribe();
    http.expectOne(`${TEST_API}/academic/report-cards/9/3`);
    api.reportCardPdf(9, 3).subscribe();
    expect(http.expectOne(`${TEST_API}/academic/report-cards/9/3/pdf`).request.responseType).toBe(
      'blob',
    );
    api.groupReportCards(5, 3).subscribe();
    http.expectOne(`${TEST_API}/academic/director/classrooms/5/report-cards?periodId=3`);
    api.groupReportCardsZip(5, 3).subscribe();
    expect(
      http.expectOne(`${TEST_API}/academic/director/classrooms/5/report-cards/zip?periodId=3`)
        .request.responseType,
    ).toBe('blob');
  });

  it('AttendanceService y TeacherPortalService', () => {
    const att = TestBed.inject(AttendanceService);
    att.registerQr({ rawQr: 'APREU1|x', subjectId: 2, classroomId: 1 }).subscribe();
    expect(http.expectOne(`${TEST_API}/academic/attendance/qr`).request.body.rawQr).toBe(
      'APREU1|x',
    );
    att
      .registerManual({
        classroomId: 1,
        subjectId: 2,
        entries: [{ studentId: 3, status: 'absent' }],
      })
      .subscribe();
    expect(http.expectOne(`${TEST_API}/academic/attendance/manual`).request.method).toBe('POST');
    att.dailyReport({ date: '2026-03-15', classroomId: null, page: 1, limit: 50 }).subscribe();
    const report = http.expectOne((r) => r.url === `${TEST_API}/academic/attendance`);
    expect(report.request.params.get('date')).toBe('2026-03-15');
    expect(report.request.params.has('classroomId')).toBe(false);
    att.student(9, '2026-03').subscribe();
    http.expectOne(`${TEST_API}/academic/students/9/attendance?month=2026-03`);

    const portal = TestBed.inject(TeacherPortalService);
    portal.myAssignments().subscribe();
    http.expectOne(`${TEST_API}/academic/me/assignments`);
    portal.directedClassrooms().subscribe();
    http.expectOne(`${TEST_API}/academic/director/classrooms`);
    portal.directorDashboard(5).subscribe();
    http.expectOne(`${TEST_API}/academic/director/classrooms/5/dashboard`);
  });

  it('PortalContextService: carga los estudiantes y recuerda la selección', async () => {
    TestBed.inject(SessionStore).set({
      token: 't',
      expiresAt: Date.now() + 60_000,
      tenant: null,
      user: makeUser({ id: 7, role: 'parent', portal: 'student' }),
    });
    const ctx = TestBed.inject(PortalContextService);
    TestBed.tick();
    http.expectOne(`${TEST_API}/portal/context`).flush({
      role: 'parent',
      students: [
        { id: 1, fullName: 'Ana', code: 'A1', placement: null },
        { id: 2, fullName: 'Luis', code: 'L2', placement: null },
      ],
    });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(ctx.selectedId()).toBe(1);
    ctx.select(2);
    expect(ctx.selected()?.fullName).toBe('Luis');
    expect(sessionStorage.getItem('apreu.academic.student')).toBe('2');
  });
});

describe('servicios del contexto académico: rutas complementarias', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestHttp() });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('AcademicStructureService: catálogo de grados, plan de estudios y salones', () => {
    const api = TestBed.inject(AcademicStructureService);
    let grades: unknown;
    api.grades().subscribe((g) => (grades = g));
    const list = http.expectOne(`${TEST_API}/academic/grades`);
    expect(list.request.method).toBe('GET');
    list.flush([{ id: 1, name: 'Primero', level: 'primaria' }]);
    expect(grades).toEqual([{ id: 1, name: 'Primero', level: 'primaria' }]);

    api.curriculum(3).subscribe();
    expect(http.expectOne(`${TEST_API}/academic/grades/3/subjects`).request.method).toBe('GET');
    api.deleteSubject(9).subscribe();
    expect(http.expectOne(`${TEST_API}/academic/subjects/9`).request.method).toBe('DELETE');

    api.classrooms(2026).subscribe();
    expect(http.expectOne(`${TEST_API}/academic/classrooms?year=2026`).request.method).toBe('GET');
    api.classrooms().subscribe();
    http.expectOne(`${TEST_API}/academic/classrooms`);

    const dto = { name: '1A', gradeId: 1, capacity: 30, academicYear: 2026 };
    api.createClassroom(dto).subscribe();
    const create = http.expectOne(`${TEST_API}/academic/classrooms`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(dto);
    api.updateClassroom(5, dto).subscribe();
    const update = http.expectOne(`${TEST_API}/academic/classrooms/5`);
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual(dto);
    api.deleteClassroom(5).subscribe();
    expect(http.expectOne(`${TEST_API}/academic/classrooms/5`).request.method).toBe('DELETE');

    api.assignDirector(5, 8).subscribe();
    expect(http.expectOne(`${TEST_API}/academic/classrooms/5/director`).request.body).toEqual({
      employeeId: 8,
    });
    api.removeAssignment(7).subscribe();
    expect(http.expectOne(`${TEST_API}/academic/assignments/7`).request.method).toBe('DELETE');
  });

  it('PeriodsService: filtro por año, edición y eliminación', () => {
    const api = TestBed.inject(PeriodsService);
    api.list(2025).subscribe();
    http.expectOne(`${TEST_API}/academic/periods?year=2025`).flush([]);
    api
      .create({ name: 'P1', startDate: '2026-02-01', endDate: '2026-04-15', academicYear: 2026 })
      .subscribe();
    expect(http.expectOne(`${TEST_API}/academic/periods`).request.body).toEqual({
      name: 'P1',
      startDate: '2026-02-01',
      endDate: '2026-04-15',
      academicYear: 2026,
    });
    api.update(2, { name: 'P2', startDate: '2026-04-16', endDate: '2026-06-30' }).subscribe();
    const update = http.expectOne(`${TEST_API}/academic/periods/2`);
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body.name).toBe('P2');
    api.remove(2).subscribe();
    expect(http.expectOne(`${TEST_API}/academic/periods/2`).request.method).toBe('DELETE');
  });

  it('AssessmentService: notas del período vigente y planilla con período explícito', () => {
    const api = TestBed.inject(AssessmentService);
    api.studentGrades(9).subscribe();
    http.expectOne(`${TEST_API}/academic/students/9/grades`);
    api.gradeSheet({ classroomId: 1, subjectId: 2, periodId: 3 }).subscribe();
    const sheet = http.expectOne((r) => r.url === `${TEST_API}/academic/grade-sheets`);
    expect(sheet.request.method).toBe('GET');
    expect(sheet.request.params.get('subjectId')).toBe('2');
    expect(sheet.request.params.get('periodId')).toBe('3');
  });

  it('AttendanceService: el QR omite el toast global; reporte con salón y paginación', () => {
    const att = TestBed.inject(AttendanceService);
    att.registerQr({ rawQr: 'APREU1|x', subjectId: 2, classroomId: 1 }).subscribe();
    const qr = http.expectOne(`${TEST_API}/academic/attendance/qr`);
    expect(qr.request.method).toBe('POST');
    expect(qr.request.context.get(SKIP_ERROR_TOAST)).toBe(true);
    qr.flush({});

    att.registerManual({ classroomId: 1, subjectId: 2, entries: [] }).subscribe();
    expect(
      http
        .expectOne(`${TEST_API}/academic/attendance/manual`)
        .request.context.get(SKIP_ERROR_TOAST),
    ).toBe(false);

    att.dailyReport({ date: '2026-03-15', classroomId: 4, page: 2, limit: 50 }).subscribe();
    const report = http.expectOne((r) => r.url === `${TEST_API}/academic/attendance`);
    expect(report.request.params.get('classroomId')).toBe('4');
    expect(report.request.params.get('page')).toBe('2');
    expect(report.request.params.get('limit')).toBe('50');

    att.student(9).subscribe();
    http.expectOne(`${TEST_API}/academic/students/9/attendance`);
  });

  it('TeacherPortalService: asignaciones filtradas por año', () => {
    const portal = TestBed.inject(TeacherPortalService);
    let count = 0;
    portal.myAssignments(2025).subscribe((a) => (count = a.length));
    http.expectOne(`${TEST_API}/academic/me/assignments?year=2025`).flush([{ assignmentId: 1 }]);
    expect(count).toBe(1);
  });

  it('PortalContextService: descarta una selección guardada que ya no es válida', async () => {
    sessionStorage.setItem('apreu.academic.student', '99');
    TestBed.inject(SessionStore).set({
      token: 't',
      expiresAt: Date.now() + 60_000,
      tenant: null,
      user: makeUser({ id: 7, role: 'parent', portal: 'student' }),
    });
    const ctx = TestBed.inject(PortalContextService);
    TestBed.tick();
    http.expectOne(`${TEST_API}/portal/context`).flush({
      role: 'parent',
      students: [{ id: 2, fullName: 'Luis', code: 'L2', placement: null }],
    });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(ctx.selectedId()).toBe(2);
    ctx.select(null);
    expect(sessionStorage.getItem('apreu.academic.student')).toBeNull();
  });
});

describe('utilidades académicas', () => {
  it('formatea notas, meses y nombres de archivo', () => {
    expect(formatScore(4)).toBe('4.0');
    expect(formatScore(null)).toBe('—');
    expect(monthLabel('2026-03')).toBe('marzo de 2026');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(safeFileName('Boletín Ñandú 1A')).toBe('boletin-nandu-1a');
  });
});
