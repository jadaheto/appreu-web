import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthUser, ConfirmService, SessionStore } from '../../../core';
import { makeUser, provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import { flattenTree } from './accounts/chart-of-accounts-page';
import { ChartOfAccountsPage } from './accounts/chart-of-accounts-page';
import { AccountingDashboardPage } from './dashboard/accounting-dashboard-page';
import { computeTotals, JournalEntryEditorPage } from './entries/journal-entry-editor-page';
import { buildGroups } from './posting-rules/posting-rules-page';
import { ReportsPage } from './reports/reports-page';
import { Account, JournalEntry } from '../data-access/accounting.models';
import { isoDate, monthRange } from '../data-access/accounting.labels';
import { JournalEntriesPage } from './entries/journal-entries-page';
import { PostingRulesPage } from './posting-rules/posting-rules-page';

function account(id: number, code: string, children: Account[] = []): Account {
  return {
    id,
    code,
    name: `Cuenta ${code}`,
    type: 'activo',
    nature: 'debito',
    level: 1,
    levelName: 'Clase',
    isTransactional: children.length === 0,
    parentId: null,
    children,
  };
}

/**
 * Deja correr efectos y microtareas sin esperar a que terminen las peticiones
 * pendientes (`whenStable` se cuelga en zoneless si queda una petición abierta).
 */
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 3; i++) {
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r));
  }
  fixture.detectChanges();
}

const apiPage = <T>(items: T[], limit = 20) => ({ items, total: items.length, page: 1, limit });

function entry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 5,
    periodId: 1,
    date: '2026-10-05',
    type: 'CE',
    typeLabel: 'Comprobante de Egreso',
    number: null,
    displayNumber: null,
    description: 'Servicios públicos',
    status: 'draft',
    totalDebit: 50000,
    totalCredit: 50000,
    createdBy: 1,
    createdAt: null,
    postedAt: null,
    postedBy: null,
    voidedAt: null,
    voidedBy: null,
    voidReason: null,
    sourceType: null,
    sourceId: null,
    reversalOfId: null,
    lines: [
      {
        accountId: 10,
        accountCode: '513525',
        accountName: 'Acueducto',
        thirdPartyId: null,
        thirdPartyName: null,
        description: null,
        debit: 50000,
        credit: 0,
      },
      {
        accountId: 11,
        accountCode: '110505',
        accountName: 'Caja',
        thirdPartyId: null,
        thirdPartyName: null,
        description: null,
        debit: 0,
        credit: 50000,
      },
    ],
    ...overrides,
  };
}

describe('Contabilidad: utilidades', () => {
  it('computeTotals suma en centavos y detecta el cuadre', () => {
    const t = computeTotals([
      { accountId: 1, debit: 0.1 },
      { accountId: 2, debit: 0.2 },
      { accountId: 3, credit: 0.3 },
      {},
    ]);
    expect(t.debit).toBe(0.3);
    expect(t.credit).toBe(0.3);
    expect(t.balanced).toBe(true);
    expect(t.lines).toBe(3);
    expect(
      computeTotals([
        { accountId: 1, debit: 0 },
        { accountId: 2, credit: 0 },
      ]).balanced,
    ).toBe(false);
  });

  it('flattenTree respeta los nodos expandidos', () => {
    const tree = [account(1, '1', [account(2, '11', [account(3, '1105')])])];
    expect(flattenTree(tree, null).map((r) => r.code)).toEqual(['1', '11', '1105']);
    expect(flattenTree(tree, new Set([1])).map((r) => [r.code, r.depth])).toEqual([
      ['1', 0],
      ['11', 1],
    ]);
  });

  it('buildGroups agrupa claves por evento y asocia reglas variables', () => {
    const groups = buildGroups(
      [
        { example: 'payment.debit.default', description: 'Débito' },
        { example: 'payment.debit.method.transferencia', description: 'Por método' },
        { example: 'payroll.credit.net', description: 'Neto' },
      ],
      [
        {
          key: 'payment.debit.method.nequi',
          accountId: 1,
          accountCode: '1110',
          accountName: 'Bancos',
        },
        { key: 'payment.debit.default', accountId: 2, accountCode: '1105', accountName: 'Caja' },
      ],
    );
    expect(groups.map((g) => g.id)).toEqual(['payment', 'payroll']);
    expect(groups[0].slots[0].rules.map((r) => r.key)).toEqual(['payment.debit.default']);
    expect(groups[0].slots[1].prefix).toBe('payment.debit.method.');
    expect(groups[0].slots[1].rules.map((r) => r.key)).toEqual(['payment.debit.method.nequi']);
  });
});

