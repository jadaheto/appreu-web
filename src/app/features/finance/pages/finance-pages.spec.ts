import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthUser, SessionStore } from '../../../core';
import { makeUser, provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import { PortalStudentContext } from '../components/portal-student-context';
import type {
  AccountStatement,
  BillingStudent,
  Charge,
  Receipt,
} from '../data-access/finance.models';
import { AgingPage } from './aging/aging-page';
import { CashierPage } from './cashier/cashier-page';
import { FinanceDashboardPage } from './dashboard/finance-dashboard-page';
import { PaymentsPage } from './payments/payments-page';
import { PortalPaymentsPage } from './portal/portal-payments-page';
import { ReceiptPrintPage } from './print/print-pages';

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

const charge = (id: number, pending: number, overrides: Partial<Charge> = {}): Charge => ({
  id,
  studentId: 7,
  conceptId: 1,
  description: `Pensión ${id}`,
  period: '2026-03',
  amount: 300000,
  taxRate: 0,
  taxAmount: 0,
  discountAmount: 0,
  netAmount: 300000,
  paidAmount: 300000 - pending,
  pendingAmount: pending,
  dueDate: `2026-0${id}-28`,
  status: pending > 0 ? 'pending' : 'paid',
  isOverdue: false,
  academicYear: 2026,
  createdAt: null,
  ...overrides,
});

const statement: AccountStatement = {
  student,
  summary: {
    totalCharged: 900000,
    totalPaid: 300000,
    balance: 600000,
    overdueBalance: 0,
    pendingCount: 2,
    paidCount: 1,
    creditBalance: 50000,
    netBalance: 550000,
  },
  charges: [charge(1, 0), charge(2, 300000), charge(3, 300000)],
  payments: [],
};

describe('páginas de finanzas', () => {
  let http: HttpTestingController;

  function setup<T>(cmp: Type<T>, user: Partial<AuthUser> = {}, providers: unknown[] = []) {
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
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  /** Deja correr microtareas/efectos sin esperar a que terminen las peticiones pendientes. */
  async function settle(fixture: { detectChanges(): void }) {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r));
    }
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  it('dashboard: muestra KPIs del mes, cartera y últimas facturas', async () => {
    const { fixture, el } = setup(FinanceDashboardPage);
    await settle(fixture);
    const req = http.expectOne((r) => r.url === `${TEST_API}/finance/dashboard`);
    expect(req.request.params.get('month')).toMatch(/^\d{4}-\d{2}$/);
    req.flush({
      month: '2026-03',
      income: { value: 2_000_000, previous: 1_000_000, changePct: 100 },
      expenses: { value: 500_000, previous: 0, changePct: null },
      netProfit: 1_500_000,
      overduePortfolio: { balance: 750_000, debtors: 4 },
      chargesByCategory: [{ category: 'pension', total: 900_000 }],
      topExpenseCategories: [],
      latestInvoices: [
        {
          id: 1,
          invoiceNumber: 'SETP990000001',
          studentName: 'Laura',
          issueDate: '2026-03-02',
          totalAmount: 300000,
          status: 'accepted',
        },
      ],
    });
    await settle(fixture);
    const values = Array.from(el.querySelectorAll('ui-stat-card .value')).map((v) => v.textContent);
    expect(values[0]).toContain('2.000.000');
    expect(values[3]).toContain('750.000');
    expect(el.textContent).toContain('marzo 2026');
    expect(el.querySelector('ui-bar-chart')).not.toBeNull();
    expect(el.textContent).toContain('SETP990000001');
    expect(el.textContent).toContain('Aceptada');
  });

  it('caja: aplica el pago a los cobros seleccionados y ofrece el recibo', async () => {
    const { fixture, el } = setup(CashierPage);
    fixture.componentRef.setInput('studentId', '7');
    await settle(fixture);
    http.expectOne(`${TEST_API}/finance/students/7/account-statement`).flush(statement);
    await settle(fixture);

    // Solo los cobros abiertos, el más antiguo primero.
    const items = Array.from(el.querySelectorAll('.charges li strong')).map((s) => s.textContent);
    expect(items).toEqual(['Pensión 2', 'Pensión 3']);
    expect(el.textContent).toContain('Laura Gómez');
    expect(el.textContent).toContain('Aplicar saldo a favor');

    // Modo selección: marcar el cobro 3 autocompleta el monto.
    const chips = el.querySelectorAll<HTMLButtonElement>('button[ui-chip]');
    chips[1].click();
    await settle(fixture);
    const boxes = el.querySelectorAll<HTMLInputElement>('.charges input[type=checkbox]');
    boxes[1].click();
    await settle(fixture);
    const amount = el.querySelector<HTMLInputElement>('ui-input[formcontrolname=amount] input');
    expect(Number(amount?.value)).toBe(300000);

    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    const req = http.expectOne(`${TEST_API}/finance/payments`);
    expect(req.request.body).toMatchObject({
      studentId: 7,
      amount: 300000,
      method: 'efectivo',
      chargeIds: [3],
    });
    req.flush({
      paymentId: 1,
      receiptNumber: 'REC-2026-000001',
      studentId: 7,
      amount: 300000,
      appliedAmount: 300000,
      unappliedAmount: 0,
      creditBalance: 50000,
      paidAt: '2026-03-10T10:00:00Z',
      applications: [
        {
          chargeId: 3,
          conceptId: 1,
          conceptName: 'Pensión',
          description: 'Pensión 3',
          amount: 300000,
          chargeStatus: 'paid',
          chargePending: 0,
        },
      ],
    });
    await settle(fixture);
    http.expectOne(`${TEST_API}/finance/students/7/account-statement`).flush(statement);
    await settle(fixture);
    expect(el.textContent).toContain('REC-2026-000001');
    expect(el.querySelector('a[href*="recibos/REC-2026-000001"]')).not.toBeNull();
  });

  it('caja: exige seleccionar cobros en modo selección', async () => {
    const { fixture, el } = setup(CashierPage);
    fixture.componentRef.setInput('studentId', '7');
    await settle(fixture);
    http.expectOne(`${TEST_API}/finance/students/7/account-statement`).flush(statement);
    await settle(fixture);
    el.querySelectorAll<HTMLButtonElement>('button[ui-chip]')[1].click();
    await settle(fixture);
    const amount = el.querySelector<HTMLInputElement>('ui-input[formcontrolname=amount] input')!;
    amount.value = '1000';
    amount.dispatchEvent(new Event('input'));
    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await settle(fixture);
    http.expectNone(`${TEST_API}/finance/payments`);
    expect(el.textContent).toContain('Selecciona al menos un cobro');
  });

  it('pagos: lista y oculta la anulación a usuarios de finanzas', async () => {
    const { fixture, el } = setup(PaymentsPage, { role: 'finance' });
    await settle(fixture);
    const req: TestRequest = http.expectOne((r) => r.url === `${TEST_API}/finance/payments`);
    expect(req.request.params.get('limit')).toBe('20');
    req.flush({
      items: [
        {
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
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    await settle(fixture);
    expect(el.textContent).toContain('REC-2026-000001');
    expect(el.querySelector('[aria-label="Conciliar"]')).not.toBeNull();
    expect(el.querySelector('[aria-label="Anular pago"]')).toBeNull();
  });

  it('cartera: KPIs por riesgo y deudores', async () => {
    const { fixture, el } = setup(AgingPage);
    await settle(fixture);
    http.expectOne(`${TEST_API}/academic/grades`).flush([{ id: 3, name: 'Tercero' }]);
    http
      .expectOne((r) => r.url === `${TEST_API}/finance/aging`)
      .flush({
        today: '2026-03-31',
        total: { debtors: 1, balance: 600000 },
        byRisk: {
          critico: { debtors: 1, balance: 600000 },
          alto: { debtors: 0, balance: 0 },
          medio: { debtors: 0, balance: 0 },
          bajo: { debtors: 0, balance: 0 },
        },
        debtors: [
          {
            position: 1,
            studentId: 7,
            studentName: 'Laura Gómez',
            studentCode: 'EST-007',
            gradeId: 3,
            gradeName: 'Tercero',
            classroomName: '3A',
            oldestDueDate: '2025-12-01',
            daysOverdue: 120,
            risk: 'critico',
            chargesCount: 2,
            balance: 600000,
          },
        ],
      });
    await settle(fixture);
    expect(el.querySelectorAll('ui-stat-card').length).toBe(5);
    expect(el.textContent).toContain('Laura Gómez');
    expect(el.textContent).toContain('Crítico');
  });

  it('recibo imprimible: muestra desglose y total', async () => {
    const { fixture, el } = setup(ReceiptPrintPage);
    fixture.componentRef.setInput('receiptNumber', 'REC-2026-000001');
    await settle(fixture);
    const receipt: Receipt = {
      paymentId: 1,
      receiptNumber: 'REC-2026-000001',
      studentId: 7,
      studentName: 'Laura Gómez',
      studentCode: 'EST-007',
      documentNumber: '1001',
      amount: 350000,
      method: 'nequi',
      methodLabel: 'Nequi',
      paidAt: '2026-03-10T10:00:00Z',
      status: 'applied',
      reference: 'TX1',
      notes: null,
      cashierName: 'Caja 1',
      voidReason: null,
      lines: [
        {
          chargeId: 3,
          conceptName: 'Pensión',
          description: 'Pensión marzo',
          amount: 300000,
          chargePending: 0,
        },
      ],
      schoolName: 'Colegio Demo',
      schoolNit: '900123456',
      appliedAmount: 300000,
      unappliedAmount: 50000,
    };
    http.expectOne(`${TEST_API}/finance/receipts/REC-2026-000001`).flush(receipt);
    await settle(fixture);
    expect(el.querySelector('ui-printable-sheet')).not.toBeNull();
    expect(el.textContent).toContain('Colegio Demo');
    expect(el.textContent).toContain('Pensión marzo');
    expect(el.textContent).toContain('Saldo a favor');
    expect(el.textContent).toContain('350.000');
  });

  it('portal: selector de hijo y estado de cuenta del seleccionado', async () => {
    const other = { ...student, id: 8, fullName: 'Pedro Gómez' };
    const { fixture, el } = setup(PortalPaymentsPage, { role: 'parent', portal: 'student' }, [
      PortalStudentContext,
    ]);
    await settle(fixture);
    http.expectOne(`${TEST_API}/finance/portal/students`).flush([student, other]);
    await settle(fixture);
    http.expectOne(`${TEST_API}/finance/students/7/account-statement`).flush(statement);
    await settle(fixture);
    expect(el.querySelector('app-portal-student-picker select')).not.toBeNull();
    expect(el.textContent).toContain('Laura Gómez');
    expect(
      el.querySelector('a[href*="/portal-estudiante/pagos/cobros/2/documento"]'),
    ).not.toBeNull();

    const select = el.querySelector<HTMLSelectElement>('app-portal-student-picker select')!;
    select.value = '1';
    select.dispatchEvent(new Event('change'));
    await settle(fixture);
    http
      .expectOne(`${TEST_API}/finance/students/8/account-statement`)
      .flush({ ...statement, student: other });
    await settle(fixture);
    expect(el.textContent).toContain('Pedro Gómez');
  });
});
