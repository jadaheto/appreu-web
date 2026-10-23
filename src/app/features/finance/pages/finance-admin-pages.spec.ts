import { vi } from 'vitest';
import { HttpTestingController } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthUser, ConfirmService, SessionStore } from '../../../core';
import { makeUser, provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import { PortalStudentContext } from '../components/portal-student-context';
import type {
  AccountStatement,
  BillingConcept,
  BillingStudent,
  Charge,
  ChargeBatchSummary,
  ChargeDocument,
  ChargeListItem,
  Expense,
  PaymentListItem,
  Reconciliation,
} from '../data-access/finance.models';
import { ChargesPage } from './charges/charges-page';
import { ConceptsPage } from './concepts/concepts-page';
import { ExpensesPage } from './expenses/expenses-page';
import { PortalInvoicesPage } from './portal/portal-invoices-page';
import { ChargePrintPage } from './print/print-pages';
import { ReconciliationPage } from './reconciliation/reconciliation-page';

const api = `${TEST_API}/finance`;
const page = <T>(items: T[]) => ({ items, total: items.length, page: 1, limit: 20 });

const student: BillingStudent = {
  id: 7,
  code: 'EST-007',
  fullName: 'Laura Gómez',
  documentNumber: '1001',
  status: 'active',
  gradeId: 3,
  gradeName: 'Tercero',
  classroomName: '3A',
  scholarshipPct: 0,
  guardianName: 'Marta Gómez',
  guardianPhone: '300',
};

const payment = (overrides: Partial<PaymentListItem> = {}): PaymentListItem => ({
  id: 1,
  receiptNumber: 'REC-2026-000001',
  studentId: 7,
  studentName: 'Laura Gómez',
  studentCode: 'EST-007',
  amount: 300000,
  appliedAmount: 300000,
  unappliedAmount: 0,
  method: 'nequi',
  paidAt: '2026-03-10T10:00:00Z',
  status: 'applied',
  reference: null,
  bankRef: null,
  reconciled: false,
  reconciledAt: null,
  cashierName: null,
  concepts: ['Pensión'],
  ...overrides,
});

const reconciliation = (payments: PaymentListItem[]): Reconciliation => ({
  month: '2026-03',
  total: { count: payments.length, amount: 600000 },
  reconciled: { count: 1, amount: 300000 },
  pending: { count: 1, amount: 300000 },
  byMethod: [{ method: 'nequi', label: 'Nequi', count: 2, amount: 600000 }],
  payments,
});

const charge = (overrides: Partial<Charge> = {}): Charge => ({
  id: 2,
  studentId: 7,
  conceptId: 1,
  description: 'Pensión marzo',
  period: '2026-03',
  amount: 300000,
  taxRate: 0,
  taxAmount: 0,
  discountAmount: 0,
  netAmount: 300000,
  paidAmount: 0,
  pendingAmount: 300000,
  dueDate: '2026-03-28',
  status: 'pending',
  isOverdue: false,
  academicYear: 2026,
  createdAt: null,
  ...overrides,
});

const chargeItem = (overrides: Partial<ChargeListItem> = {}): ChargeListItem => ({
  id: 2,
  studentId: 7,
  studentName: 'Laura Gómez',
  studentCode: 'EST-007',
  conceptId: 1,
  conceptName: 'Pensión',
  conceptCategory: 'pension',
  description: 'Pensión marzo',
  period: '2026-03',
  netAmount: 300000,
  paidAmount: 0,
  pendingAmount: 300000,
  dueDate: '2026-03-28',
  status: 'pending',
  isOverdue: true,
  ...overrides,
});

const concept = (overrides: Partial<BillingConcept> = {}): BillingConcept => ({
  id: 1,
  name: 'Pensión',
  description: null,
  code: 'PEN',
  category: 'pension',
  amount: 300000,
  taxRate: 0,
  isActive: true,
  ...overrides,
});

const expense: Expense = {
  id: 1,
  categoryId: 2,
  categoryName: 'Servicios',
  description: 'Factura de energía',
  amount: 450000,
  date: '2026-03-05',
  vendor: 'Electricaribe',
  receiptNo: 'F-77',
  paymentMethod: 'transferencia',
  notes: null,
  createdAt: null,
};

const batch: ChargeBatchSummary = {
  conceptId: 1,
  conceptName: 'Pensión',
  period: '2026-04',
  dueDate: '2026-04-10',
  studentsCount: 40,
  alreadyCharged: 2,
  chargesCount: 38,
  totalNet: 11_400_000,
  amounts: [{ netAmount: 300000, count: 38 }],
};

describe('páginas de administración de finanzas', () => {
  let http: HttpTestingController;
  let confirmAnswer = true;

  function setup<T>(
    cmp: Type<T>,
    user: Partial<AuthUser> = {},
    inputs: Record<string, unknown> = {},
    providers: unknown[] = [],
  ) {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ...provideTestHttp(),
        { provide: ConfirmService, useValue: { ask: () => Promise.resolve(confirmAnswer) } },
        ...(providers as never[]),
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
    return {
      fixture,
      el: fixture.nativeElement as HTMLElement,
      cmp: fixture.componentInstance as never,
    };
  }

  /** Deja correr microtareas/efectos sin esperar a que terminen las peticiones pendientes. */
  async function settle(fixture: ComponentFixture<unknown>) {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r));
    }
    fixture.detectChanges();
  }

  const type = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  beforeEach(() => (confirmAnswer = true));
  afterEach(() => http.verify());

  // ── Conciliación ─────────────────────────────────────────
  describe('conciliación', () => {
    const pending = payment();
    const done = payment({
      id: 2,
      receiptNumber: 'REC-2026-000002',
      reconciled: true,
      bankRef: 'BCO-1',
    });

    async function open() {
      const ctx = setup(ReconciliationPage);
      await settle(ctx.fixture);
      const req = http.expectOne((r) => r.url === `${api}/reconciliation`);
      expect(req.request.params.get('month')).toMatch(/^\d{4}-\d{2}$/);
      req.flush(reconciliation([pending, done]));
      await settle(ctx.fixture);
      return ctx;
    }

    it('muestra KPIs, pagos pendientes y conciliados', async () => {
      const { el } = await open();
      const values = Array.from(el.querySelectorAll('ui-stat-card .value')).map(
        (v) => v.textContent,
      );
      expect(values[0]).toContain('600.000');
      expect(values[1]).toContain('300.000');
      expect(values[3]).toContain('Nequi');
      expect(el.textContent).toContain('REC-2026-000001');
      expect(el.textContent).toContain('BCO-1');
      expect(el.textContent).toContain('Pendiente');
      expect(el.textContent).toContain('Conciliado');
    });

    it('concilia un pago con la referencia bancaria y recarga', async () => {
      const { fixture, el } = await open();
      const button = el.querySelector<HTMLButtonElement>(
        'button[aria-label="Conciliar REC-2026-000001"]',
      )!;
      expect(button.disabled).toBe(true);
      type(
        el.querySelector<HTMLInputElement>(
          'input[aria-label="Referencia bancaria de REC-2026-000001"]',
        )!,
        ' TRX-9 ',
      );
      await settle(fixture);
      expect(button.disabled).toBe(false);
      button.closest('form')!.dispatchEvent(new Event('submit'));
      const req = http.expectOne(`${api}/payments/1/reconcile`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ bankRef: 'TRX-9' });
      req.flush({
        paymentId: 1,
        reconciled: true,
        bankRef: 'TRX-9',
        reconciledAt: '2026-03-11T00:00:00Z',
      });
      await settle(fixture);
      http
        .expectOne((r) => r.url === `${api}/reconciliation`)
        .flush(reconciliation([{ ...pending, reconciled: true, bankRef: 'TRX-9' }, done]));
      await settle(fixture);
      expect(el.textContent).toContain('TRX-9');
    });

    it('revierte la conciliación tras confirmar (DELETE)', async () => {
      const { fixture, el } = await open();
      el.querySelector<HTMLButtonElement>(
        'button[aria-label="Revertir conciliación de REC-2026-000002"]',
      )!.click();
      await settle(fixture);
      const req = http.expectOne(`${api}/payments/2/reconcile`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ paymentId: 2, reconciled: false, bankRef: null, reconciledAt: null });
      await settle(fixture);
      http.expectOne((r) => r.url === `${api}/reconciliation`).flush(reconciliation([pending]));
      await settle(fixture);
    });

    it('no revierte si se cancela la confirmación', async () => {
      confirmAnswer = false;
      const { fixture, el } = await open();
      el.querySelector<HTMLButtonElement>(
        'button[aria-label="Revertir conciliación de REC-2026-000002"]',
      )!.click();
      await settle(fixture);
      http.expectNone(`${api}/payments/2/reconcile`);
    });

    it('cambia de mes y consulta de nuevo', async () => {
      const { fixture, cmp } = await open();
      (cmp as { setMonth(v: string): void }).setMonth('2026-02');
      await settle(fixture);
      const req = http.expectOne((r) => r.url === `${api}/reconciliation`);
      expect(req.request.params.get('month')).toBe('2026-02');
      req.flush(reconciliation([]));
      await settle(fixture);
      expect(fixture.nativeElement.textContent).toContain('Sin pagos en el mes');
    });
  });

  // ── Cobros ───────────────────────────────────────────────
  describe('cobros', () => {
    async function open() {
      const ctx = setup(ChargesPage);
      await settle(ctx.fixture);
      http
        .expectOne((r) => r.url === `${api}/concepts` && r.params.get('active') === 'true')
        .flush([concept()]);
      http.expectOne(`${TEST_API}/academic/grades`).flush([{ id: 3, name: 'Tercero' }]);
      const list = http.expectOne((r) => r.url === `${api}/charges`);
      expect(list.request.params.get('limit')).toBe('20');
      list.flush(
        page([
          chargeItem(),
          chargeItem({
            id: 3,
            status: 'paid',
            paidAmount: 300000,
            pendingAmount: 0,
            isOverdue: false,
          }),
        ]),
      );
      http.expectOne((r) => r.url === `${api}/charges/summary`).flush([]);
      await settle(ctx.fixture);
      return ctx;
    }

    it('lista los cobros con su estado', async () => {
      const { el } = await open();
      expect(el.querySelectorAll('tbody tr').length).toBe(2);
      expect(el.textContent).toContain('Laura Gómez');
      expect(el.textContent).toContain('Vencido');
    });

    it('filtra por estado y vuelve a la página 1', async () => {
      const { fixture, cmp } = await open();
      const c = cmp as { draft: { status: { set(v: string): void } }; applyFilters(): void };
      c.draft.status.set('pending');
      c.applyFilters();
      await settle(fixture);
      const req = http.expectOne((r) => r.url === `${api}/charges`);
      expect(req.request.params.get('status')).toBe('pending');
      expect(req.request.params.get('page')).toBe('1');
      req.flush(page([]));
      await settle(fixture);
    });

    it('anula un cobro tras confirmar', async () => {
      const { fixture, cmp } = await open();
      await (cmp as { onAction(e: unknown): Promise<void> }).onAction({
        action: 'cancel',
        row: chargeItem(),
      });
      const req = http.expectOne(`${api}/charges/2/cancel`);
      expect(req.request.method).toBe('POST');
      req.flush(charge({ status: 'cancelled' }));
      await settle(fixture);
      http.expectOne((r) => r.url === `${api}/charges`).flush(page([]));
      await settle(fixture);
    });

    it('generación masiva: previsualiza y genera tras confirmar', async () => {
      const { fixture, cmp } = await open();
      const c = cmp as {
        batchForm: { patchValue(v: object): void };
        runPreview(): void;
        generate(): Promise<void>;
        tab: { set(v: string): void };
      };
      c.tab.set('masivo');
      c.batchForm.patchValue({ conceptId: 1, period: '2026-04', gradeId: 3 });
      c.runPreview();
      const preview = http.expectOne(`${api}/charges/batch/preview`);
      expect(preview.request.body).toMatchObject({
        conceptId: 1,
        period: '2026-04',
        gradeId: 3,
        applyScholarship: false,
      });
      preview.flush(batch);
      await settle(fixture);
      expect(fixture.nativeElement.textContent).toContain('11.400.000');

      await c.generate();
      http.expectOne(`${api}/charges/batch`).flush(batch);
      await settle(fixture);
      http.expectOne((r) => r.url === `${api}/charges`).flush(page([]));
      http.expectOne((r) => r.url === `${api}/charges/summary`).flush([]);
      await settle(fixture);
    });

    it('generación masiva: no consulta si falta el concepto', async () => {
      const { cmp } = await open();
      (cmp as { runPreview(): void }).runPreview();
      http.expectNone(`${api}/charges/batch/preview`);
    });

    it('cargo individual: exige estudiante y crea el cobro', async () => {
      const { fixture, cmp } = await open();
      const c = cmp as {
        individualForm: { patchValue(v: object): void };
        student: { set(v: BillingStudent): void };
        individualError(): string | null;
        createIndividual(): void;
      };
      c.individualForm.patchValue({ conceptId: 1, period: '2026-04' });
      c.createIndividual();
      expect(c.individualError()).toBe('Selecciona el estudiante.');
      c.student.set(student);
      c.createIndividual();
      const req = http.expectOne(`${api}/charges`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toMatchObject({
        studentId: 7,
        conceptId: 1,
        period: '2026-04',
        allowDuplicate: false,
      });
      req.flush(charge());
      await settle(fixture);
      http.expectOne((r) => r.url === `${api}/charges` && r.method === 'GET').flush(page([]));
      await settle(fixture);
    });
  });

  // ── Conceptos y tarifas ──────────────────────────────────
  describe('conceptos', () => {
    async function open(role: AuthUser['role'] = 'admin') {
      const ctx = setup(ConceptsPage, { role });
      await settle(ctx.fixture);
      http
        .expectOne((r) => r.url === `${api}/concepts`)
        .flush([
          concept(),
          concept({ id: 2, name: 'Transporte', category: 'transporte', isActive: false }),
        ]);
      http
        .expectOne((r) => r.url === `${api}/tuition`)
        .flush({ academicYear: 2026, rates: [{ gradeId: 3, conceptId: null, amount: 300000 }] });
      http.expectOne(`${TEST_API}/academic/grades`).flush([{ id: 3, name: 'Tercero' }]);
      await settle(ctx.fixture);
      return ctx;
    }

    it('lista conceptos con su estado', async () => {
      const { el } = await open();
      expect(el.textContent).toContain('Pensión');
      expect(el.textContent).toContain('Transporte');
      expect(el.textContent).toContain('300.000');
    });

    it('crea un concepto validando el formulario', async () => {
      const { fixture, cmp } = await open();
      const c = cmp as {
        openNew(): void;
        save(): void;
        form: { patchValue(v: object): void };
      };
      c.openNew();
      c.save();
      http.expectNone(`${api}/concepts`);
      c.form.patchValue({ name: ' Matrícula ', amount: 500000, category: 'matricula' });
      c.save();
      const req = http.expectOne((r) => r.url === `${api}/concepts` && r.method === 'POST');
      expect(req.request.body).toMatchObject({
        name: 'Matrícula',
        amount: 500000,
        category: 'matricula',
        taxRate: 0,
      });
      req.flush(concept({ id: 3, name: 'Matrícula' }));
      await settle(fixture);
      http.expectOne((r) => r.url === `${api}/concepts`).flush([concept()]);
      await settle(fixture);
    });

    it('edita y desactiva conceptos', async () => {
      const { fixture, cmp } = await open();
      const c = cmp as {
        onAction(e: unknown): Promise<void>;
        save(): void;
        form: { patchValue(v: object): void };
      };
      await c.onAction({ action: 'edit', row: concept() });
      c.form.patchValue({ amount: 320000 });
      c.save();
      const put = http.expectOne(`${api}/concepts/1`);
      expect(put.request.method).toBe('PUT');
      expect(put.request.body).toMatchObject({ name: 'Pensión', amount: 320000 });
      put.flush(concept({ amount: 320000 }));
      await settle(fixture);
      http.expectOne((r) => r.url === `${api}/concepts`).flush([concept()]);
      await settle(fixture);

      await c.onAction({ action: 'deactivate', row: concept() });
      const patch = http.expectOne(`${api}/concepts/1/active`);
      expect(patch.request.body).toEqual({ active: false });
      patch.flush(concept({ isActive: false }));
      await settle(fixture);
      http.expectOne((r) => r.url === `${api}/concepts`).flush([concept({ isActive: false })]);
      await settle(fixture);
    });

    it('guarda las tarifas del año cargado', async () => {
      const { fixture, cmp } = await open();
      const c = cmp as {
        addRate(): void;
        removeRate(i: number): void;
        saveRates(): Promise<void>;
        ratesError(): string | null;
      };
      c.addRate();
      await c.saveRates();
      expect(c.ratesError()).toContain('Revisa las filas');
      c.removeRate(1);
      await c.saveRates();
      const req = http.expectOne(`${api}/tuition/2026`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        rates: [{ gradeId: 3, conceptId: null, amount: 300000 }],
      });
      req.flush({ academicYear: 2026, rates: [] });
      await settle(fixture);
      http.expectOne((r) => r.url === `${api}/tuition`).flush({ academicYear: 2026, rates: [] });
      await settle(fixture);
    });

    it('usuarios de finanzas no ven acciones de edición', async () => {
      const { cmp } = await open('finance');
      expect((cmp as { actions(): unknown[] }).actions()).toEqual([]);
    });
  });

  // ── Gastos ───────────────────────────────────────────────
  describe('gastos', () => {
    async function open() {
      const ctx = setup(ExpensesPage);
      await settle(ctx.fixture);
      http.expectOne(`${api}/expense-categories`).flush([{ id: 2, name: 'Servicios' }]);
      http.expectOne((r) => r.url === `${api}/expenses`).flush(page([expense]));
      await settle(ctx.fixture);
      return ctx;
    }

    it('lista los gastos', async () => {
      const { el } = await open();
      expect(el.textContent).toContain('Factura de energía');
      expect(el.textContent).toContain('450.000');
    });

    it('registra un gasto y recarga el listado', async () => {
      const { fixture, cmp } = await open();
      const c = cmp as { openNew(): void; save(): void; form: { patchValue(v: object): void } };
      c.openNew();
      c.save();
      http.expectNone((r) => r.url === `${api}/expenses` && r.method === 'POST');
      c.form.patchValue({
        description: 'Papelería',
        amount: 80000,
        date: '2026-03-01',
        categoryId: 2,
      });
      c.save();
      const req = http.expectOne((r) => r.url === `${api}/expenses` && r.method === 'POST');
      expect(req.request.body).toMatchObject({
        description: 'Papelería',
        amount: 80000,
        date: '2026-03-01',
        categoryId: 2,
        paymentMethod: 'efectivo',
      });
      req.flush({ ...expense, id: 2 });
      await settle(fixture);
      http.expectOne((r) => r.url === `${api}/expenses`).flush(page([expense]));
      await settle(fixture);
    });

    it('crea y renombra categorías', async () => {
      const { fixture, cmp } = await open();
      const c = cmp as {
        categoryForm: { setValue(v: object): void };
        saveCategory(): void;
        editCategory(cat: object): void;
      };
      c.categoryForm.setValue({ name: 'Mantenimiento' });
      c.saveCategory();
      http
        .expectOne((r) => r.url === `${api}/expense-categories` && r.method === 'POST')
        .flush({ id: 3, name: 'Mantenimiento' });
      await settle(fixture);
      http.expectOne(`${api}/expense-categories`).flush([]);
      await settle(fixture);

      c.editCategory({ id: 2, name: 'Servicios' });
      c.categoryForm.setValue({ name: 'Servicios públicos' });
      c.saveCategory();
      const put = http.expectOne(`${api}/expense-categories/2`);
      expect(put.request.method).toBe('PUT');
      expect(put.request.body).toEqual({ name: 'Servicios públicos' });
      put.flush({ id: 2, name: 'Servicios públicos' });
      await settle(fixture);
      http.expectOne(`${api}/expense-categories`).flush([]);
      http.expectOne((r) => r.url === `${api}/expenses`).flush(page([]));
      await settle(fixture);
    });
  });

  // ── Imprimibles y portal ─────────────────────────────────
  it('cuenta de cobro imprimible: muestra estudiante, concepto y saldo', async () => {
    const { fixture, el } = setup(ChargePrintPage, {}, { chargeId: '2' });
    await settle(fixture);
    const doc: ChargeDocument = {
      documentNumber: 'CC-000002',
      issueDate: '2026-03-01',
      schoolName: 'Colegio Demo',
      schoolNit: '900123456',
      conceptName: 'Pensión',
      conceptCategory: 'pension',
      student,
      charge: charge({ paidAmount: 100000, pendingAmount: 200000 }),
      isPaid: false,
    };
    http.expectOne(`${api}/charges/2/document`).flush(doc);
    await settle(fixture);
    expect(el.querySelector('ui-printable-sheet')).not.toBeNull();
    expect(el.textContent).toContain('Laura Gómez');
    expect(el.textContent).toContain('Pensión marzo');
    expect(el.textContent).toContain('200.000');
  });

  it('cuenta de cobro imprimible: muestra el error de la API', async () => {
    const { fixture, el } = setup(ChargePrintPage, {}, { chargeId: '99' });
    await settle(fixture);
    http
      .expectOne(`${api}/charges/99/document`)
      .flush({ message: 'Cobro no encontrado' }, { status: 404, statusText: 'Not Found' });
    await settle(fixture);
    expect(el.textContent).toContain('No se pudo cargar la cuenta de cobro');
  });

  it('portal: facturas lista cuentas de cobro y recibos del estudiante', async () => {
    const statement: AccountStatement = {
      student,
      summary: {
        totalCharged: 600000,
        totalPaid: 300000,
        balance: 300000,
        overdueBalance: 0,
        pendingCount: 1,
        paidCount: 1,
        creditBalance: 0,
        netBalance: 300000,
      },
      charges: [
        charge(),
        charge({
          id: 1,
          status: 'paid',
          paidAmount: 300000,
          pendingAmount: 0,
          dueDate: '2026-02-28',
        }),
        charge({ id: 9, status: 'cancelled' }),
      ],
      payments: [payment()],
    };
    const { fixture, el } = setup(PortalInvoicesPage, { role: 'student', portal: 'student' }, {}, [
      PortalStudentContext,
    ]);
    await settle(fixture);
    http.expectOne(`${api}/portal/students`).flush([student]);
    await settle(fixture);
    http.expectOne(`${api}/students/7/account-statement`).flush(statement);
    const dianReq = http.expectOne(
      (r) => r.url === `${TEST_API}/e-invoicing/portal/students/7/documents`,
    );
    expect(dianReq.request.params.get('page')).toBe('1');
    dianReq.flush({
      items: [
        {
          id: 31,
          documentType: 'fv',
          documentTypeName: 'Factura electrónica',
          number: 'FE1234',
          prefix: 'FE',
          issueDate: '2026-03-02',
          totalAmount: 300000,
          status: 'accepted',
          cufe: 'abc',
          artifacts: ['pdf', 'xml'],
        },
        {
          id: 32,
          documentType: 'fv',
          documentTypeName: 'Factura electrónica',
          number: 'FE1235',
          prefix: 'FE',
          issueDate: '2026-04-02',
          totalAmount: 300000,
          status: 'sent',
          cufe: null,
          artifacts: [],
        },
      ],
      total: 2,
      page: 1,
      limit: 20,
    });
    await settle(fixture);
    expect(el.querySelector('app-portal-student-picker select')).toBeNull();
    expect(el.textContent).toContain('Laura Gómez');
    expect(el.textContent).toContain('FE1234');
    expect(el.textContent).toContain('En validación');
    expect(el.querySelectorAll('a[aria-label^="Ver cuenta de cobro"]').length).toBe(2);
    expect(el.querySelector('a[href*="recibos/REC-2026-000001"]')).not.toBeNull();

    const createUrl = vi.fn(() => 'blob:x');
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
    el.querySelector<HTMLButtonElement>('button[aria-label="Descargar PDF de FE1234"]')!.click();
    const pdf = http.expectOne(`${TEST_API}/e-invoicing/portal/students/7/documents/31/pdf`);
    expect(pdf.request.responseType).toBe('blob');
    pdf.flush(new Blob(['%PDF']));
    expect(createUrl).toHaveBeenCalled();
  });

  it('portal: error al cargar las facturas DIAN no oculta cobros ni recibos', async () => {
    const { fixture, el } = setup(PortalInvoicesPage, { role: 'student', portal: 'student' }, {}, [
      PortalStudentContext,
    ]);
    await settle(fixture);
    http.expectOne(`${api}/portal/students`).flush([student]);
    await settle(fixture);
    http.expectOne(`${api}/students/7/account-statement`).flush({
      student,
      summary: {
        totalCharged: 0,
        totalPaid: 0,
        balance: 0,
        overdueBalance: 0,
        pendingCount: 0,
        paidCount: 0,
        creditBalance: 0,
        netBalance: 0,
      },
      charges: [],
      payments: [],
    });
    http
      .expectOne((r) => r.url === `${TEST_API}/e-invoicing/portal/students/7/documents`)
      .flush({ message: 'Error' }, { status: 500, statusText: 'Error' });
    await settle(fixture);
    expect(el.textContent).toContain('Cuentas de cobro');
    expect(el.querySelector('#inv-dian')?.parentElement?.querySelector('ui-alert')).not.toBeNull();
  });

  it('portal: sin estudiantes vinculados muestra el estado vacío', async () => {
    const { fixture, el } = setup(PortalInvoicesPage, { role: 'parent', portal: 'student' }, {}, [
      PortalStudentContext,
    ]);
    await settle(fixture);
    http.expectOne(`${api}/portal/students`).flush([]);
    await settle(fixture);
    expect(el.textContent).toContain('Sin estudiantes vinculados');
  });
});
