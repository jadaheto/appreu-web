import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthUser, ConfirmService, SessionStore } from '../../../core';
import { makeUser, provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import { DocumentDetail, DocumentSummary } from '../data-access/e-invoicing.models';
import { DocumentDetailPage } from './document-detail/document-detail-page';
import { DocumentsPage } from './documents/documents-page';

const base = `${TEST_API}/e-invoicing`;

const summary = (overrides: Partial<DocumentSummary> = {}): DocumentSummary => ({
  id: 1,
  type: 'fv',
  number: 'SETP990000001',
  issueDate: '2026-10-01',
  issueTime: '10:00:00-05:00',
  customerName: 'María Gómez',
  customerIdType: '13',
  customerIdNumber: '1065432198',
  subtotal: 350000,
  tax: 0,
  total: 350000,
  status: 'accepted',
  statusMessage: null,
  cufe: 'a'.repeat(96),
  trackId: 'track-1',
  sourcePaymentId: null,
  attempts: 1,
  createdAt: null,
  ...overrides,
});

const detail = (overrides: Partial<DocumentDetail> = {}): DocumentDetail => ({
  ...summary(),
  environment: '2',
  customer: {
    name: 'María Gómez',
    idType: '13',
    idNumber: '1065432198',
    dv: null,
    email: 'maria@example.com',
    phone: null,
    address: null,
    cityCode: '70001',
    cityName: 'Sincelejo',
    departmentCode: '70',
    departmentName: 'Sucre',
  },
  lines: [
    {
      description: 'Pensión octubre',
      code: 'PEN',
      quantity: 1,
      unitPrice: 350000,
      taxTreatment: 'excluded',
      taxRate: 0,
      lineTotal: 350000,
      taxAmount: 0,
    },
  ],
  paymentMeans: { form: '1', code: '10', dueDate: null },
  notes: null,
  billingReference: null,
  discrepancy: null,
  qrUrl: null,
  fileName: 'fv0090012345600026000000001.xml',
  statusCode: '00',
  errors: [],
  notices: [],
  operation: 'SendBillSync',
  hasApplicationResponse: true,
  hasAttachedDocument: false,
  submissions: [
    {
      operation: 'SendBillSync',
      outcome: 'accepted',
      statusCode: '00',
      statusMessage: 'Procesado correctamente',
      errors: [],
      trackId: 'track-1',
      at: '2026-10-01T15:00:00Z',
    },
  ],
  ...overrides,
});

describe('páginas de facturación electrónica', () => {
  let http: HttpTestingController;

  function setup(user: Partial<AuthUser> = {}) {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestHttp() });
    TestBed.inject(SessionStore).set({
      token: 't',
      expiresAt: Date.now() + 60_000,
      tenant: null,
      user: makeUser(user),
    });
    http = TestBed.inject(HttpTestingController);
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

  it('listado: muestra KPIs y documentos', async () => {
    setup();
    const fixture = TestBed.createComponent(DocumentsPage);
    await settle(fixture);
    http
      .expectOne((r) => r.url === `${base}/documents`)
      .flush({
        items: [summary(), summary({ id: 2, number: 'SETP2', status: 'rejected' })],
        total: 2,
        page: 1,
        limit: 20,
      });
    http
      .expectOne((r) => r.url === `${base}/documents/stats`)
      .flush({
        counts: { fv: { accepted: 5, rejected: 1 }, nc: { accepted: 2 }, nd: {} },
        acceptedInvoicesTotal: 1_750_000,
      });
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Facturación electrónica');
    const values = Array.from(el.querySelectorAll('ui-stat-card .value')).map((v) => v.textContent);
    expect(values[0]).toContain('1.750.000');
    expect(values[1]).toContain('6');
    expect(values[3]).toContain('1');
    expect(el.querySelectorAll('tbody tr').length).toBe(2);
    expect(el.textContent).toContain('SETP2');
    expect(el.textContent).toContain('Rechazado');
  });

  it('listado: aplica filtros y vuelve a la página 1', async () => {
    setup();
    const fixture = TestBed.createComponent(DocumentsPage);
    await settle(fixture);
    http
      .expectOne((r) => r.url === `${base}/documents`)
      .flush({ items: [], total: 0, page: 1, limit: 20 });
    http
      .expectOne((r) => r.url === `${base}/documents/stats`)
      .flush({ counts: { fv: {}, nc: {}, nd: {} }, acceptedInvoicesTotal: 0 });
    const page = fixture.componentInstance as unknown as {
      status: { set(v: string): void };
      applyFilters(): void;
    };
    page.status.set('rejected');
    page.applyFilters();
    await settle(fixture);
    const req = http.expectOne((r) => r.url === `${base}/documents`);
    expect(req.request.params.get('status')).toBe('rejected');
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ items: [], total: 0, page: 1, limit: 20 });
    // El rango no cambió: no se repite la consulta de indicadores.
    http.expectNone((r) => r.url === `${base}/documents/stats`);
    await settle(fixture);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Ningún documento coincide',
    );
  });

  async function openDetail(doc: DocumentDetail) {
    const fixture = TestBed.createComponent(DocumentDetailPage);
    fixture.componentRef.setInput('id', String(doc.id));
    await settle(fixture);
    http.expectOne(`${base}/documents/${doc.id}`).flush(doc);
    await settle(fixture);
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('detalle: muestra estado, líneas, envíos y descargas disponibles', async () => {
    setup();
    const { el } = await openDetail(detail());
    expect(el.querySelector('h1')?.textContent).toContain('SETP990000001');
    expect(el.textContent).toContain('Aceptado');
    expect(el.textContent).toContain('Pensión octubre');
    expect(el.textContent).toContain('Procesado correctamente');
    const buttons = Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(buttons).toContain('ApplicationResponse');
    expect(buttons).not.toContain('AttachedDocument');
    expect(buttons).toContain('Nota crédito');
    expect(buttons).not.toContain('Reintentar envío');
  });

  it('detalle: reintenta el envío de un documento con error y actualiza el estado', async () => {
    setup();
    const { fixture, el } = await openDetail(
      detail({ status: 'send_error', hasApplicationResponse: false }),
    );
    const retry = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reintentar envío'),
    )!;
    expect(retry).toBeTruthy();
    retry.click();
    await settle(fixture);
    http.expectOne(`${base}/documents/1/submit`).flush(detail({ status: 'accepted' }));
    await settle(fixture);
    expect(el.textContent).not.toContain('Reintentar envío');
    expect(el.textContent).toContain('Aceptado');
  });

  it('detalle: emite una nota crédito de anulación total sin líneas', async () => {
    setup();
    const { fixture } = await openDetail(detail());
    const confirm = TestBed.inject(ConfirmService);
    vi.spyOn(confirm, 'ask').mockResolvedValue(true);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const page = fixture.componentInstance as unknown as {
      openNote(kind: 'nc' | 'nd'): void;
      submitNote(): Promise<void>;
      noteForm: { controls: { conceptCode: { setValue(v: string): void } } };
    };
    page.openNote('nc');
    await settle(fixture);
    http
      .expectOne(`${base}/catalogs/credit-note-concepts`)
      .flush([{ code: '2', name: 'Anulación' }]);
    page.noteForm.controls.conceptCode.setValue('2');
    const done = page.submitNote();
    await settle(fixture);
    const req = http.expectOne(`${base}/documents/1/credit-notes`);
    expect(req.request.body).toEqual({
      conceptCode: '2',
      description: undefined,
      notes: undefined,
      lines: undefined,
    });
    req.flush(detail({ id: 9, type: 'nc', number: 'NC1' }));
    await done;
    await settle(fixture);
    expect(navigate).toHaveBeenCalledWith(['../documentos', 9], expect.anything());
  });
});