describe('Contabilidad: páginas', () => {
  let http: HttpTestingController;
  let confirmAnswer = true;
  let navigate: ReturnType<typeof vi.fn>;

  function setup<T>(
    cmp: new () => T,
    params: Record<string, string> = {},
    query: Record<string, string> = {},
    role: AuthUser['role'] | null = null,
  ) {
    TestBed.configureTestingModule({
      providers: [
        ...provideTestHttp(),
        { provide: ConfirmService, useValue: { ask: () => Promise.resolve(confirmAnswer) } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(params),
              queryParamMap: convertToParamMap(query),
            },
            paramMap: of(convertToParamMap(params)),
          },
        },
      ],
    });
    if (role) {
      TestBed.inject(SessionStore).set({
        token: 't',
        expiresAt: Date.now() + 60_000,
        tenant: null,
        user: makeUser({ role }),
      });
    }
    navigate = vi.fn().mockResolvedValue(true);
    TestBed.inject(Router).navigate = navigate as unknown as Router['navigate'];
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(cmp);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  const click = (root: HTMLElement, text: string) => {
    const btn = Array.from(root.querySelectorAll<HTMLElement>('button, a')).find((b) =>
      b.textContent?.includes(text),
    );
    if (!btn) throw new Error(`No se encontró el botón «${text}»`);
    btn.click();
  };

  beforeEach(() => (confirmAnswer = true));
  afterEach(() => http.verify());

  // ---- Dashboard ----
  it('dashboard: muestra KPIs, últimos asientos y periodo actual', async () => {
    const { fixture, el } = setup(AccountingDashboardPage);
    await settle(fixture);
    const req = http.expectOne((r) => r.url === `${TEST_API}/accounting/dashboard`);
    expect(req.request.params.get('month')).toMatch(/^\d{4}-\d{2}$/);
    req.flush({
      month: '2026-10',
      from: '2026-10-01',
      to: '2026-10-31',
      income: 5_000_000,
      costs: 0,
      expenses: 1_000_000,
      netIncome: 4_000_000,
      entriesCount: 3,
      latestEntries: [
        entry({
          id: 1,
          date: '2026-10-01',
          type: 'RC',
          displayNumber: 'RC-000001',
          description: 'Pensión',
          status: 'posted',
        }),
      ],
      currentPeriod: {
        id: 1,
        name: 'Octubre 2026',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        status: 'open',
      },
    });
    await settle(fixture);
    expect(el.querySelector('ui-stat-card .value')?.textContent).toContain('5.000.000');
    expect(el.textContent).toContain('RC-000001');
    expect(el.textContent).toContain('01/10/2026');
    expect(el.textContent).toContain('Octubre 2026');
  });

  // ---- Plan de cuentas ----
  it('plan de cuentas: estado vacío; sin rol admin no ofrece cargar el PUC', async () => {
    const { fixture, el } = setup(ChartOfAccountsPage);
    await settle(fixture);
    const req = http.expectOne((r) => r.url === `${TEST_API}/accounting/accounts`);
    expect(req.request.params.get('tree')).toBe('true');
    req.flush([]);
    await settle(fixture);
    expect(el.textContent).toContain('Plan de cuentas vacío');
    expect(el.textContent).not.toContain('Cargar PUC base');
  });

  it('plan de cuentas: árbol con clases expandidas y expandir/contraer', async () => {
    const { fixture, el } = setup(ChartOfAccountsPage);
    await settle(fixture);
    http
      .expectOne((r) => r.url === `${TEST_API}/accounting/accounts`)
      .flush([account(1, '1', [account(2, '11', [account(3, '1105')])])]);
    await settle(fixture);
    expect(el.querySelectorAll('tbody tr').length).toBe(2);
    expect(el.textContent).toContain('Cuenta 11');
    expect(el.textContent).not.toContain('Cuenta 1105');

    el.querySelector<HTMLButtonElement>('button[aria-label="Expandir 11"]')!.click();
    await settle(fixture);
    expect(el.textContent).toContain('Cuenta 1105');

    click(el, 'Contraer todo');
    await settle(fixture);
    expect(el.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('plan de cuentas: admin carga el PUC base tras confirmar y recarga el árbol', async () => {
    const { fixture, el } = setup(ChartOfAccountsPage, {}, {}, 'admin');
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/accounting/accounts`).flush([]);
    await settle(fixture);
    click(el, 'Cargar PUC base Colombia');
    await settle(fixture);
    const seed = http.expectOne(`${TEST_API}/accounting/accounts/seed-puc`);
    expect(seed.request.method).toBe('POST');
    seed.flush({ inserted: 120, skipped: 0 });
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/accounting/accounts`).flush([account(1, '1')]);
    await settle(fixture);
    expect(el.textContent).toContain('Cuenta 1');
  });

  it('plan de cuentas: crea una cuenta con padre inferido y muestra el error de la API', async () => {
    const { fixture } = setup(ChartOfAccountsPage);
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/accounting/accounts`).flush([account(1, '1')]);
    await settle(fixture);
    const page = fixture.componentInstance as unknown as {
      openCreate(): void;
      save(): Promise<void>;
      form: { patchValue(v: object): void; invalid: boolean };
      serverError(): string | null;
      modalOpen(): boolean;
    };
    page.openCreate();
    page.form.patchValue({ code: '11a', name: 'Caja' });
    expect(page.form.invalid).toBe(true);
    await page.save();
    http.expectNone(`${TEST_API}/accounting/accounts`);

    page.form.patchValue({ code: '110505', name: ' Caja general ', isTransactional: true });
    let saving = page.save();
    let req = http.expectOne(`${TEST_API}/accounting/accounts`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      code: '110505',
      name: 'Caja general',
      isTransactional: true,
    });
    req.flush(
      { statusCode: 409, code: 'CONFLICT', message: 'El código 110505 ya existe.' },
      { status: 409, statusText: 'Conflict' },
    );
    await saving;
    expect(page.serverError()).toBe('El código 110505 ya existe.');
    expect(page.modalOpen()).toBe(true);

    page.form.patchValue({ code: '110510' });
    saving = page.save();
    req = http.expectOne(`${TEST_API}/accounting/accounts`);
    req.flush(account(4, '110510'));
    await saving;
    expect(page.modalOpen()).toBe(false);
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/accounting/accounts`).flush([account(1, '1')]);
  });

  it('plan de cuentas: elimina una cuenta solo tras confirmar', async () => {
    const { fixture, el } = setup(ChartOfAccountsPage);
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/accounting/accounts`).flush([account(1, '1')]);
    await settle(fixture);

    confirmAnswer = false;
    el.querySelector<HTMLButtonElement>('button[aria-label="Eliminar cuenta"]')!.click();
    await settle(fixture);
    http.expectNone(`${TEST_API}/accounting/accounts/1`);

    confirmAnswer = true;
    el.querySelector<HTMLButtonElement>('button[aria-label="Eliminar cuenta"]')!.click();
    await settle(fixture);
    const del = http.expectOne(`${TEST_API}/accounting/accounts/1`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/accounting/accounts`).flush([]);
  });

  it('plan de cuentas: la búsqueda consulta la API y muestra resultados planos', async () => {
    const { fixture, el } = setup(ChartOfAccountsPage);
    await settle(fixture);
    http
      .expectOne((r) => r.url === `${TEST_API}/accounting/accounts`)
      .flush([account(1, '1', [account(2, '11')])]);
    await settle(fixture);
    (fixture.componentInstance as unknown as { search: { set(v: string): void } }).search.set(
      'caja',
    );
    await settle(fixture);
    const req = http.expectOne((r) => r.url === `${TEST_API}/accounting/accounts`);
    expect(req.request.params.get('search')).toBe('caja');
    req.flush([account(3, '110505')]);
    await settle(fixture);
    expect(el.querySelectorAll('tbody tr').length).toBe(1);
    expect(el.textContent).toContain('Cuenta 110505');
  });

  // ---- Comprobantes ----
  it('comprobantes: filtra por el mes actual y aplica tipo/estado', async () => {
    const { fixture, el } = setup(JournalEntriesPage);
    await settle(fixture);
    const { from, to } = monthRange();
    let req = http.expectOne((r) => r.url === `${TEST_API}/accounting/journal-entries`);
    expect(req.request.params.get('from')).toBe(from);
    expect(req.request.params.get('to')).toBe(to);
    expect(req.request.params.get('limit')).toBe('20');
    req.flush(apiPage([entry({ displayNumber: 'CE-000003', status: 'posted' })]));
    await settle(fixture);
    expect(el.textContent).toContain('CE-000003');
    expect(el.textContent).toContain('Contabilizado');

    const page = fixture.componentInstance as unknown as {
      type: { set(v: string): void };
      status: { set(v: string): void };
      apply(): void;
    };
    page.type.set('RC');
    page.status.set('draft');
    page.apply();
    await settle(fixture);
    req = http.expectOne((r) => r.url === `${TEST_API}/accounting/journal-entries`);
    expect(req.request.params.get('type')).toBe('RC');
    expect(req.request.params.get('status')).toBe('draft');
    req.flush(apiPage([]));
    await settle(fixture);
    expect(el.textContent).toContain('Sin asientos en este rango de fechas');
  });

  it('comprobantes: rango invertido no consulta la API', async () => {
    const { fixture } = setup(JournalEntriesPage);
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/accounting/journal-entries`).flush(apiPage([]));
    const page = fixture.componentInstance as unknown as {
      from: { set(v: string): void };
      to: { set(v: string): void };
      apply(): void;
    };
    page.from.set('2026-10-31');
    page.to.set('2026-10-01');
    page.apply();
    await settle(fixture);
    http.expectNone((r) => r.url === `${TEST_API}/accounting/journal-entries`);
  });

  // ---- Editor ----
  function flushEditorCatalogs() {
    const accounts = http.expectOne((r) => r.url === `${TEST_API}/accounting/accounts`);
    expect(accounts.request.params.get('transactional')).toBe('true');
    accounts.flush([
      { ...account(10, '110505'), isTransactional: true },
      { ...account(11, '413502'), type: 'ingreso', isTransactional: true },
    ]);
    const parties = http.expectOne((r) => r.url === `${TEST_API}/accounting/third-parties`);
    expect(parties.request.params.get('isActive')).toBe('true');
    parties.flush(apiPage([], 200));
    http.expectOne(`${TEST_API}/accounting/periods`).flush([]);
  }

  type EditorApi = {
    form: {
      controls: { type: { value: string } };
      patchValue(v: object): void;
    };
    lines: {
      length: number;
      at(i: number): {
        patchValue(v: object): void;
        value: { debit: number | null; credit: number | null };
      };
    };
    save(mode: 'draft' | 'post'): Promise<void>;
    serverError(): string | null;
  };

  it('editor: totales en vivo y Contabilizar deshabilitado hasta cuadrar', async () => {
    const { fixture, el } = setup(JournalEntryEditorPage, {}, { tipo: 'RC' });
    await settle(fixture);
    flushEditorCatalogs();
    await settle(fixture);

    const page = fixture.componentInstance as unknown as EditorApi;
    expect(page.form.controls.type.value).toBe('RC');
    const submit = () => el.querySelector<HTMLButtonElement>('button[type=submit]')!;
    expect(submit().disabled).toBe(true);

    page.lines.at(0).patchValue({ accountId: 10, debit: 150000 });
    page.lines.at(1).patchValue({ accountId: 11, credit: 100000 });
    await settle(fixture);
    expect(el.querySelector('[data-testid=total-debit]')?.textContent).toContain('150.000');
    expect(el.textContent).toContain('Sin cuadrar');
    expect(submit().disabled).toBe(true);

    page.lines.at(1).patchValue({ credit: 150000 });
    await settle(fixture);
    expect(el.textContent).toContain('Cuadrado');
    expect(submit().disabled).toBe(false);
  });

  it('editor: débito y crédito son excluyentes en la misma línea', async () => {
    const { fixture } = setup(JournalEntryEditorPage);
    await settle(fixture);
    flushEditorCatalogs();
    const page = fixture.componentInstance as unknown as EditorApi;
    page.lines.at(0).patchValue({ accountId: 10, debit: 1000 });
    page.lines.at(0).patchValue({ credit: 500 });
    expect(page.lines.at(0).value.debit).toBeNull();
    expect(page.lines.at(0).value.credit).toBe(500);
  });

  it('editor: exige dos líneas y crea el asiento contabilizado', async () => {
    const { fixture } = setup(JournalEntryEditorPage);
    await settle(fixture);
    flushEditorCatalogs();
    const page = fixture.componentInstance as unknown as EditorApi;
    page.form.patchValue({ description: 'Pago de servicios', date: '2026-10-05' });
    page.lines.at(0).patchValue({ accountId: 10, debit: 1000 });
    await page.save('draft');
    expect(page.serverError()).toContain('al menos dos líneas');
    http.expectNone(`${TEST_API}/accounting/journal-entries`);

    page.lines.at(1).patchValue({ accountId: 11, credit: 1000 });
    const saving = page.save('post');
    const req = http.expectOne(`${TEST_API}/accounting/journal-entries`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      date: '2026-10-05',
      type: 'CE',
      description: 'Pago de servicios',
      postImmediately: true,
      lines: [
        { accountId: 10, thirdPartyId: null, debit: 1000, credit: 0 },
        { accountId: 11, thirdPartyId: null, debit: 0, credit: 1000 },
      ],
    });
    req.flush(entry({ id: 9, status: 'posted', displayNumber: 'CE-000009' }));
    await saving;
    expect(navigate).toHaveBeenCalledWith(['/admin/contabilidad', 'asientos', 9]);
  });

  it('editor: carga un borrador, lo actualiza y lo contabiliza', async () => {
    const { fixture } = setup(JournalEntryEditorPage, { id: '5' });
    await settle(fixture);
    flushEditorCatalogs();
    http.expectOne(`${TEST_API}/accounting/journal-entries/5`).flush(entry());
    await settle(fixture);
    const page = fixture.componentInstance as unknown as EditorApi & {
      form: { getRawValue(): { description: string; lines: unknown[] } };
    };
    expect(page.form.getRawValue().description).toBe('Servicios públicos');
    expect(page.form.getRawValue().lines.length).toBe(2);

    const saving = page.save('post');
    const put = http.expectOne(`${TEST_API}/accounting/journal-entries/5`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.periodId).toBe(1);
    put.flush(entry());
    await new Promise((r) => setTimeout(r));
    http
      .expectOne(`${TEST_API}/accounting/journal-entries/5/post`)
      .flush(entry({ status: 'posted', displayNumber: 'CE-000005' }));
    await saving;
    expect(navigate).toHaveBeenCalledWith(['/admin/contabilidad', 'asientos', 5]);
  });

  it('editor: un comprobante contabilizado no es editable', async () => {
    const { fixture, el } = setup(JournalEntryEditorPage, { id: '5' });
    await settle(fixture);
    flushEditorCatalogs();
    http
      .expectOne(`${TEST_API}/accounting/journal-entries/5`)
      .flush(entry({ status: 'posted', displayNumber: 'CE-000005' }));
    await settle(fixture);
    expect(el.textContent).toContain('Este comprobante no se puede editar');
    expect(el.querySelector('form')).toBeNull();
  });

  // ---- Reglas de contabilización ----
  const rules = {
    supportedKeys: [
      { example: 'payment.debit.default', description: 'Caja por defecto' },
      { example: 'payment.debit.method.transferencia', description: 'Caja por método' },
    ],
    rules: [
      {
        key: 'payment.debit.method.nequi',
        accountId: 10,
        accountCode: '111005',
        accountName: 'Bancos',
      },
    ],
  };

  it('reglas: agrupa por evento y marca las claves sin parametrizar', async () => {
    const { fixture, el } = setup(PostingRulesPage);
    await settle(fixture);
    http.expectOne(`${TEST_API}/accounting/posting-rules`).flush(rules);
    http.expectOne((r) => r.url === `${TEST_API}/accounting/accounts`).flush([]);
    await settle(fixture);
    expect(el.textContent).toContain('Pagos recibidos (Finanzas)');
    expect(el.textContent).toContain('Sin parametrizar');
    expect(el.textContent).toContain('111005 — Bancos');
  });

  it('reglas: agrega una clave variable con sufijo y quita una tras confirmar', async () => {
    const { fixture, el } = setup(PostingRulesPage);
    await settle(fixture);
    http.expectOne(`${TEST_API}/accounting/posting-rules`).flush(rules);
    http
      .expectOne((r) => r.url === `${TEST_API}/accounting/accounts`)
      .flush([{ ...account(10, '111005'), isTransactional: true }]);
    await settle(fixture);
    const page = fixture.componentInstance as unknown as {
      openSlot(slot: unknown): void;
      groups(): { slots: unknown[] }[];
      form: { patchValue(v: object): void };
      save(): Promise<void>;
      modalOpen(): boolean;
    };
    page.openSlot(page.groups()[0].slots[1]);
    page.form.patchValue({ suffix: 'daviplata', accountId: 10 });
    const saving = page.save();
    const put = http.expectOne(
      `${TEST_API}/accounting/posting-rules/payment.debit.method.daviplata`,
    );
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ accountId: 10 });
    put.flush({
      key: 'payment.debit.method.daviplata',
      accountId: 10,
      accountCode: '111005',
      accountName: 'Bancos',
    });
    await saving;
    expect(page.modalOpen()).toBe(false);
    await settle(fixture);
    http.expectOne(`${TEST_API}/accounting/posting-rules`).flush(rules);
    await settle(fixture);

    el.querySelector<HTMLButtonElement>('button[aria-label="Quitar parametrización"]')!.click();
    await settle(fixture);
    const del = http.expectOne(`${TEST_API}/accounting/posting-rules/payment.debit.method.nequi`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
    await settle(fixture);
    http.expectOne(`${TEST_API}/accounting/posting-rules`).flush({ ...rules, rules: [] });
  });

  // ---- Reportes ----
  const trialBalance = (from: string, to: string) => ({
    from,
    to,
    level: null,
    rows: [
      {
        code: '110505',
        name: 'Caja general',
        type: 'activo',
        level: 5,
        openingBalance: 0,
        debit: 1000,
        credit: 0,
        closingBalance: 1000,
        debitBalance: 1000,
        creditBalance: 0,
      },
    ],
    totals: { debit: 1000, credit: 1000, debitBalance: 1000, creditBalance: 1000 },
    balanced: true,
  });

  it('reportes: genera el balance de prueba del mes al entrar', async () => {
    const { fixture, el } = setup(ReportsPage, { tipo: 'balance-prueba' });
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/accounting/accounts`).flush([]);
    const { from, to } = monthRange();
    const req = http.expectOne((r) => r.url === `${TEST_API}/accounting/reports/trial-balance`);
    expect(req.request.params.get('from')).toBe(from);
    expect(req.request.params.get('to')).toBe(to);
    expect(req.request.params.has('level')).toBe(false);
    req.flush(trialBalance(from, to));
    await settle(fixture);
    expect(el.textContent).toContain('Caja general');
    expect(el.textContent).toContain('Cuadrado');
    expect(el.querySelector('ui-printable-sheet')).not.toBeNull();
  });

  it('reportes: el auxiliar exige cuenta antes de consultar', async () => {
    const { fixture, el } = setup(ReportsPage, { tipo: 'auxiliar' });
    await settle(fixture);
    http
      .expectOne((r) => r.url === `${TEST_API}/accounting/accounts`)
      .flush([{ ...account(10, '110505'), isTransactional: true }]);
    http.expectOne((r) => r.url === `${TEST_API}/accounting/third-parties`).flush(apiPage([], 200));
    await settle(fixture);
    http.expectNone((r) => r.url.includes('/accounting/reports/'));
    expect(el.textContent).toContain('Selecciona la cuenta del libro auxiliar.');

    const page = fixture.componentInstance as unknown as {
      accountId: { set(v: number): void };
      generate(): void;
    };
    page.accountId.set(10);
    page.generate();
    await settle(fixture);
    const req = http.expectOne((r) => r.url === `${TEST_API}/accounting/reports/auxiliary`);
    expect(req.request.params.get('accountId')).toBe('10');
    req.flush({
      from: '2026-10-01',
      to: '2026-10-31',
      account: account(10, '110505'),
      thirdPartyId: null,
      openingBalance: 0,
      lines: [],
      totals: { debit: 0, credit: 0 },
      closingBalance: 0,
    });
    await settle(fixture);
    expect(el.querySelector('ui-printable-sheet')).not.toBeNull();
  });

  it('reportes: el balance general usa la fecha de corte de hoy', async () => {
    const { fixture } = setup(ReportsPage, { tipo: 'balance-general' });
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/accounting/accounts`).flush([]);
    const req = http.expectOne((r) => r.url === `${TEST_API}/accounting/reports/balance-sheet`);
    expect(req.request.params.get('asOf')).toBe(isoDate(new Date()));
    req.flush({
      asOf: isoDate(new Date()),
      assets: { rows: [], total: 0 },
      liabilities: { rows: [], total: 0 },
      equity: { rows: [], total: 0 },
      periodResult: 0,
      totalEquity: 0,
      totalLiabilitiesAndEquity: 0,
      balanced: true,
    });
    await settle(fixture);
  });

  it('reportes: exporta el reporte generado en CSV', async () => {
    const { fixture, el } = setup(ReportsPage, { tipo: 'balance-prueba' });
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/accounting/accounts`).flush([]);
    const { from, to } = monthRange();
    http
      .expectOne((r) => r.url === `${TEST_API}/accounting/reports/trial-balance`)
      .flush(trialBalance(from, to));
    await settle(fixture);

    const createUrl = vi.fn(() => 'blob:x');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revoke });
    click(el, 'Exportar CSV');
    await settle(fixture);
    const req = http.expectOne(
      (r) => r.url === `${TEST_API}/accounting/reports/trial-balance/export`,
    );
    expect(req.request.params.get('format')).toBe('csv');
    expect(req.request.params.get('from')).toBe(from);
    req.flush(new Blob(['a;b']));
    await settle(fixture);
    expect(createUrl).toHaveBeenCalled();
  });

  it.each([
    ['Exportar Excel', 'xlsx'],
    ['Exportar PDF', 'pdf'],
  ])('reportes: «%s» descarga el reporte en %s', async (label, format) => {
    const { fixture, el } = setup(ReportsPage, { tipo: 'balance-prueba' });
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/accounting/accounts`).flush([]);
    const { from, to } = monthRange();
    http
      .expectOne((r) => r.url === `${TEST_API}/accounting/reports/trial-balance`)
      .flush(trialBalance(from, to));
    await settle(fixture);

    const createUrl = vi.fn(() => 'blob:x');
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
    const clicked: string[] = [];
    const spy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this.download);
    });
    click(el, label);
    await settle(fixture);
    const req = http.expectOne(
      (r) => r.url === `${TEST_API}/accounting/reports/trial-balance/export`,
    );
    expect(req.request.params.get('format')).toBe(format);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['x']));
    await settle(fixture);
    expect(createUrl).toHaveBeenCalled();
    expect(clicked).toEqual([`balance-prueba-${from}_${to}.${format}`]);
    spy.mockRestore();
  });
});
