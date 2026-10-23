import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import { AccountingService } from './accounting.service';

describe('AccountingService', () => {
  let service: AccountingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideTestHttp() });
    service = TestBed.inject(AccountingService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lista el PUC en árbol', async () => {
    const promise = firstValueFrom(service.accountTree());
    const req = http.expectOne((r) => r.url === `${TEST_API}/accounting/accounts`);
    expect(req.request.params.get('tree')).toBe('true');
    req.flush([]);
    await expect(promise).resolves.toEqual([]);
  });

  it('mapea el paginado de terceros (limit → pageSize) y omite filtros vacíos', async () => {
    const promise = firstValueFrom(
      service.thirdParties({ search: 'papel', isActive: null, page: 2, pageSize: 10 }),
    );
    const req = http.expectOne((r) => r.url === `${TEST_API}/accounting/third-parties`);
    expect(req.request.params.get('search')).toBe('papel');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.has('isActive')).toBe(false);
    req.flush({ items: [], total: 0, page: 2, limit: 10 });
    await expect(promise).resolves.toEqual({ items: [], total: 0, page: 2, pageSize: 10 });
  });

  it('reabre un periodo con motivo', () => {
    service.reopenPeriod(3, 'Ajuste').subscribe();
    const req = http.expectOne(`${TEST_API}/accounting/periods/3/reopen`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reason: 'Ajuste' });
    req.flush({});
  });

  it('crea comprobantes como borrador o contabilizados', () => {
    service
      .createJournalEntry({
        date: '2026-10-01',
        type: 'CE',
        description: 'x',
        lines: [],
        postImmediately: false,
      })
      .subscribe();
    const req = http.expectOne(`${TEST_API}/accounting/journal-entries`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.postImmediately).toBe(false);
    req.flush({});
  });

  it('anula y revierte asientos', () => {
    service.voidEntry(7, 'Error').subscribe();
    http.expectOne(`${TEST_API}/accounting/journal-entries/7/void`).flush({});
    service.reverseEntry(7, { reason: 'Error', type: 'NI' }).subscribe();
    const req = http.expectOne(`${TEST_API}/accounting/journal-entries/7/reverse`);
    expect(req.request.body).toEqual({ reason: 'Error', type: 'NI' });
    req.flush({});
  });

  it('consulta reportes con sus filtros', () => {
    service.trialBalance({ from: '2026-01-01', to: '2026-01-31', level: 2 }).subscribe();
    const tb = http.expectOne((r) => r.url === `${TEST_API}/accounting/reports/trial-balance`);
    expect(tb.request.params.get('level')).toBe('2');
    tb.flush({});
    service.balanceSheet('2026-12-31').subscribe();
    const bs = http.expectOne((r) => r.url === `${TEST_API}/accounting/reports/balance-sheet`);
    expect(bs.request.params.get('asOf')).toBe('2026-12-31');
    bs.flush({});
  });

  it('exporta reportes en CSV como blob', async () => {
    const promise = firstValueFrom(
      service.exportReport('auxiliary', { from: '2026-01-01', to: '2026-01-31', accountId: 5 }),
    );
    const req = http.expectOne((r) => r.url === `${TEST_API}/accounting/reports/auxiliary/export`);
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.get('format')).toBe('csv');
    expect(req.request.params.get('accountId')).toBe('5');
    req.flush(new Blob(['a;b']));
    await expect(promise).resolves.toBeInstanceOf(Blob);
  });

  it.each(['xlsx', 'pdf'] as const)('exporta reportes en %s como blob', async (format) => {
    const promise = firstValueFrom(
      service.exportReport('balance-sheet', { from: '', to: '', asOf: '2026-12-31' }, format),
    );
    const req = http.expectOne(
      (r) => r.url === `${TEST_API}/accounting/reports/balance-sheet/export`,
    );
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.get('format')).toBe(format);
    expect(req.request.params.get('asOf')).toBe('2026-12-31');
    req.flush(new Blob(['%PDF']));
    await expect(promise).resolves.toBeInstanceOf(Blob);
  });

  it('parametriza claves de contabilización codificando la clave', () => {
    service.setPostingRule('payment.debit.method.nequi', 12).subscribe();
    const req = http.expectOne(`${TEST_API}/accounting/posting-rules/payment.debit.method.nequi`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ accountId: 12 });
    req.flush({});
  });
  it('consulta el dashboard del mes y omite el mes vacío', () => {
    service.dashboard('2026-10').subscribe();
    const req = http.expectOne((r) => r.url === `${TEST_API}/accounting/dashboard`);
    expect(req.request.params.get('month')).toBe('2026-10');
    req.flush({});
    service.dashboard(null).subscribe();
    const req2 = http.expectOne((r) => r.url === `${TEST_API}/accounting/dashboard`);
    expect(req2.request.params.has('month')).toBe(false);
    req2.flush({});
  });

  it('CRUD de cuentas y siembra del PUC', () => {
    service.transactionalAccounts().subscribe();
    const list = http.expectOne((r) => r.url === `${TEST_API}/accounting/accounts`);
    expect(list.request.params.get('transactional')).toBe('true');
    list.flush([]);

    service
      .createAccount({ code: '110505', name: 'Caja', isTransactional: true, parentId: null })
      .subscribe();
    const create = http.expectOne(`${TEST_API}/accounting/accounts`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({
      code: '110505',
      name: 'Caja',
      isTransactional: true,
      parentId: null,
    });
    create.flush({});

    service.updateAccount(4, { name: 'Caja menor' }).subscribe();
    const update = http.expectOne(`${TEST_API}/accounting/accounts/4`);
    expect(update.request.method).toBe('PATCH');
    update.flush({});

    service.deleteAccount(4).subscribe();
    expect(http.expectOne(`${TEST_API}/accounting/accounts/4`).request.method).toBe('DELETE');

    service.seedPuc().subscribe();
    const seed = http.expectOne(`${TEST_API}/accounting/accounts/seed-puc`);
    expect(seed.request.method).toBe('POST');
    seed.flush({ inserted: 1, skipped: 0 });
  });

  it('gestiona terceros (crear, editar, activar/desactivar, eliminar)', () => {
    const dto = { documentType: 'NIT' as const, documentNumber: '900123456', name: 'Papelería' };
    service.createThirdParty(dto).subscribe();
    const create = http.expectOne(`${TEST_API}/accounting/third-parties`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(dto);
    create.flush({});
    service.updateThirdParty(3, dto).subscribe();
    expect(http.expectOne(`${TEST_API}/accounting/third-parties/3`).request.method).toBe('PATCH');
    service.setThirdPartyActive(3, false).subscribe();
    expect(http.expectOne(`${TEST_API}/accounting/third-parties/3/deactivate`).request.method).toBe(
      'POST',
    );
    service.setThirdPartyActive(3, true).subscribe();
    expect(http.expectOne(`${TEST_API}/accounting/third-parties/3/activate`).request.method).toBe(
      'POST',
    );
    service.deleteThirdParty(3).subscribe();
    expect(http.expectOne(`${TEST_API}/accounting/third-parties/3`).request.method).toBe('DELETE');
  });

  it('periodos: listar, actual, crear y cerrar', () => {
    service.periods().subscribe();
    http.expectOne(`${TEST_API}/accounting/periods`).flush([]);
    service.currentPeriod().subscribe();
    http.expectOne(`${TEST_API}/accounting/periods/current`).flush(null);
    service
      .createPeriod({ name: 'Nov', startDate: '2026-11-01', endDate: '2026-11-30' })
      .subscribe();
    const create = http.expectOne(`${TEST_API}/accounting/periods`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body.startDate).toBe('2026-11-01');
    create.flush({});
    service.closePeriod(2).subscribe();
    expect(http.expectOne(`${TEST_API}/accounting/periods/2/close`).request.method).toBe('POST');
  });

  it('lista comprobantes con filtros y mapea el paginado', async () => {
    const promise = firstValueFrom(
      service.journalEntries({
        from: '2026-10-01',
        to: null,
        type: 'RC',
        status: 'posted',
        page: 1,
        pageSize: 20,
      }),
    );
    const req = http.expectOne((r) => r.url === `${TEST_API}/accounting/journal-entries`);
    expect(req.request.params.get('from')).toBe('2026-10-01');
    expect(req.request.params.has('to')).toBe(false);
    expect(req.request.params.get('type')).toBe('RC');
    expect(req.request.params.get('status')).toBe('posted');
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.params.has('pageSize')).toBe(false);
    req.flush({ items: [], total: 0, page: 1, limit: 20 });
    await expect(promise).resolves.toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
  });

  it('borradores: consultar, actualizar, contabilizar y eliminar', () => {
    service.journalEntry(5).subscribe();
    expect(http.expectOne(`${TEST_API}/accounting/journal-entries/5`).request.method).toBe('GET');
    service
      .updateDraft(5, { date: '2026-10-01', type: 'CE', description: 'x', lines: [] })
      .subscribe();
    expect(http.expectOne(`${TEST_API}/accounting/journal-entries/5`).request.method).toBe('PUT');
    service.postEntry(5).subscribe();
    expect(http.expectOne(`${TEST_API}/accounting/journal-entries/5/post`).request.method).toBe(
      'POST',
    );
    service.deleteDraft(5).subscribe();
    expect(http.expectOne(`${TEST_API}/accounting/journal-entries/5`).request.method).toBe(
      'DELETE',
    );
  });

  it('libros diario, mayor, auxiliar y estado de resultados con sus parámetros', () => {
    service
      .generalJournal({ from: '2026-10-01', to: '2026-10-31', type: 'CE', page: 2, pageSize: 50 })
      .subscribe();
    const journal = http.expectOne((r) => r.url === `${TEST_API}/accounting/reports/journal`);
    expect(journal.request.params.get('type')).toBe('CE');
    expect(journal.request.params.get('page')).toBe('2');
    expect(journal.request.params.get('limit')).toBe('50');
    journal.flush({});

    service.generalLedger({ from: '2026-10-01', to: '2026-10-31', accountId: null }).subscribe();
    const ledger = http.expectOne((r) => r.url === `${TEST_API}/accounting/reports/ledger`);
    expect(ledger.request.params.has('accountId')).toBe(false);
    ledger.flush({});

    service
      .auxiliaryLedger({ from: '2026-10-01', to: '2026-10-31', accountId: 5, thirdPartyId: 7 })
      .subscribe();
    const aux = http.expectOne((r) => r.url === `${TEST_API}/accounting/reports/auxiliary`);
    expect(aux.request.params.get('accountId')).toBe('5');
    expect(aux.request.params.get('thirdPartyId')).toBe('7');
    aux.flush({});

    service.incomeStatement({ from: '2026-01-01', to: '2026-12-31' }).subscribe();
    const income = http.expectOne(
      (r) => r.url === `${TEST_API}/accounting/reports/income-statement`,
    );
    expect(income.request.params.get('from')).toBe('2026-01-01');
    expect(income.request.params.get('to')).toBe('2026-12-31');
    income.flush({});
  });

  it('consulta y elimina parametrizaciones (clave codificada en la URL)', () => {
    service.postingRules().subscribe();
    http.expectOne(`${TEST_API}/accounting/posting-rules`).flush({ supportedKeys: [], rules: [] });
    service.deletePostingRule('expense.debit.category.aseo y cafetería').subscribe();
    const req = http.expectOne((r) =>
      r.urlWithParams.endsWith(
        '/accounting/posting-rules/expense.debit.category.aseo%20y%20cafeter%C3%ADa',
      ),
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
