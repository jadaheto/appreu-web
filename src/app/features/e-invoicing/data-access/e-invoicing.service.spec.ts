import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../../core';
import { provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import { EInvoicingService, toPage } from './e-invoicing.service';

describe('EInvoicingService', () => {
  let service: EInvoicingService;
  let http: HttpTestingController;
  const base = `${TEST_API}/e-invoicing`;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestHttp() });
    service = TestBed.inject(EInvoicingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('toPage convierte limit en pageSize', () => {
    expect(toPage({ items: [1], total: 1, page: 2, limit: 50 })).toEqual({
      items: [1],
      total: 1,
      page: 2,
      pageSize: 50,
    });
  });

  it('lista documentos con filtros y mapea la paginación', async () => {
    const promise = firstValueFrom(
      service.list({
        page: 2,
        pageSize: 10,
        type: 'fv',
        status: 'accepted',
        search: null,
        from: '2026-01-01',
      }),
    );
    const req = http.expectOne((r) => r.url === `${base}/documents`);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.get('type')).toBe('fv');
    expect(req.request.params.get('status')).toBe('accepted');
    expect(req.request.params.get('from')).toBe('2026-01-01');
    expect(req.request.params.has('search')).toBe(false);
    req.flush({ items: [], total: 0, page: 2, limit: 10 });
    expect(await promise).toEqual({ items: [], total: 0, page: 2, pageSize: 10 });
  });

  it('obtiene el detalle y emite una factura', async () => {
    const detail = firstValueFrom(service.get(7));
    http.expectOne(`${base}/documents/7`).flush({ id: 7, number: 'SETP1' });
    expect((await detail).number).toBe('SETP1');

    const dto = {
      customer: { name: 'María', idType: '13', idNumber: '123' },
      lines: [{ description: 'Pensión', quantity: 1, unitPrice: 350000 }],
      paymentMeans: { form: '1' as const, code: '10' },
    };
    const issued = firstValueFrom(service.issueInvoice(dto));
    const req = http.expectOne(`${base}/documents/invoices`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 8, number: 'SETP2' });
    expect((await issued).id).toBe(8);
  });

  it('emite notas, reintenta y consulta estado', () => {
    service.issueCreditNote(3, { conceptCode: '2' }).subscribe();
    expect(http.expectOne(`${base}/documents/3/credit-notes`).request.body).toEqual({
      conceptCode: '2',
    });
    service.issueDebitNote(3, { conceptCode: '1', lines: [] }).subscribe();
    http.expectOne(`${base}/documents/3/debit-notes`).flush({});
    service.submit(3).subscribe();
    expect(http.expectOne(`${base}/documents/3/submit`).request.method).toBe('POST');
    service.checkStatus(3).subscribe();
    expect(http.expectOne(`${base}/documents/3/status-check`).request.method).toBe('POST');
    http.match(() => true).forEach((r) => r.flush({}));
  });

  it('descarga artefactos como blob', async () => {
    const promise = firstValueFrom(service.downloadArtifact(5, 'application-response'));
    const req = http.expectOne(`${base}/documents/5/application-response`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['<xml/>']));
    expect(await promise).toBeInstanceOf(Blob);
  });

  it('actualiza la configuración del emisor y propaga ApiError', async () => {
    const promise = firstValueFrom(service.updateConfig({ businessName: 'Colegio' }));
    const req = http.expectOne(`${base}/config`);
    expect(req.request.method).toBe('PUT');
    req.flush({ message: 'NIT inválido' }, { status: 400, statusText: 'Bad Request' });
    await expect(promise).rejects.toBeInstanceOf(ApiError);
  });

  it('gestiona numeraciones', () => {
    service.resolutions().subscribe();
    http.expectOne(`${base}/resolutions`).flush([]);
    service.updateResolution(4, { active: false }).subscribe();
    const req = http.expectOne(`${base}/resolutions/4`);
    expect(req.request.method).toBe('PATCH');
    req.flush({});
  });

  it('habilitación: ejecuta el set, consulta avance y reinicia numeración', () => {
    service.runTestSet({ invoices: 30, creditNotes: 10, debitNotes: 10 }).subscribe();
    const run = http.expectOne(`${base}/habilitation/test-set/run`);
    expect(run.request.body).toEqual({ invoices: 30, creditNotes: 10, debitNotes: 10 });
    run.flush(
      { invoices: 30, creditNotes: 10, debitNotes: 10 },
      { status: 202, statusText: 'Accepted' },
    );
    service.testSetProgress().subscribe();
    http.expectOne(`${base}/habilitation/test-set/progress`).flush({});
    service.resetNumbering(['fv', 'nc']).subscribe();
    expect(http.expectOne(`${base}/habilitation/numbering/reset`).request.body).toEqual({
      types: ['fv', 'nc'],
    });
    http.match(() => true).forEach((r) => r.flush([]));
  });

  it('cachea los catálogos', () => {
    service.catalog('id-types').subscribe();
    service.catalog('id-types').subscribe();
    http.expectOne(`${base}/catalogs/id-types`).flush([{ code: '13', name: 'CC' }]);
    service.cities('70').subscribe();
    http.expectOne(`${base}/catalogs/dane/departments/70/cities`).flush([]);
  });

  it('indicadores con rango opcional', () => {
    service.stats({ from: '2026-01-01', to: null }).subscribe();
    const req = http.expectOne((r) => r.url === `${base}/documents/stats`);
    expect(req.request.params.get('from')).toBe('2026-01-01');
    expect(req.request.params.has('to')).toBe(false);
    req.flush({ counts: {}, acceptedInvoicesTotal: 0 });
    service.stats().subscribe();
    const all = http.expectOne((r) => r.url === `${base}/documents/stats`);
    expect(all.request.params.keys()).toEqual([]);
    all.flush({});
  });

  it('reenvía pendientes en bloque', async () => {
    const promise = firstValueFrom(service.retryPending());
    const req = http.expectOne(`${base}/documents/retry-pending`);
    expect(req.request.method).toBe('POST');
    req.flush({ processed: 2, skipped: 1, results: [] });
    expect((await promise).processed).toBe(2);
  });

  it('lee configuración, certificado y diagnóstico', async () => {
    const cfg = firstValueFrom(service.config());
    http.expectOne(`${base}/config`).flush({ businessName: 'Colegio' });
    expect((await cfg).businessName).toBe('Colegio');
    const cert = firstValueFrom(service.certificate());
    http.expectOne(`${base}/config/certificate`).flush({ subject: 'CN=X', daysToExpire: 10 });
    expect((await cert).daysToExpire).toBe(10);
    const diag = firstValueFrom(service.diagnostics());
    http.expectOne(`${base}/diagnostics`).flush({ ready: true, checks: [] });
    expect((await diag).ready).toBe(true);
  });

  it('el certificado faltante llega como ApiError', async () => {
    const cert = firstValueFrom(service.certificate());
    http
      .expectOne(`${base}/config/certificate`)
      .flush({ message: 'Sin certificado' }, { status: 404, statusText: 'Not Found' });
    await expect(cert).rejects.toBeInstanceOf(ApiError);
  });

  it('registra una numeración', () => {
    const dto = {
      docType: 'fv' as const,
      prefix: 'FE',
      rangeFrom: 1,
      rangeTo: 100,
      environment: '2' as const,
    };
    service.registerResolution(dto).subscribe();
    const req = http.expectOne(`${base}/resolutions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({});
  });

  it('cachea catálogos por nombre y municipios por departamento', () => {
    service.catalog('payment-means').subscribe();
    service.catalog('payment-forms').subscribe();
    http.expectOne(`${base}/catalogs/payment-means`).flush([]);
    http.expectOne(`${base}/catalogs/payment-forms`).flush([]);
    service.cities('70').subscribe();
    service.cities('70').subscribe();
    service.cities('05').subscribe();
    http.expectOne(`${base}/catalogs/dane/departments/70/cities`).flush([]);
    http.expectOne(`${base}/catalogs/dane/departments/05/cities`).flush([]);
  });

  it('saveBlob descarga el archivo con el nombre indicado', () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    service.saveBlob(new Blob(['x']), 'factura.xml');
    expect(create).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('factura.xml');
    vi.restoreAllMocks();
  });
});
