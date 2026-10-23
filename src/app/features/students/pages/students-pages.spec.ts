import { HttpTestingController } from '@angular/common/http/testing';
import { Provider, Type } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthUser, ConfirmService, SessionStore } from '../../../core';
import { makeUser, provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import type {
  CertificateView,
  IncidentDetailView,
  StudentIdCardView,
  StudentProfileView,
  StudentSummaryView,
  StudentView,
} from '../data-access/students.models';
import { IncidentDetailPage } from './admin/incidents/incident-detail-page';
import { IncidentsInboxPage } from './admin/incidents/incidents-inbox-page';
import { StudentDetailPage } from './admin/student-detail-page';
import { StudentEnrollPage } from './admin/student-enroll-page';
import { StudentsListPage } from './admin/students-list-page';
import { MyCertificatesPage } from './portal/my-certificates-page';
import { CertificatePrintPage } from './certificate-print-page';
import { CertificateVerifyPage } from './certificate-verify-page';
import { CertificatesTab } from './admin/student-detail/certificates-tab';
import { MyIdCardPage } from './portal/my-id-card-page';
import { MyIncidentsPage } from './portal/my-incidents-page';
import { MyProfilePage } from './portal/my-profile-page';

const page = <T>(items: T[]) => ({ items, total: items.length, page: 1, limit: 20 });

const summary = (overrides: Partial<StudentSummaryView> = {}): StudentSummaryView => ({
  id: 3,
  code: 'EST2026003',
  fullName: 'Ana Pérez',
  firstName: 'Ana',
  lastName: 'Pérez',
  initials: 'AP',
  email: 'ana@colegio.co',
  gender: 'F',
  status: 'active',
  scholarshipPct: 10,
  photoAvailable: false,
  placement: {
    classroomId: 2,
    classroomName: 'A',
    gradeId: 6,
    gradeName: 'Sexto',
    gradeLevel: 'Básica secundaria',
    academicYear: 2026,
  },
  guardian: { id: 7, fullName: 'Luis Pérez', mobile: '3001112233' },
  ...overrides,
});

const student = (overrides: Partial<StudentView> = {}): StudentView => ({
  ...summary(),
  documentType: 'TI',
  documentNumber: '1012345',
  birthDate: '2014-04-20',
  bloodType: 'O+',
  address: 'Calle 1',
  city: 'Sincelejo',
  neighborhood: null,
  phone: null,
  eps: 'Nueva EPS',
  notes: null,
  enrollmentDate: '2026-01-20',
  academicYear: 2026,
  hasPortalAccount: true,
  guardianDetails: {
    id: 7,
    documentType: 'cc',
    documentNumber: '99',
    firstName: 'Luis',
    lastName: 'Pérez',
    fullName: 'Luis Pérez',
    relationship: 'padre',
    phone: null,
    mobile: '3001112233',
    email: 'luis@correo.co',
    address: null,
    city: null,
    occupation: 'Ingeniero',
    hasPortalAccount: true,
  },
  ...overrides,
});

const incident = (overrides: Partial<IncidentDetailView> = {}): IncidentDetailView => ({
  id: 12,
  studentId: 3,
  requestedBy: 1,
  reviewedBy: null,
  type: 'baja_estudiante',
  priority: 'high',
  title: 'Solicitud de baja',
  description: 'Traslado de ciudad',
  reviewNotes: null,
  status: 'pending',
  createdAt: '2026-10-10T14:00:00Z',
  updatedAt: null,
  studentName: 'Ana Pérez',
  requestedByName: 'Secretaría',
  reviewedByName: null,
  ...overrides,
});

const certificate = (overrides: Partial<CertificateView> = {}): CertificateView => ({
  id: 20,
  studentId: 3,
  type: 'certificado_estudiantil',
  status: 'approved',
  paymentId: null,
  notes: null,
  verificationCode: 'AB12-CD34',
  issuedAt: '2026-09-01T12:00:00Z',
  snapshot: {
    studentName: 'Ana Pérez',
    studentCode: 'EST2026003',
    documentType: 'TI',
    documentNumber: '1012345',
    gradeName: 'Sexto',
    classroomName: 'A',
    academicYear: 2026,
    studentStatus: 'active',
    enrollmentDate: '2026-01-20',
  },
  ...overrides,
});

const KPIS = { pending: 4, in_review: 1, approved: 7, rejected: 2, closed: 9 };

describe('páginas de estudiantes', () => {
  let http: HttpTestingController;

  function setup<T>(
    cmp: Type<T>,
    user: Partial<AuthUser> = {},
    inputs: Record<string, unknown> = {},
    providers: Provider[] = [],
  ) {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ...provideTestHttp(),
        { provide: ConfirmService, useValue: { ask: () => Promise.resolve(true) } },
        ...providers,
      ],
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

  /** Deja correr microtareas/efectos sin esperar a que terminen las peticiones pendientes. */
  async function settle(fixture: ComponentFixture<unknown>) {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r));
    }
    fixture.detectChanges();
  }

  const findButton = (el: HTMLElement, text: string) => {
    const btn = Array.from(el.querySelectorAll<HTMLElement>('button, a')).find((b) =>
      b.textContent?.includes(text),
    );
    if (!btn) throw new Error(`No se encontró el botón «${text}»`);
    return btn;
  };
  const click = (el: HTMLElement, text: string) => findButton(el, text).click();

  const type = (el: HTMLElement, selector: string, value: string) => {
    const input = el.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
    if (!input) throw new Error(`No se encontró «${selector}»`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  afterEach(() => http.verify());

  // ------------------------------------------------------------------ Admin

  it('directorio: filtra activos del año y pinta las filas', async () => {
    const { fixture, el } = setup(StudentsListPage);
    const list = http.expectOne((r) => r.url === `${TEST_API}/students`);
    expect(list.request.params.get('status')).toBe('active');
    expect(list.request.params.get('year')).toBe(String(new Date().getFullYear()));
    list.flush({ items: [summary()], total: 1, page: 1, limit: 20 });
    http
      .expectOne(`${TEST_API}/academic/grades`)
      .flush([{ id: 6, name: 'Sexto', level: 'Básica' }]);
    http.expectOne((r) => r.url === `${TEST_API}/academic/classrooms`).flush([]);
    await settle(fixture);
    expect(el.querySelector('h1')?.textContent).toContain('Directorio de alumnos');
    expect(el.textContent).toContain('1 registros encontrados');
    const body = el.querySelector('tbody')?.textContent ?? '';
    expect(body).toContain('Ana Pérez');
    expect(body).toContain('Sexto');
    expect(body).toContain('10%');
    expect(body).toContain('Activo');
  });

  it('matrícula: valida el paso 1 y envía la matrícula sin acudiente', async () => {
    const { fixture, el } = setup(StudentEnrollPage);
    http.expectOne((r) => r.url === `${TEST_API}/academic/classrooms`).flush([]);
    await settle(fixture);

    click(el, 'Siguiente');
    await settle(fixture);
    expect(el.textContent).toContain('Este campo es obligatorio');

    type(el, '[formcontrolname="firstName"] input', 'Ana');
    type(el, '[formcontrolname="lastName"] input', 'Pérez');
    type(el, '[formcontrolname="documentNumber"] input', '1012345');
    const cmp = fixture.componentInstance as unknown as {
      setMode(m: string): void;
      submit(): void;
    };
    cmp.setMode('ninguno');
    cmp.submit();
    const req = http.expectOne(`${TEST_API}/students`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({
      student: {
        firstName: 'Ana',
        lastName: 'Pérez',
        documentNumber: '1012345',
        documentType: 'TI',
      },
      createPortalAccounts: true,
    });
    expect(req.request.body.guardian).toBeUndefined();
    req.flush({ student: student(), guardianReused: false, accounts: [] });
    await settle(fixture);
    expect(el.textContent).toContain('EST2026003');
  });

  it('matrícula: muestra el error de la API', async () => {
    const { fixture, el } = setup(StudentEnrollPage);
    http.expectOne((r) => r.url === `${TEST_API}/academic/classrooms`).flush([]);
    await settle(fixture);
    type(el, '[formcontrolname="firstName"] input', 'Ana');
    type(el, '[formcontrolname="lastName"] input', 'Pérez');
    type(el, '[formcontrolname="documentNumber"] input', '1012345');
    const cmp = fixture.componentInstance as unknown as {
      setMode(m: string): void;
      submit(): void;
    };
    cmp.setMode('ninguno');
    cmp.submit();
    http.expectOne(`${TEST_API}/students`).flush(
      {
        statusCode: 409,
        code: 'CONFLICT',
        message: 'Ya existe un estudiante con ese documento.',
      },
      { status: 409, statusText: 'Conflict' },
    );
    await settle(fixture);
    expect(el.querySelector('ui-alert')?.textContent).toContain('Ya existe un estudiante');
  });

  it('ficha 360: cabecera, pestaña de datos y pestaña de incidencias', async () => {
    const profile: StudentProfileView = {
      student: student(),
      finance: { charged: 100, paid: 50, balance: 50, overdueCount: 1, recentPayments: [] },
      incidents: [incident()],
      certificates: [certificate({ status: 'pending', verificationCode: null })],
    };
    const { fixture, el } = setup(StudentDetailPage, {}, { id: '3' });
    http.expectOne(`${TEST_API}/students/3`).flush(profile);
    await settle(fixture);
    expect(el.querySelector('h1')?.textContent).toContain('Ana Pérez');
    expect(el.textContent).toContain('Sexto · A');
    expect(el.textContent).toContain('Beca 10%');
    expect(el.textContent).toContain('Nueva EPS');

    fixture.componentRef.setInput('tab', 'incidencias');
    await settle(fixture);
    expect(el.textContent).toContain('Solicitud de baja');
    expect(el.textContent).toContain('Pendiente');
  });

  it('bandeja de incidencias: KPIs, filtro por KPI y aprobación con notas', async () => {
    const { fixture, el } = setup(IncidentsInboxPage);
    const list = http.expectOne((r) => r.url === `${TEST_API}/incidents`);
    expect(list.request.params.get('status')).toBe('pending');
    list.flush(page([incident()]));
    http.expectOne(`${TEST_API}/incidents/kpis`).flush(KPIS);
    await settle(fixture);

    expect(el.querySelector('h1')?.textContent).toContain('Incidencias y solicitudes');
    expect(el.querySelector('.kpis')?.textContent).toContain('7');
    const row = el.querySelector('tbody')?.textContent ?? '';
    expect(row).toContain('#0012');
    expect(row).toContain('Baja de estudiante');
    expect(row).toContain('Alta');
    // Una pendiente no se puede cerrar todavía.
    expect(el.querySelector('button[aria-label="Cerrar"]')).toBeNull();

    (el.querySelector('button[aria-label="Filtrar Aprobadas: 7"]') as HTMLButtonElement).click();
    await settle(fixture);
    const approved = http.expectOne((r) => r.url === `${TEST_API}/incidents`);
    expect(approved.request.params.get('status')).toBe('approved');
    approved.flush(page([]));
    await settle(fixture);
    expect(el.textContent).toContain('Sin incidencias en estado «aprobada»');

    (el.querySelector('button[aria-label="Filtrar Aprobadas: 7"]') as HTMLButtonElement).click();
    await settle(fixture);
    const all = http.expectOne((r) => r.url === `${TEST_API}/incidents`);
    expect(all.request.params.has('status')).toBe(false);
    all.flush(page([incident()]));
    await settle(fixture);

    (el.querySelector('button[aria-label="Aprobar"]') as HTMLButtonElement).click();
    await settle(fixture);
    type(el, 'ui-modal textarea', 'Soportes verificados');
    (el.querySelector('button[form="incident-review-form"]') as HTMLButtonElement).click();
    const review = http.expectOne(`${TEST_API}/incidents/12/review`);
    expect(review.request.body).toEqual({ action: 'approved', notes: 'Soportes verificados' });
    review.flush(incident({ status: 'approved' }));
    await settle(fixture);
    http
      .expectOne((r) => r.url === `${TEST_API}/incidents`)
      .flush(page([incident({ status: 'approved' })]));
    http.expectOne(`${TEST_API}/incidents/kpis`).flush({ ...KPIS, pending: 3, approved: 8 });
    await settle(fixture);
  });

  it('bandeja de incidencias: rechazar exige motivo', async () => {
    const { fixture, el } = setup(IncidentsInboxPage);
    http.expectOne((r) => r.url === `${TEST_API}/incidents`).flush(page([incident()]));
    http.expectOne(`${TEST_API}/incidents/kpis`).flush(KPIS);
    await settle(fixture);
    (el.querySelector('button[aria-label="Rechazar"]') as HTMLButtonElement).click();
    await settle(fixture);
    (el.querySelector('button[form="incident-review-form"]') as HTMLButtonElement).click();
    await settle(fixture);
    http.expectNone(`${TEST_API}/incidents/12/review`);
    expect(el.textContent).toContain('Este campo es obligatorio');
  });

  it('bandeja de incidencias: registra una nueva solicitud', async () => {
    const { fixture, el } = setup(IncidentsInboxPage);
    http.expectOne((r) => r.url === `${TEST_API}/incidents`).flush(page([]));
    http.expectOne(`${TEST_API}/incidents/kpis`).flush(KPIS);
    await settle(fixture);
    click(el, 'Nueva solicitud');
    await settle(fixture);
    type(el, '[formcontrolname="title"] input', 'Cierre de caja octubre');
    (el.querySelector('button[form="incident-form"]') as HTMLButtonElement).click();
    const req = http.expectOne((r) => r.method === 'POST' && r.url === `${TEST_API}/incidents`);
    expect(req.request.body).toEqual({
      type: 'otra',
      priority: 'medium',
      title: 'Cierre de caja octubre',
    });
    req.flush(incident({ id: 13, title: 'Cierre de caja octubre' }));
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/incidents`).flush(page([]));
    http.expectOne(`${TEST_API}/incidents/kpis`).flush(KPIS);
    await settle(fixture);
  });

  it('detalle de incidencia: muestra datos y solo las acciones permitidas', async () => {
    const { fixture, el } = setup(IncidentDetailPage, {}, { id: '12' });
    http
      .expectOne(`${TEST_API}/incidents/12`)
      .flush(incident({ status: 'approved', reviewNotes: 'OK', reviewedByName: 'Rectoría' }));
    await settle(fixture);
    expect(el.querySelector('h1')?.textContent).toContain('Solicitud de baja');
    expect(el.textContent).toContain('#0012');
    expect(el.textContent).toContain('Rectoría');
    expect(el.textContent).toContain('Traslado de ciudad');
    const review = el.querySelector('section[aria-labelledby="review-title"]') as HTMLElement;
    expect(review.textContent).toContain('Cerrar');
    expect(review.textContent).not.toContain('Aprobar');

    click(review, 'Cerrar');
    await settle(fixture);
    (el.querySelector('button[form="incident-review-form"]') as HTMLButtonElement).click();
    const req = http.expectOne(`${TEST_API}/incidents/12/review`);
    expect(req.request.body).toEqual({ action: 'closed', notes: 'OK' });
    req.flush(incident({ status: 'closed' }));
    await settle(fixture);
    http.expectOne(`${TEST_API}/incidents/12`).flush(incident({ status: 'closed' }));
    await settle(fixture);
    expect(el.textContent).toContain('no admite más acciones');
  });

  // ------------------------------------------------------------------ Portal

  const STUDENT_USER: Partial<AuthUser> = { id: 30, role: 'student', portal: 'student' };
  const PARENT_USER: Partial<AuthUser> = { id: 31, role: 'parent', portal: 'student' };

  async function withContext(
    fixture: ComponentFixture<unknown>,
    students: StudentSummaryView[] = [summary()],
    role = 'student',
  ) {
    await settle(fixture);
    http.expectOne(`${TEST_API}/portal/context`).flush({ role, students });
    await settle(fixture);
  }

  it('portal: cuenta sin estudiante vinculado', async () => {
    const { fixture, el } = setup(MyIdCardPage, STUDENT_USER);
    await withContext(fixture, []);
    expect(el.textContent).toContain('No se encontró registro de estudiante');
  });

  it('portal carnet: hoja imprimible con QR', async () => {
    const card: StudentIdCardView = {
      institution: {
        name: 'Colegio Demo',
        nit: '900123456',
        city: 'Sincelejo',
        logo: null,
        logoSize: 48,
      },
      academicYear: 2026,
      student: {
        id: 3,
        fullName: 'Ana Pérez',
        initials: 'AP',
        code: 'EST2026003',
        documentType: 'TI',
        documentNumber: '1012345',
        bloodType: 'O+',
        status: 'active',
        photoAvailable: false,
        placement: summary().placement,
      },
      guardian: { fullName: 'Luis Pérez', mobile: '3001112233' },
      qr: 'APREU1|demo|3|2026|firma',
    };
    const { fixture, el } = setup(MyIdCardPage, STUDENT_USER);
    await withContext(fixture);
    http.expectOne(`${TEST_API}/students/3/id-card`).flush(card);
    await settle(fixture);
    expect(el.querySelector('ui-printable-sheet')).not.toBeNull();
    expect(el.querySelector('app-qr-code svg path')).not.toBeNull();
    expect(el.textContent).toContain('Carnet estudiantil — 2026');
    expect(el.textContent).toContain('Luis Pérez');
  });

  it('portal certificado: aprobado imprimible y solicitud en trámite', async () => {
    const { fixture, el } = setup(MyCertificatesPage, STUDENT_USER);
    await withContext(fixture);
    http.expectOne(`${TEST_API}/students/3/certificates`).flush([
      certificate(),
      certificate({
        id: 21,
        status: 'pending',
        verificationCode: null,
        issuedAt: '2026-10-01T12:00:00Z',
      }),
    ]);
    await settle(fixture);
    expect(el.textContent).toContain('Certificado aprobado');
    expect(el.textContent).toContain('Tienes una solicitud en trámite');
    expect(findButton(el, 'Imprimir certificado').getAttribute('href')).toBe('/20');
    expect(findButton(el, 'Descargar PDF')).toBeTruthy();
    expect((findButton(el, 'Solicitar certificado') as HTMLButtonElement).disabled).toBe(true);
    expect(el.querySelector('tbody')?.textContent).toContain('AB12-CD34');
  });

  it('portal certificado: sin certificado permite solicitarlo', async () => {
    const { fixture, el } = setup(MyCertificatesPage, STUDENT_USER);
    await withContext(fixture);
    http.expectOne(`${TEST_API}/students/3/certificates`).flush([]);
    await settle(fixture);
    expect(el.textContent).toContain('Certificado no disponible');
    click(el, 'Solicitar certificado');
    await settle(fixture);
    type(el, 'ui-modal textarea', 'Para trámite de EPS');
    (el.querySelector('button[form="certificate-request-form"]') as HTMLButtonElement).click();
    const req = http.expectOne(`${TEST_API}/students/3/certificate-requests`);
    expect(req.request.body).toEqual({ notes: 'Para trámite de EPS' });
    req.flush(certificate({ id: 22, status: 'pending', verificationCode: null }));
    await settle(fixture);
    http
      .expectOne(`${TEST_API}/students/3/certificates`)
      .flush([certificate({ id: 22, status: 'pending', verificationCode: null })]);
    await settle(fixture);
    expect(el.textContent).toContain('Tienes una solicitud en trámite');
  });

  it('portal perfil: datos de solo lectura y cambio de hijo del acudiente', async () => {
    const { fixture, el } = setup(MyProfilePage, PARENT_USER);
    await withContext(
      fixture,
      [summary(), summary({ id: 4, fullName: 'Juan Pérez', code: 'EST2026004' })],
      'parent',
    );
    http.expectOne(`${TEST_API}/portal/students/3/profile`).flush(student());
    await settle(fixture);
    expect(el.querySelector('[role="group"]')?.textContent).toContain('Juan Pérez');
    expect(el.textContent).toContain('Nueva EPS');
    expect(el.textContent).toContain('Ingeniero');
    expect(el.textContent).toContain('Padre');
    expect(el.textContent).toContain('comunícate con la secretaría');
    expect(el.querySelector('input[type="file"]')).toBeNull();

    click(el.querySelector('[role="group"]') as HTMLElement, 'Juan Pérez');
    await settle(fixture);
    http
      .expectOne(`${TEST_API}/portal/students/4/profile`)
      .flush(student({ id: 4, fullName: 'Juan Pérez', code: 'EST2026004', guardianDetails: null }));
    await settle(fixture);
    expect(el.querySelector('h2')?.textContent).toContain('Juan Pérez');
    expect(el.textContent).toContain('Sin acudiente registrado');
  });

  it('portal incidencias: lista y reporta una nueva', async () => {
    const { fixture, el } = setup(MyIncidentsPage, STUDENT_USER);
    await withContext(fixture);
    const list = http.expectOne((r) => r.url === `${TEST_API}/portal/students/3/incidents`);
    expect(list.request.params.get('limit')).toBe('20');
    list.flush(
      page([incident({ status: 'in_review', type: 'incapacidad', title: 'Incapacidad médica' })]),
    );
    await settle(fixture);
    expect(el.querySelector('tbody')?.textContent).toContain('Incapacidad médica');
    expect(el.querySelector('tbody')?.textContent).toContain('En revisión');

    click(el, 'Nueva incidencia');
    await settle(fixture);
    click(el, 'Enviar');
    await settle(fixture);
    expect(el.textContent).toContain('Este campo es obligatorio');

    type(el, '[formcontrolname="title"] input', 'Salida temprana');
    type(el, '[formcontrolname="description"] textarea', 'Cita médica');
    click(el, 'Enviar');
    const req = http.expectOne(
      (r) => r.method === 'POST' && r.url === `${TEST_API}/portal/students/3/incidents`,
    );
    expect(req.request.body).toEqual({
      title: 'Salida temprana',
      type: 'otra',
      description: 'Cita médica',
    });
    req.flush(incident({ id: 14, title: 'Salida temprana' }));
    await settle(fixture);
    http
      .expectOne((r) => r.url === `${TEST_API}/portal/students/3/incidents`)
      .flush(page([incident({ id: 14, title: 'Salida temprana' })]));
    await settle(fixture);
    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('tbody')?.textContent).toContain('Salida temprana');
  });

  // ------------------------------------------------------------ PDF y verificación

  /** Intercepta el `<a download>` que genera la descarga y devuelve los nombres de archivo. */
  function captureDownloads() {
    const names: string[] = [];
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() });
    const spy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      names.push(this.download);
    });
    return { names, restore: () => spy.mockRestore() };
  }

  const PDF_NAME = 'certificado-estudio-ana-perez-ab12-cd34.pdf';

  async function expectPdfDownload(fixture: ComponentFixture<unknown>, names: string[]) {
    await settle(fixture);
    const req = http.expectOne(`${TEST_API}/certificates/20/pdf`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF'], { type: 'application/pdf' }));
    await settle(fixture);
    expect(names).toEqual([PDF_NAME]);
  }

  it('impresión del certificado: conserva la hoja HTML y «Descargar PDF» baja el oficial', async () => {
    const { fixture, el } = setup(CertificatePrintPage, {}, { certificateId: '20' });
    await settle(fixture);
    http.expectOne(`${TEST_API}/certificates/20/document`).flush({
      certificate: certificate(),
      institution: {
        name: 'Colegio Demo',
        nit: '900123456',
        city: 'Sincelejo',
        logo: null,
        signature: null,
        rectorName: 'Rector',
      },
      text: {
        title: 'CERTIFICA',
        paragraphs: ['Que Ana Pérez cursa Sexto.'],
        issuedOn: '2026-09-01',
      },
    });
    await settle(fixture);
    expect(el.querySelector('ui-printable-sheet')).not.toBeNull();
    const dl = captureDownloads();
    click(el, 'Descargar PDF');
    await expectPdfDownload(fixture, dl.names);
    dl.restore();
  });

  it('portal certificado: «Descargar PDF» del aprobado', async () => {
    const { fixture, el } = setup(MyCertificatesPage, STUDENT_USER);
    await withContext(fixture);
    http.expectOne(`${TEST_API}/students/3/certificates`).flush([certificate()]);
    await settle(fixture);
    const dl = captureDownloads();
    click(el, 'Descargar PDF');
    await expectPdfDownload(fixture, dl.names);
    dl.restore();
  });

  it('portal certificado: PDF desde el historial', async () => {
    const { fixture, el } = setup(MyCertificatesPage, STUDENT_USER);
    await withContext(fixture);
    http.expectOne(`${TEST_API}/students/3/certificates`).flush([certificate()]);
    await settle(fixture);
    const dl = captureDownloads();
    (el.querySelector('tbody button[aria-label^="Descargar PDF"]') as HTMLButtonElement).click();
    await expectPdfDownload(fixture, dl.names);
    dl.restore();
  });

  it('ficha: la pestaña de certificados descarga el PDF de los aprobados', async () => {
    const { fixture, el } = setup(
      CertificatesTab,
      {},
      {
        student: student(),
        certificates: [
          certificate(),
          certificate({ id: 21, status: 'pending', verificationCode: null }),
        ],
      },
    );
    await settle(fixture);
    const buttons = el.querySelectorAll<HTMLButtonElement>('button[aria-label="Descargar PDF"]');
    expect(buttons.length).toBe(1);
    const dl = captureDownloads();
    buttons[0].click();
    await expectPdfDownload(fixture, dl.names);
    dl.restore();
  });

  const studentVerification = {
    valid: true,
    status: 'approved',
    type: 'certificado_estudiantil',
    schoolName: 'Colegio Demo',
    studentName: 'Ana Pérez',
    document: 'TI 1012345',
    gradeName: 'Sexto',
    academicYear: 2026,
    issuedAt: '2026-09-01T12:00:00Z',
  };
  const hrVerification = {
    code: 'LAB-1',
    type: 'employment_certificate',
    employeeName: 'Luis Gómez',
    issuedAt: '2026-10-20T10:00:00Z',
    institutionName: 'Colegio Demo',
  };
  const notFound = { status: 404, statusText: 'Not Found' };

  it('verificar ?tipo=estudiantil: solo consulta certificados de estudio', async () => {
    const { fixture, el } = setup(CertificateVerifyPage, {}, { code: 'AB12', tipo: 'estudiantil' });
    await settle(fixture);
    http.expectOne(`${TEST_API}/public/certificates/verify/AB12`).flush(studentVerification);
    await settle(fixture);
    expect(el.textContent).toContain('Certificado válido');
    expect(el.textContent).toContain('Ana Pérez');
    expect(el.querySelector('[data-kind="estudiantil"]')).not.toBeNull();
  });

  it('verificar ?tipo=laboral: consulta RR. HH. sin Authorization', async () => {
    const { fixture, el } = setup(CertificateVerifyPage, {}, { code: 'LAB-1', tipo: 'laboral' });
    await settle(fixture);
    const req = http.expectOne(`${TEST_API}/hr/documents/verify/LAB-1`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(hrVerification);
    await settle(fixture);
    expect(el.textContent).toContain('Documento auténtico');
    expect(el.textContent).toContain('Certificado laboral');
    expect(el.textContent).toContain('Luis Gómez');
    expect(el.querySelector('[data-kind="laboral"]')).not.toBeNull();
  });

  it('verificar ?tipo=laboral: 404 muestra «Código no encontrado» sin intentar estudiante', async () => {
    const { fixture, el } = setup(CertificateVerifyPage, {}, { code: 'X', tipo: 'laboral' });
    await settle(fixture);
    http.expectOne(`${TEST_API}/hr/documents/verify/X`).flush({ message: 'No' }, notFound);
    await settle(fixture);
    expect(el.textContent).toContain('Código no encontrado');
  });

  it('verificar sin tipo: estudiante y, si da 404, RR. HH.', async () => {
    const { fixture, el } = setup(CertificateVerifyPage, {}, { code: 'LAB-1' });
    await settle(fixture);
    http
      .expectOne(`${TEST_API}/public/certificates/verify/LAB-1`)
      .flush({ message: 'No' }, notFound);
    await settle(fixture);
    http.expectOne(`${TEST_API}/hr/documents/verify/LAB-1`).flush(hrVerification);
    await settle(fixture);
    expect(el.textContent).toContain('Documento auténtico');
  });

  it('verificar sin tipo: si es certificado de estudio no consulta RR. HH.', async () => {
    const { fixture, el } = setup(CertificateVerifyPage, {}, { code: 'AB12', tipo: 'otro' });
    await settle(fixture);
    http.expectOne(`${TEST_API}/public/certificates/verify/AB12`).flush(studentVerification);
    await settle(fixture);
    expect(el.textContent).toContain('Certificado válido');
  });

  it('verificar: sin input binding lee :code y ?tipo de ActivatedRoute', async () => {
    const route = {
      paramMap: of(convertToParamMap({ code: 'LAB-1' })),
      queryParamMap: of(convertToParamMap({ tipo: 'laboral' })),
    };
    const { fixture, el } = setup(CertificateVerifyPage, {}, {}, [
      { provide: ActivatedRoute, useValue: route },
    ]);
    await settle(fixture);
    http.expectOne(`${TEST_API}/hr/documents/verify/LAB-1`).flush(hrVerification);
    await settle(fixture);
    expect(el.textContent).toContain('Luis Gómez');
  });
});
