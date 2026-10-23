import { HttpTestingController } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthUser, ConfirmService, SessionStore } from '../../../core';
import { makeUser, provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import type {
  Employee,
  IncomeCertificate,
  IssuedCertificate,
  Leave,
  PayrollPeriodDetail,
  PayslipDocument,
  Sticker,
} from '../data-access/hr.models';
import { PayrollPeriodPage } from './nomina/payroll-period-page';
import { PayslipPage } from './payslip-page';
import { MyCertificatesPage as HrMyCertificatesPage } from './portal/my-certificates-page';
import { CertificatesPanel } from '../components/certificates-panel';
import { MyLeavesPage } from './portal/my-leaves-page';
import { MyProfilePage } from './portal/my-profile-page';
import { EmployeesPage } from './rrhh/employees-page';
import { LeavesPage } from './rrhh/leaves-page';
import { StickersPage } from './stickers/stickers-page';

const page = <T>(items: T[]) => ({ items, total: items.length, page: 1, limit: 20 });

const employee: Employee = {
  id: 5,
  code: 'EMP0005',
  fullName: 'Ana Pérez',
  email: 'ana@colegio.co',
  phone: '3001234567',
  employeeType: 'docente',
  position: 'Docente de matemáticas',
  department: 'Académico',
  contractType: 'indefinido',
  hireDate: '2024-01-15',
  baseSalary: 2_500_000,
  status: 'active',
  hasUserAccount: true,
  userId: 9,
  firstName: 'Ana',
  lastName: 'Pérez',
  documentType: 'cc',
  documentNumber: '1012345678',
  birthDate: null,
  gender: 'F',
  address: 'Calle 1',
  integralSalary: false,
  recurringDeductions: { libranza: 0, sindicato: 0, embargo: 0, embargoIsAlimony: false },
  bankAccount: { bankName: 'Banco X', number: '123456789', type: 'ahorros' },
  socialSecurity: { eps: 'EPS', pensionFund: 'Fondo', arl: 'ARL', arlRiskClass: 1 },
  withholding: { hasDependents: false, prepaidHealth: 0, housingInterest: 0, voluntaryPension: 0 },
  retirementDate: null,
  retirementReason: null,
  createdAt: null,
};

const issuedCertificate: IssuedCertificate = {
  verificationCode: 'LAB-2026-0001',
  issuedAt: '2026-10-20T10:00:00Z',
  content: {
    institution: {
      name: 'Colegio Demo',
      nit: '900123456',
      nitVerificationDigit: '7',
      city: 'Bogotá',
      address: 'Cra 1',
      rectorName: 'Rector',
      logo: null,
    },
    employeeName: 'Ana Pérez',
    documentLabel: 'cédula de ciudadanía',
    documentNumber: '1012345678',
    position: 'Docente',
    department: null,
    contractLabel: 'término indefinido',
    hireDate: '2024-01-15',
    retirementDate: null,
    currentlyEmployed: true,
    salary: null,
    salaryInWords: null,
    addressee: null,
    issuedOn: '2026-10-20',
    verificationCode: 'LAB-2026-0001',
  },
};

const incomeCertificate: IncomeCertificate = {
  year: 2025,
  employee: { id: 5, fullName: 'Ana Pérez', document: 'CC 1012345678' },
  payments: 12,
  grossPayments: 30_000_000,
  mandatoryContributions: {
    health: 1_200_000,
    pension: 1_200_000,
    solidarityFund: 0,
    total: 2_400_000,
  },
  withholding: 0,
  netPaid: 27_600_000,
  note: 'Informativo',
};

const leave = (overrides: Partial<Leave>): Leave => ({
  id: 1,
  employeeId: 5,
  employeeName: 'Ana Pérez',
  leaveType: 'vacaciones',
  startDate: '2026-04-06',
  endDate: '2026-04-10',
  days: 5,
  reason: 'Descanso',
  status: 'pending',
  displayStatus: 'pending',
  payTreatment: 'paid',
  decisionNote: null,
  decidedAt: null,
  createdAt: null,
  ...overrides,
});

const payslipDoc: PayslipDocument = {
  institution: {
    name: 'Colegio Demo',
    nit: '900123456',
    nitVerificationDigit: '7',
    city: 'Bogotá',
    address: 'Cra 1',
    rectorName: 'Rector',
    logo: null,
  },
  paymentId: 11,
  status: 'paid',
  period: {
    id: 2,
    name: 'Nómina marzo 2026',
    label: 'Marzo 2026',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    paymentDate: '2026-03-30',
  },
  employee: {
    fullName: 'Ana Pérez',
    code: 'EMP0005',
    document: 'CC 1012345678',
    position: 'Docente',
    department: null,
    contract: 'término indefinido',
    bank: { name: 'Banco X', type: 'ahorros', maskedAccount: '****6789' },
  },
  workedDays: 30,
  earnings: [{ label: 'Sueldo básico', amount: 2_500_000 }],
  deductions: [{ label: 'Salud (4 %)', amount: 100_000 }],
  grossTotal: 2_500_000,
  deductionsTotal: 100_000,
  net: 2_400_000,
  netInWords: 'dos millones cuatrocientos mil pesos',
  employerContributions: [],
};

describe('páginas de RR. HH.', () => {
  let http: HttpTestingController;
  let confirmAnswer = true;

  function setup<T>(
    cmp: Type<T>,
    user: Partial<AuthUser> = {},
    inputs: Record<string, unknown> = {},
  ) {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ...provideTestHttp(),
        { provide: ConfirmService, useValue: { ask: () => Promise.resolve(confirmAnswer) } },
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

  const click = (el: HTMLElement, text: string) => {
    const btn = Array.from(el.querySelectorAll<HTMLElement>('button, a')).find((b) =>
      b.textContent?.includes(text),
    );
    if (!btn) throw new Error(`No se encontró el botón «${text}»`);
    btn.click();
  };

  beforeEach(() => (confirmAnswer = true));
  afterEach(() => http.verify());

  it('directorio: KPIs, filas y filtro por defecto de activos', async () => {
    const { fixture, el } = setup(EmployeesPage);
    const list = http.expectOne((r) => r.url === `${TEST_API}/hr/employees`);
    expect(list.request.params.get('status')).toBe('active');
    list.flush(page([employee]));
    http.expectOne(`${TEST_API}/hr/employees/kpis`).flush({
      active: 12,
      onLeave: 2,
      byType: { docente: 8, administrativo: 3, directivo: 1, servicios: 0, otro: 0 },
    });
    await settle(fixture);
    expect(el.querySelector('h1')?.textContent).toContain('Capital Humano');
    expect(el.querySelector('ui-stat-card .value')?.textContent).toContain('12');
    expect(el.querySelector('tbody')?.textContent).toContain('Ana Pérez');
    expect(el.querySelector('tbody')?.textContent).toContain('Activo');
  });

  it('bandeja de permisos: rechazar exige motivo y envía la decisión', async () => {
    const { fixture, el } = setup(LeavesPage);
    http.expectOne((r) => r.url === `${TEST_API}/hr/employees`).flush(page([]));
    http.expectOne((r) => r.url === `${TEST_API}/hr/leaves`).flush(page([leave({})]));
    await settle(fixture);
    (el.querySelector('button[aria-label="Rechazar"]') as HTMLButtonElement).click();
    await settle(fixture);
    click(document.body, 'Rechazar');
    await settle(fixture);
    http.expectNone(`${TEST_API}/hr/leaves/1/reject`);
    expect(document.body.textContent).toContain('Este campo es obligatorio');

    const textarea = document.querySelector('ui-modal textarea') as HTMLTextAreaElement;
    textarea.value = 'Sin soporte médico';
    textarea.dispatchEvent(new Event('input'));
    click(document.body, 'Rechazar');
    const req = http.expectOne(`${TEST_API}/hr/leaves/1/reject`);
    expect(req.request.body).toEqual({ reason: 'Sin soporte médico' });
    req.flush(leave({ status: 'rejected', displayStatus: 'rejected' }));
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/hr/leaves`).flush(page([]));
    await settle(fixture);
  });

  it('período: muestra el mensaje de la API cuando quien liquidó intenta aprobar', async () => {
    const detail: PayrollPeriodDetail = {
      period: {
        id: 2,
        name: 'Nómina marzo 2026',
        periodLabel: 'Marzo 2026',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        paymentDate: '2026-03-30',
        frequency: 'monthly',
        year: 2026,
        status: 'calculated',
        grossTotal: 3_000_000,
        deductionsTotal: 240_000,
        netTotal: 2_760_000,
        calculatedAt: '2026-03-28T10:00:00Z',
        approvedAt: null,
        paidAt: null,
        cancellationReason: null,
        createdAt: null,
      },
      payments: [],
      novelties: [],
      employerCostTotal: 900_000,
    };
    const { fixture, el } = setup(PayrollPeriodPage, { role: 'hr' }, { id: 2 });
    http.expectOne(`${TEST_API}/payroll/periods/2`).flush(detail);
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/hr/employees`).flush(page([]));
    await settle(fixture);

    expect(el.textContent).toContain('Nómina marzo 2026');
    expect(el.textContent).toContain('Reliquidar');
    expect(el.textContent).not.toContain('Registrar pago'); // RR. HH. no paga

    click(el, 'Aprobar');
    await settle(fixture);
    http.expectOne(`${TEST_API}/payroll/periods/2/approve`).flush(
      {
        statusCode: 403,
        code: 'FORBIDDEN',
        message:
          'Quien liquida la nómina no puede aprobarla; solicite la aprobación a otra persona.',
      },
      { status: 403, statusText: 'Forbidden' },
    );
    await settle(fixture);
    expect(el.querySelector('ui-alert')?.textContent).toContain('no puede aprobarla');
  });

  it('desprendible del portal: usa /me/employee y pinta el neto', async () => {
    const { fixture, el } = setup(
      PayslipPage,
      { role: 'teacher', portal: 'employee' },
      { id: 11, scope: 'me' },
    );
    http.expectOne(`${TEST_API}/me/employee/payslips/11`).flush(payslipDoc);
    await settle(fixture);
    expect(el.querySelector('ui-printable-sheet')).not.toBeNull();
    expect(el.textContent).toContain('2.400.000');
    expect(el.textContent).toContain('900123456-7');
    expect(el.textContent).toContain('****6789');
  });

  it('mis permisos: solo se cancelan los pendientes', async () => {
    const { fixture, el } = setup(MyLeavesPage, { role: 'teacher', portal: 'employee' });
    http
      .expectOne((r) => r.url === `${TEST_API}/me/employee/leaves`)
      .flush(
        page([leave({ id: 1 }), leave({ id: 2, status: 'approved', displayStatus: 'approved' })]),
      );
    http.expectOne(`${TEST_API}/me/employee/dashboard`).flush({
      employee,
      monthsEmployed: 20,
      lastPayslip: null,
      pendingLeaves: 1,
      approvedLeavesThisYear: 1,
      absenceDaysThisYear: 5,
    });
    await settle(fixture);
    const cancelButtons = el.querySelectorAll('button[aria-label="Cancelar solicitud"]');
    expect(cancelButtons.length).toBe(1);
    (cancelButtons[0] as HTMLButtonElement).click();
    await settle(fixture);
    http.expectOne(`${TEST_API}/me/employee/leaves/1/cancel`).flush(leave({ status: 'cancelled' }));
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/me/employee/leaves`).flush(page([]));
    http.expectOne(`${TEST_API}/me/employee/dashboard`).flush({
      employee,
      monthsEmployed: 20,
      lastPayslip: null,
      pendingLeaves: 0,
      approvedLeavesThisYear: 1,
      absenceDaysThisYear: 5,
    });
    await settle(fixture);
  });

  it('mis datos: guarda solo el contacto', async () => {
    const { fixture, el } = setup(MyProfilePage, { role: 'employee', portal: 'employee' });
    http.expectOne(`${TEST_API}/me/employee`).flush(employee);
    await settle(fixture);
    const phone = el.querySelector('input[type="tel"]') as HTMLInputElement;
    expect(phone.value).toBe('3001234567');
    phone.value = '3109998877';
    phone.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    click(el, 'Guardar contacto');
    const req = http.expectOne(`${TEST_API}/me/employee/contact`);
    expect(req.request.body).toEqual({
      phone: '3109998877',
      email: 'ana@colegio.co',
      address: 'Calle 1',
    });
    req.flush({ ...employee, phone: '3109998877' });
    await settle(fixture);
    expect(el.textContent).toContain('Ana Pérez');
    await settle(fixture);
  });

  it('stickers del portal: bandeja de pendientes y marcar leído', async () => {
    const sticker: Sticker = {
      id: 4,
      employeeId: 5,
      employeeName: 'Ana Pérez',
      title: 'Entregar informe de notas',
      content: null,
      color: 'red',
      priority: 'urgent',
      isRead: false,
      readAt: null,
      createdBy: 1,
      createdByName: 'Rectoría',
      createdAt: '2026-10-10T12:00:00Z',
    };
    const { fixture, el } = setup(
      StickersPage,
      { id: 9, role: 'teacher', portal: 'employee' },
      { mode: 'employee' },
    );
    http.expectOne((r) => r.url === `${TEST_API}/stickers`).flush(page([sticker]));
    http.expectOne(`${TEST_API}/stickers/stats`).flush({ total: 1, unread: 1, urgent: 1 });
    http.expectOne(`${TEST_API}/stickers/pending`).flush([sticker]);
    http.expectOne(`${TEST_API}/me/employee`).flush(employee);
    await settle(fixture);
    expect(el.textContent).toContain('Pendientes por leer (1)');
    expect(el.querySelectorAll('app-sticker-card').length).toBe(2);

    click(el, 'Marcar leído');
    http.expectOne(`${TEST_API}/stickers/4/read`).flush({ ...sticker, isRead: true });
    await settle(fixture);
    http
      .expectOne((r) => r.url === `${TEST_API}/stickers`)
      .flush(page([{ ...sticker, isRead: true }]));
    http.expectOne(`${TEST_API}/stickers/stats`).flush({ total: 1, unread: 0, urgent: 0 });
    http.expectOne(`${TEST_API}/stickers/pending`).flush([]);
    await settle(fixture);
    expect(el.textContent).not.toContain('Pendientes por leer');
  });

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

  it.each([
    ['me', 'me/employee/payslips/11'],
    ['admin', 'payroll/payslips/11'],
  ] as const)('desprendible (%s): «Descargar PDF» baja el PDF', async (scope, path) => {
    const { fixture, el } = setup(PayslipPage, {}, { id: 11, scope });
    http.expectOne(`${TEST_API}/${path}`).flush(payslipDoc);
    await settle(fixture);
    const dl = captureDownloads();
    click(el, 'Descargar PDF');
    await settle(fixture);
    const req = http.expectOne(`${TEST_API}/${path}/document`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF'], { type: 'application/pdf' }));
    await settle(fixture);
    expect(dl.names).toEqual(['desprendible-nomina-marzo-2026-ana-perez.pdf']);
    dl.restore();
  });

  it('panel de certificados (RR. HH.): PDF del certificado de ingresos del año elegido', async () => {
    const { fixture, el } = setup(CertificatesPanel, {}, { employeeId: 5 });
    await settle(fixture);
    const dl = captureDownloads();
    click(el, 'Descargar PDF');
    await settle(fixture);
    const year = new Date().getFullYear() - 1;
    const req = http.expectOne(
      (r) => r.url === `${TEST_API}/hr/employees/5/income-certificate/document`,
    );
    expect(req.request.params.get('year')).toBe(String(year));
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF']));
    await settle(fixture);
    expect(dl.names).toEqual([`certificado-ingresos-${year}-empleado-5.pdf`]);
    dl.restore();
  });

  it('panel de certificados (portal): PDF de mis ingresos', async () => {
    const { fixture, el } = setup(CertificatesPanel, { role: 'teacher', portal: 'employee' });
    await settle(fixture);
    const dl = captureDownloads();
    click(el, 'Descargar PDF');
    await settle(fixture);
    const req = http.expectOne(
      (r) => r.url === `${TEST_API}/me/employee/income-certificate/document`,
    );
    expect(req.request.params.get('year')).toBe(String(new Date().getFullYear() - 1));
    req.flush(new Blob(['%PDF']));
    await settle(fixture);
    expect(dl.names).toEqual([`certificado-ingresos-${new Date().getFullYear() - 1}.pdf`]);
    dl.restore();
  });

  it('mis certificados: el laboral expedido se descarga en PDF por su código', async () => {
    const { fixture, el } = setup(HrMyCertificatesPage, { role: 'teacher', portal: 'employee' });
    http.expectOne(`${TEST_API}/me/employee`).flush(employee);
    await settle(fixture);
    click(el, 'Expedir certificado');
    await settle(fixture);
    http.expectOne(`${TEST_API}/me/employee/certificates/employment`).flush(issuedCertificate);
    await settle(fixture);
    expect(el.querySelector('ui-printable-sheet')).not.toBeNull();
    const dl = captureDownloads();
    click(el, 'Descargar PDF');
    await settle(fixture);
    const req = http.expectOne(`${TEST_API}/hr/documents/LAB-2026-0001/document`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF']));
    await settle(fixture);
    expect(dl.names).toEqual(['certificado-laboral-lab-2026-0001.pdf']);
    dl.restore();
  });

  it('mis certificados: el de ingresos mostrado se descarga en PDF', async () => {
    const { fixture, el } = setup(HrMyCertificatesPage, { role: 'teacher', portal: 'employee' });
    http.expectOne(`${TEST_API}/me/employee`).flush(employee);
    await settle(fixture);
    click(el, 'Ver certificado');
    await settle(fixture);
    http
      .expectOne((r) => r.url === `${TEST_API}/me/employee/income-certificate`)
      .flush(incomeCertificate);
    await settle(fixture);
    const dl = captureDownloads();
    click(el, 'Descargar PDF');
    await settle(fixture);
    const req = http.expectOne(
      (r) => r.url === `${TEST_API}/me/employee/income-certificate/document`,
    );
    expect(req.request.params.get('year')).toBe('2025');
    req.flush(new Blob(['%PDF']));
    await settle(fixture);
    expect(dl.names).toEqual(['certificado-ingresos-2025.pdf']);
    dl.restore();
  });
});
