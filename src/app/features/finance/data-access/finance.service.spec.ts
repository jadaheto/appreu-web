import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import { fileNameFromDisposition, FinanceService } from './finance.service';
import { currentMonth, formatDay, monthLabel, todayIso } from './finance-labels';

describe('FinanceService', () => {
  let service: FinanceService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestHttp() });
    service = TestBed.inject(FinanceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista cobros con filtros y mapea `limit` a `pageSize`', async () => {
    const result = firstValueFrom(
      service.charges({
        page: 2,
        pageSize: 50,
        status: 'pending',
        overdueOnly: false,
        search: 'ana',
      }),
    );
    const req = http.expectOne((r) => r.url === `${TEST_API}/finance/charges`);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('50');
    expect(req.request.params.get('status')).toBe('pending');
    expect(req.request.params.get('search')).toBe('ana');
    expect(req.request.params.has('overdueOnly')).toBe(false);
    expect(req.request.params.has('pageSize')).toBe(false);
    req.flush({ items: [{ id: 1 }], total: 51, page: 2, limit: 50 });
    expect(await result).toEqual({ items: [{ id: 1 }], total: 51, page: 2, pageSize: 50 });
  });

  it('registra un pago con los cobros seleccionados', async () => {
    const result = firstValueFrom(
      service.registerPayment({ studentId: 7, amount: 350000, method: 'nequi', chargeIds: [3, 4] }),
    );
    const req = http.expectOne(`${TEST_API}/finance/payments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      studentId: 7,
      amount: 350000,
      method: 'nequi',
      chargeIds: [3, 4],
    });
    req.flush({ paymentId: 9, receiptNumber: 'REC-2026-000009' });
    expect((await result).receiptNumber).toBe('REC-2026-000009');
  });

  it('anula, concilia y revierte conciliación de pagos', () => {
    service.voidPayment(5, 'Error de digitación').subscribe();
    const voidReq = http.expectOne(`${TEST_API}/finance/payments/5/void`);
    expect(voidReq.request.body).toEqual({ reason: 'Error de digitación' });
    voidReq.flush({});

    service.reconcilePayment(5, 'TRX-1').subscribe();
    const rec = http.expectOne(`${TEST_API}/finance/payments/5/reconcile`);
    expect(rec.request.method).toBe('POST');
    expect(rec.request.body).toEqual({ bankRef: 'TRX-1' });
    rec.flush({});

    service.unreconcilePayment(5).subscribe();
    const unrec = http.expectOne(`${TEST_API}/finance/payments/5/reconcile`);
    expect(unrec.request.method).toBe('DELETE');
    unrec.flush({});
  });

  it('consulta recibos, estado de cuenta y estudiantes del portal', () => {
    service.receipt('REC-2026-000001').subscribe();
    http.expectOne(`${TEST_API}/finance/receipts/REC-2026-000001`).flush({});
    service.accountStatement(3).subscribe();
    http.expectOne(`${TEST_API}/finance/students/3/account-statement`).flush({});
    service.myStudents().subscribe();
    http.expectOne(`${TEST_API}/finance/portal/students`).flush([]);
    service.searchStudents('pe').subscribe();
    http.expectOne(`${TEST_API}/finance/students/search?q=pe&limit=10`).flush([]);
  });

  it('previsualiza y genera cobros masivos', () => {
    const dto = { conceptId: 1, period: '2026-03', gradeId: 2 };
    service.previewBatch(dto).subscribe();
    expect(http.expectOne(`${TEST_API}/finance/charges/batch/preview`).request.body).toEqual(dto);
    service.generateBatch(dto).subscribe();
    http.expectOne(`${TEST_API}/finance/charges/batch`).flush({});
    service.cancelCharge(4).subscribe();
    http.expectOne(`${TEST_API}/finance/charges/4/cancel`).flush({});
    http.match(() => true).forEach((r) => r.flush({}));
  });

  it('descarga el TXT de recaudo como texto con nombre y registros', async () => {
    const file = firstValueFrom(service.collectionFile('asobancaria', '2026-03'));
    const req = http.expectOne(`${TEST_API}/finance/bank-files/collection`);
    expect(req.request.responseType).toBe('text');
    expect(req.request.body).toEqual({ bank: 'asobancaria', month: '2026-03' });
    req.flush('01...', {
      headers: { 'Content-Disposition': 'attachment; filename="RECAUDO_X.txt"', 'X-Records': '12' },
    });
    expect(await file).toEqual({ fileName: 'RECAUDO_X.txt', content: '01...', records: 12 });
  });

  it('usa un nombre por defecto si CORS oculta Content-Disposition', async () => {
    const file = firstValueFrom(service.payrollFile('davivienda', 3));
    http.expectOne(`${TEST_API}/finance/bank-files/payroll`).flush('x');
    expect((await file).fileName).toMatch(/^PAGO_DAVIVIENDA_\d{8}\.txt$/);
  });

  it('grados y períodos de nómina degradan a lista vacía si no hay acceso', async () => {
    const grades = firstValueFrom(service.grades());
    http
      .expectOne(`${TEST_API}/academic/grades`)
      .flush({}, { status: 403, statusText: 'Forbidden' });
    expect(await grades).toEqual([]);
    const periods = firstValueFrom(service.payrollPeriods());
    http
      .expectOne((r) => r.url === `${TEST_API}/payroll/periods`)
      .flush({ items: [{ id: 1, name: 'Marzo' }], total: 1, page: 1, limit: 100 });
    expect(await periods).toEqual([{ id: 1, name: 'Marzo' }]);
  });

  it('guarda tarifas y conceptos', () => {
    service.saveTuition(2026, [{ gradeId: 1, conceptId: null, amount: 1000 }]).subscribe();
    const t = http.expectOne(`${TEST_API}/finance/tuition/2026`);
    expect(t.request.method).toBe('PUT');
    t.flush({});
    service.setConceptActive(2, false).subscribe();
    const a = http.expectOne(`${TEST_API}/finance/concepts/2/active`);
    expect(a.request.method).toBe('PATCH');
    expect(a.request.body).toEqual({ active: false });
    a.flush({});
  });
  it('reportes: dashboard, cartera con filtros y conciliación del mes', () => {
    service.dashboard('2026-03').subscribe();
    http.expectOne(`${TEST_API}/finance/dashboard?month=2026-03`).flush({});
    service.aging({ risk: 'critico', gradeId: null }).subscribe();
    const aging = http.expectOne((r) => r.url === `${TEST_API}/finance/aging`);
    expect(aging.request.params.get('risk')).toBe('critico');
    expect(aging.request.params.has('gradeId')).toBe(false);
    aging.flush({});
    service.reconciliation().subscribe();
    const rec = http.expectOne((r) => r.url === `${TEST_API}/finance/reconciliation`);
    expect(rec.request.params.keys()).toEqual([]);
    rec.flush({});
  });

  it('cobros, pagos y saldo a favor de un estudiante', () => {
    service.studentCharges(7).subscribe();
    http.expectOne(`${TEST_API}/finance/students/7/charges`).flush({});
    service.studentPayments(7).subscribe();
    http.expectOne(`${TEST_API}/finance/students/7/payments`).flush([]);
    service.applyCredit(7).subscribe();
    const credit = http.expectOne(`${TEST_API}/finance/students/7/credit/apply`);
    expect(credit.request.method).toBe('POST');
    credit.flush({});
  });

  it('conceptos: lista, crea y actualiza', () => {
    service.concepts(true).subscribe();
    http.expectOne(`${TEST_API}/finance/concepts?active=true`).flush([]);
    service.concepts().subscribe();
    http.expectOne(`${TEST_API}/finance/concepts`).flush([]);
    const dto = { name: 'Pensión', amount: 300000, taxRate: 0 };
    service.createConcept(dto).subscribe();
    const post = http.expectOne(`${TEST_API}/finance/concepts`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(dto);
    post.flush({});
    service.updateConcept(3, dto).subscribe();
    expect(http.expectOne(`${TEST_API}/finance/concepts/3`).request.method).toBe('PUT');
    service.tuition(2026).subscribe();
    http.expectOne(`${TEST_API}/finance/tuition?year=2026`).flush({});
    http.match(() => true).forEach((r) => r.flush({}));
  });

  it('cobro individual, resumen de recaudo y cuenta de cobro', () => {
    service.createCharge({ studentId: 7, conceptId: 1, period: '2026-03' }).subscribe();
    const post = http.expectOne(`${TEST_API}/finance/charges`);
    expect(post.request.method).toBe('POST');
    post.flush({});
    service.chargesSummary().subscribe();
    http.expectOne(`${TEST_API}/finance/charges/summary?limit=20`).flush([]);
    service.chargeDocument(4).subscribe();
    http.expectOne(`${TEST_API}/finance/charges/4/document`).flush({});
  });

  it('lista pagos paginados', async () => {
    const result = firstValueFrom(service.payments({ page: 1, pageSize: 20, method: 'nequi' }));
    const req = http.expectOne((r) => r.url === `${TEST_API}/finance/payments`);
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.params.get('method')).toBe('nequi');
    req.flush({ items: [], total: 0, page: 1, limit: 20 });
    expect(await result).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
  });

  it('gastos y categorías de gasto', async () => {
    const list = firstValueFrom(service.expenses({ page: 1, pageSize: 10, categoryId: 2 }));
    const req = http.expectOne((r) => r.url === `${TEST_API}/finance/expenses`);
    expect(req.request.params.get('categoryId')).toBe('2');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush({ items: [{ id: 1 }], total: 1, page: 1, limit: 10 });
    expect((await list).pageSize).toBe(10);

    service.createExpense({ description: 'Luz', amount: 1000 }).subscribe();
    const post = http.expectOne(`${TEST_API}/finance/expenses`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ description: 'Luz', amount: 1000 });
    post.flush({});
    service.expenseCategories().subscribe();
    http.expectOne(`${TEST_API}/finance/expense-categories`).flush([]);
    service.createExpenseCategory('Aseo').subscribe();
    expect(http.expectOne(`${TEST_API}/finance/expense-categories`).request.body).toEqual({
      name: 'Aseo',
    });
    service.renameExpenseCategory(2, 'Servicios').subscribe();
    const put = http.expectOne(`${TEST_API}/finance/expense-categories/2`);
    expect(put.request.method).toBe('PUT');
    http.match(() => true).forEach((r) => r.flush({}));
  });
});

describe('utilidades de finanzas', () => {
  it('lee el nombre de Content-Disposition', () => {
    expect(fileNameFromDisposition('attachment; filename="A B.txt"', 'x')).toBe('A B.txt');
    expect(fileNameFromDisposition(null, 'x.txt')).toBe('x.txt');
  });

  it('formatea meses y días sin desfase horario', () => {
    expect(monthLabel('2026-03')).toBe('marzo 2026');
    expect(formatDay('2026-03-01')).toBe('01/03/2026');
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(currentMonth(new Date(2026, 11, 31))).toBe('2026-12');
  });
});
