import { HttpTestingController } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthUser, ConfirmService, SessionStore } from '../../../core';
import { makeUser, provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import type { CatalogEntry, IssuerConfig, Resolution } from '../data-access/e-invoicing.models';
import { ConfigurationPage } from './configuration/configuration-page';
import { DiagnosticsPage } from './diagnostics/diagnostics-page';
import { HabilitationPage } from './habilitation/habilitation-page';
import { IssueInvoicePage } from './issue-invoice/issue-invoice-page';

const base = `${TEST_API}/e-invoicing`;

const CATALOGS: Record<string, CatalogEntry[]> = {
  'id-types': [
    { code: '13', name: 'Cédula de ciudadanía' },
    { code: '31', name: 'NIT' },
  ],
  'vat-regimes': [
    { code: '48', name: 'Responsable de IVA' },
    { code: '49', name: 'No responsable de IVA' },
  ],
  'tax-responsibilities': [
    { code: 'O-13', name: 'Gran contribuyente' },
    { code: 'R-99-PN', name: 'No aplica' },
  ],
  'payment-forms': [
    { code: '1', name: 'Contado' },
    { code: '2', name: 'Crédito' },
  ],
  'payment-means': [{ code: '10', name: 'Efectivo' }],
  'dane-departments': [{ code: '70', name: 'Sucre' }],
};

const config: IssuerConfig = {
  businessName: 'Colegio Demo',
  nit: '900123456',
  dv: '7',
  personType: '1',
  firstName: null,
  familyName: null,
  taxResponsibilities: 'R-99-PN',
  vatRegime: '49',
  address: 'Calle 1 # 2-3',
  location: {
    departmentCode: '70',
    cityCode: '70001',
    departmentName: 'Sucre',
    cityName: 'Sincelejo',
  },
  postalCode: null,
  contactName: null,
  phone: null,
  email: 'facturacion@colegio.co',
  softwareId: 'soft-1',
  softwarePinConfigured: true,
  environment: '2',
  testSetId: null,
  autoInvoiceOnPayment: false,
  fileNaming: 'annex',
  providerCode: '000',
};

const resolution: Resolution = {
  id: 4,
  docType: 'fv',
  prefix: 'SETP',
  rangeFrom: 990000000,
  rangeTo: 995000000,
  current: 990000010,
  remaining: 4999990,
  resolutionNumber: '18760000001',
  validFrom: '2019-01-19',
  validTo: '2030-01-19',
  environment: '2',
  technicalKeyConfigured: true,
  cycle: 1,
  active: true,
};

describe('páginas de configuración y emisión DIAN', () => {
  let http: HttpTestingController;
  let confirmAnswer = true;

  function setup<T>(cmp: Type<T>, user: Partial<AuthUser> = {}) {
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

  /** Responde los catálogos pedidos y devuelve sus nombres. */
  function flushCatalogs(): string[] {
    return http
      .match((r) => r.url.startsWith(`${base}/catalogs/`))
      .map((req) => {
        const name = req.request.url.slice(`${base}/catalogs/`.length);
        req.flush(
          name.endsWith('/cities')
            ? [{ code: '70001', name: 'Sincelejo' }]
            : (CATALOGS[name] ?? []),
        );
        return name;
      });
  }

  beforeEach(() => (confirmAnswer = true));
  afterEach(() => http.verify());

  // ── Emisión manual ───────────────────────────────────────
  describe('emisión de factura', () => {
    async function open() {
      const ctx = setup(IssueInvoicePage);
      await settle(ctx.fixture);
      const names = flushCatalogs();
      await settle(ctx.fixture);
      return { ...ctx, names };
    }

    type IssueCmp = {
      form: {
        patchValue(v: object): void;
        controls: { lines: { at(i: number): { patchValue(v: object): void } } };
      };
      submit(): Promise<void>;
      serverError(): string | null;
    };

    it('carga los catálogos DIAN y DANE del formulario', async () => {
      const { names, el } = await open();
      expect(names).toEqual(
        expect.arrayContaining([
          'id-types',
          'vat-regimes',
          'tax-responsibilities',
          'payment-forms',
          'payment-means',
          'dane-departments',
        ]),
      );
      expect(el.textContent).toContain('Sucre');
    });

    it('carga los municipios del departamento elegido', async () => {
      const { fixture, cmp } = await open();
      (cmp as IssueCmp).form.patchValue({ customer: { departmentCode: '70' } });
      await settle(fixture);
      http
        .expectOne(`${base}/catalogs/dane/departments/70/cities`)
        .flush([{ code: '70001', name: 'Sincelejo' }]);
      await settle(fixture);
      expect(fixture.nativeElement.textContent).toContain('Sincelejo');
    });

    it('no envía un formulario inválido', async () => {
      const { cmp } = await open();
      await (cmp as IssueCmp).submit();
      http.expectNone(`${base}/documents/invoices`);
    });

    it('emite la factura con el adquiriente, líneas y medio de pago', async () => {
      const { fixture, cmp } = await open();
      const c = cmp as IssueCmp;
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      c.form.patchValue({
        customer: { idNumber: '1065432198', name: 'María Gómez', email: 'maria@example.com' },
      });
      c.form.controls.lines
        .at(0)
        .patchValue({ description: 'Pensión octubre', quantity: 1, unitPrice: 350000 });
      const done = c.submit();
      await settle(fixture);
      const req = http.expectOne(`${base}/documents/invoices`);
      expect(req.request.body).toMatchObject({
        customer: {
          name: 'María Gómez',
          idType: '13',
          idNumber: '1065432198',
          email: 'maria@example.com',
        },
        lines: [
          {
            description: 'Pensión octubre',
            quantity: 1,
            unitPrice: 350000,
            taxTreatment: 'excluded',
          },
        ],
        paymentMeans: { form: '1', code: '10' },
      });
      expect(req.request.body.paymentMeans.dueDate).toBeUndefined();
      req.flush({ id: 12, number: 'SETP990000011' });
      await done;
      expect(navigate).toHaveBeenCalledWith(['../documentos', 12], expect.anything());
    });

    it('a crédito exige fecha de vencimiento y muestra el error de la API', async () => {
      const { fixture, cmp } = await open();
      const c = cmp as IssueCmp;
      c.form.patchValue({
        customer: { idNumber: '1065432198', name: 'María Gómez' },
        paymentMeans: { form: '2', dueDate: '' },
      });
      c.form.controls.lines
        .at(0)
        .patchValue({ description: 'Pensión', quantity: 1, unitPrice: 1000 });
      await c.submit();
      http.expectNone(`${base}/documents/invoices`);

      c.form.patchValue({ paymentMeans: { dueDate: '2026-11-30' } });
      const done = c.submit();
      await settle(fixture);
      const req = http.expectOne(`${base}/documents/invoices`);
      expect(req.request.body.paymentMeans).toEqual({
        form: '2',
        code: '10',
        dueDate: '2026-11-30',
      });
      req.flush(
        { message: 'No hay numeración activa' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
      await done;
      expect(c.serverError()).toContain('No hay numeración activa');
    });
  });

  // ── Configuración del emisor y numeraciones ──────────────
  describe('configuración', () => {
    async function open(role: AuthUser['role'] = 'admin') {
      const ctx = setup(ConfigurationPage, { role });
      await settle(ctx.fixture);
      http.expectOne(`${base}/config`).flush(config);
      http.expectOne(`${base}/resolutions`).flush([resolution]);
      flushCatalogs();
      await settle(ctx.fixture);
      flushCatalogs();
      await settle(ctx.fixture);
      return ctx;
    }

    type ConfigCmp = {
      form: {
        getRawValue(): Record<string, unknown>;
        patchValue(v: object): void;
        disabled: boolean;
      };
      save(): Promise<void>;
      toggleResponsibility(code: string, checked: boolean): void;
      openRegister(): void;
      register(): Promise<void>;
      registerForm: { patchValue(v: object): void };
      onResolutionAction(e: unknown): void;
      editForm: { patchValue(v: object): void };
      update(): Promise<void>;
    };

    it('carga el emisor en el formulario y lista numeraciones', async () => {
      const { cmp, el } = await open();
      const v = (cmp as ConfigCmp).form.getRawValue();
      expect(v['businessName']).toBe('Colegio Demo');
      expect(v['taxResponsibilities']).toEqual(['R-99-PN']);
      expect(v['cityCode']).toBe('70001');
      expect(el.textContent).toContain('SETP');
    });

    it('guarda la configuración con responsabilidades unidas por ";"', async () => {
      const { fixture, cmp } = await open();
      const c = cmp as ConfigCmp;
      c.toggleResponsibility('O-13', true);
      const done = c.save();
      await settle(fixture);
      const req = http.expectOne(`${base}/config`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toMatchObject({
        businessName: 'Colegio Demo',
        nit: '900123456',
        taxResponsibilities: 'R-99-PN;O-13',
        cityCode: '70001',
        environment: '2',
      });
      expect(req.request.body.softwarePin).toBeUndefined();
      req.flush({ ...config, taxResponsibilities: 'R-99-PN;O-13' });
      await done;
      await settle(fixture);
    });

    it('registra una numeración (prefijo en mayúsculas) y recarga', async () => {
      const { fixture, cmp } = await open();
      const c = cmp as ConfigCmp;
      c.openRegister();
      c.registerForm.patchValue({
        prefix: 'fe',
        rangeFrom: 10,
        rangeTo: 5,
        resolutionNumber: '187',
      });
      await c.register();
      http.expectNone(`${base}/resolutions`);
      c.registerForm.patchValue({ rangeTo: 100 });
      const done = c.register();
      await settle(fixture);
      const req = http.expectOne((r) => r.url === `${base}/resolutions` && r.method === 'POST');
      expect(req.request.body).toMatchObject({
        docType: 'fv',
        prefix: 'FE',
        rangeFrom: 10,
        rangeTo: 100,
        resolutionNumber: '187',
        environment: '2',
      });
      req.flush({ ...resolution, id: 5, prefix: 'FE' });
      await done;
      await settle(fixture);
      http
        .match((r) => r.url === `${base}/resolutions` && r.method === 'GET')
        .forEach((r) => r.flush([resolution]));
    });

    it('edita una numeración enviando solo lo que cambió', async () => {
      const { fixture, cmp } = await open();
      const c = cmp as ConfigCmp;
      c.onResolutionAction({ action: 'edit', row: resolution });
      c.editForm.patchValue({ active: false });
      const done = c.update();
      await settle(fixture);
      const req = http.expectOne(`${base}/resolutions/4`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body.active).toBe(false);
      expect(req.request.body.rangeTo).toBeUndefined();
      req.flush({ ...resolution, active: false });
      await done;
      await settle(fixture);
      http
        .match((r) => r.url === `${base}/resolutions` && r.method === 'GET')
        .forEach((r) => r.flush([resolution]));
    });

    it('usuarios de finanzas ven el formulario deshabilitado y no guardan', async () => {
      const { cmp } = await open('finance');
      const c = cmp as ConfigCmp;
      expect(c.form.disabled).toBe(true);
      await c.save();
      http.expectNone((r) => r.url === `${base}/config` && r.method === 'PUT');
    });
  });

  // ── Diagnóstico y certificado ────────────────────────────
  describe('diagnóstico', () => {
    it('muestra chequeos y el certificado de firma', async () => {
      const { fixture, el } = setup(DiagnosticsPage);
      await settle(fixture);
      http.expectOne(`${base}/diagnostics`).flush({
        ready: false,
        checks: [
          { code: 'cert', severity: 'ok', message: 'Certificado cargado' },
          { code: 'resolution', severity: 'error', message: 'Sin numeración activa para NC' },
        ],
      });
      http.expectOne(`${base}/config/certificate`).flush({
        subject: 'CN=Colegio Demo',
        issuer: 'CN=Certicámara',
        serialNumber: 'ABC123',
        validFrom: '2026-01-01T00:00:00Z',
        validTo: '2026-11-10T00:00:00Z',
        daysToExpire: 20,
        expired: false,
      });
      await settle(fixture);
      expect(el.textContent).toContain('Sin numeración activa para NC');
      expect(el.textContent).toContain('CN=Certicámara');
      expect(el.textContent).toContain('Vence en 20 días');
    });

    it('muestra el error si el certificado no está disponible', async () => {
      const { fixture, el } = setup(DiagnosticsPage);
      await settle(fixture);
      http.expectOne(`${base}/diagnostics`).flush({ ready: true, checks: [] });
      http
        .expectOne(`${base}/config/certificate`)
        .flush({ message: 'No hay certificado cargado' }, { status: 404, statusText: 'Not Found' });
      await settle(fixture);
      expect(el.textContent).toContain('Certificado no disponible');
      expect(el.textContent).toContain('No hay certificado cargado');
    });

    it('reenvía pendientes tras confirmar y vuelve a diagnosticar', async () => {
      const { fixture, el, cmp } = setup(DiagnosticsPage);
      await settle(fixture);
      http.expectOne(`${base}/diagnostics`).flush({ ready: true, checks: [] });
      http.expectOne(`${base}/config/certificate`).flush({
        subject: 's',
        issuer: 'i',
        serialNumber: '1',
        validFrom: '2026-01-01',
        validTo: '2027-01-01',
        daysToExpire: 200,
        expired: false,
      });
      await settle(fixture);
      const done = (cmp as { retryPending(): Promise<void> }).retryPending();
      await settle(fixture);
      const req = http.expectOne(`${base}/documents/retry-pending`);
      expect(req.request.method).toBe('POST');
      req.flush({
        processed: 1,
        skipped: 0,
        results: [{ id: 3, number: 'SETP3', status: 'accepted' }],
      });
      await done;
      await settle(fixture);
      http.expectOne(`${base}/diagnostics`).flush({ ready: true, checks: [] });
      await settle(fixture);
      expect(el.textContent).toContain('1 procesados');
      expect(el.textContent).toContain('SETP3');
    });

    it('no consulta nada para usuarios que no son administradores', async () => {
      const { fixture, el } = setup(DiagnosticsPage, { role: 'finance' });
      await settle(fixture);
      http.expectNone(`${base}/diagnostics`);
      http.expectNone(`${base}/config/certificate`);
      expect(el.textContent).toContain('Solo para administradores');
    });
  });

  // ── Habilitación ─────────────────────────────────────────
  describe('habilitación', () => {
    async function open() {
      const ctx = setup(HabilitationPage);
      await settle(ctx.fixture);
      http.expectOne(`${base}/habilitation/test-set/progress`).flush({
        testSetId: 'ts-1',
        environment: '2',
        counts: { fv: { accepted: 8, rejected: 2 }, nc: {}, nd: {} },
      });
      await settle(ctx.fixture);
      return ctx;
    }

    it('muestra el avance por tipo de documento', async () => {
      const { el } = await open();
      expect(el.textContent).toContain('TestSetId:ts-1');
      expect(el.textContent).toContain('Enviados10');
      expect(el.textContent).toContain('Aceptados8');
      expect(el.textContent).toContain('Rechazados2');
    });

    it('ejecuta el set de pruebas y reinicia la numeración', async () => {
      const { fixture, cmp } = await open();
      const c = cmp as {
        planForm: { setValue(v: object): void };
        run(): Promise<void>;
        stopPolling(): void;
        reset(): Promise<void>;
        toggleReset(t: string, checked: boolean): void;
      };
      c.planForm.setValue({ invoices: 2, creditNotes: 1, debitNotes: 0 });
      const ran = c.run();
      await settle(fixture);
      const run = http.expectOne(`${base}/habilitation/test-set/run`);
      expect(run.request.body).toEqual({ invoices: 2, creditNotes: 1, debitNotes: 0 });
      run.flush(
        { invoices: 2, creditNotes: 1, debitNotes: 0 },
        { status: 202, statusText: 'Accepted' },
      );
      await ran;
      await settle(fixture);
      http
        .expectOne(`${base}/habilitation/test-set/progress`)
        .flush({ testSetId: 'ts-1', environment: '2', counts: { fv: {}, nc: {}, nd: {} } });
      c.stopPolling();

      c.toggleReset('nd', false);
      const reset = c.reset();
      await settle(fixture);
      const req = http.expectOne(`${base}/habilitation/numbering/reset`);
      expect(req.request.body).toEqual({ types: ['fv', 'nc'] });
      req.flush([resolution]);
      await reset;
    });

    it('no ejecuta un set vacío', async () => {
      const { cmp } = await open();
      const c = cmp as {
        planForm: { setValue(v: object): void };
        run(): Promise<void>;
        runError(): string | null;
      };
      c.planForm.setValue({ invoices: 0, creditNotes: 0, debitNotes: 0 });
      await c.run();
      http.expectNone(`${base}/habilitation/test-set/run`);
      expect(c.runError()).toContain('al menos un documento');
    });
  });
});
