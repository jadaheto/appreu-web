import { HttpTestingController } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthUser, ConfirmService, SessionStore } from '../../../core';
import { makeUser, provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import type { EmailLog, WhatsAppLog, WhatsAppTemplate } from '../data-access/communications.models';
import { BillingNoticesPage } from './email/billing-notices-page';
import { ComposeNoticePage } from './email/compose-notice-page';
import { EmailDashboardPage } from './email/email-dashboard-page';
import { EmailToolsPage } from './email/email-tools-page';
import { WhatsAppTemplatesPage } from './whatsapp/templates-page';
import { WhatsAppPage } from './whatsapp/whatsapp-page';

const page = <T>(items: T[], limit = 20) => ({ items, total: items.length, page: 1, limit });

const template = (overrides: Partial<WhatsAppTemplate> = {}): WhatsAppTemplate => ({
  id: 3,
  name: 'cobro_mensual',
  metaTemplateId: null,
  language: 'es_CO',
  category: 'utility',
  body: 'Hola {{1}}, tu saldo es {{2}}.',
  variables: ['Acudiente', 'Saldo'],
  placeholderCount: 2,
  status: 'active',
  headerType: 'none',
  headerText: null,
  headerImageUrl: null,
  footerText: null,
  buttons: [],
  createdAt: '2026-10-01T10:00:00Z',
  ...overrides,
});

const waLog: WhatsAppLog = {
  id: 1,
  studentId: 4,
  studentName: 'Sara Ruiz',
  templateName: 'cobro_mensual',
  phone: '573001234567',
  status: 'read',
  waMessageId: 'wamid.1',
  response: null,
  createdAt: '2026-10-20T09:00:00Z',
};

const emailLog: EmailLog = {
  id: 7,
  toEmail: 'acudiente@correo.co',
  toName: 'Luis Gómez',
  subject: 'Reunión de padres',
  bodyPreview: 'Les esperamos…',
  type: 'aviso',
  status: 'failed',
  errorMessage: 'Buzón inexistente',
  sentBy: 1,
  sentByName: 'Ana Pérez',
  createdAt: '2026-10-20T09:00:00Z',
};

const KPIS = { configured: true, totals: { sent: 10, delivered: 8, read: 5, failed: 1 } };

describe('páginas de WhatsApp y correo', () => {
  let http: HttpTestingController;
  let confirmAnswer = true;

  function setup<T>(cmp: Type<T>, user: Partial<AuthUser> = {}) {
    sessionStorage.clear();
    confirmAnswer = true;
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
  const type = (el: HTMLElement, selector: string, value: string) => {
    const input = el.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!input) throw new Error(`No se encontró ${selector}`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const choose = (el: HTMLElement, selector: string, index: number) => {
    const select = el.querySelector(selector) as HTMLSelectElement;
    select.value = String(index);
    select.dispatchEvent(new Event('change'));
  };
  const submit = (el: HTMLElement, selector = 'form') =>
    (el.querySelector(selector) as HTMLFormElement).dispatchEvent(new Event('submit'));

  afterEach(() => http.verify());

  it('WhatsApp (admin): KPIs, historial y envío individual con variables de la plantilla', async () => {
    const { fixture, el } = setup(WhatsAppPage, { role: 'admin' });
    await settle(fixture);
    http
      .expectOne(`${TEST_API}/communications/whatsapp/kpis`)
      .flush({ ...KPIS, configured: false });
    http
      .expectOne((r) => r.url === `${TEST_API}/communications/whatsapp/logs`)
      .flush(page([waLog]));
    const tpl = http.expectOne((r) => r.url === `${TEST_API}/communications/whatsapp/templates`);
    expect(tpl.request.params.get('status')).toBe('active');
    tpl.flush([template()]);
    http.expectOne((r) => r.url === `${TEST_API}/finance/payments`).flush(page([], 10));
    await settle(fixture);

    expect(el.textContent).toContain('WhatsApp no está configurado');
    expect(el.textContent).toContain('Sara Ruiz');
    expect(el.textContent).toContain('Confirmaciones de pago');
    expect(el.textContent).toContain('Notificar evento');

    type(el, '[formcontrolname="phone"] input', '300 123 4567');
    choose(
      el,
      '[formcontrolname="templatename"] select, [formcontrolname="templateName"] select',
      0,
    );
    await settle(fixture);
    const vars = el.querySelectorAll<HTMLInputElement>('[formarrayname="variables"] input');
    expect(vars.length).toBe(2);
    expect(el.querySelector('app-whatsapp-preview')).not.toBeNull();
    vars[0].value = 'Luis';
    vars[0].dispatchEvent(new Event('input'));
    vars[1].value = '$ 50.000';
    vars[1].dispatchEvent(new Event('input'));
    await settle(fixture);

    click(el, 'Enviar mensaje');
    await settle(fixture);
    const send = http.expectOne(`${TEST_API}/communications/whatsapp/messages`);
    expect(send.request.body).toEqual({
      phone: '3001234567',
      templateName: 'cobro_mensual',
      variables: ['Luis', '$ 50.000'],
    });
    send.flush({ phone: '573001234567', messageId: 'wamid.2' });
    await settle(fixture);
    http.expectOne(`${TEST_API}/communications/whatsapp/kpis`).flush(KPIS);
    http
      .expectOne((r) => r.url === `${TEST_API}/communications/whatsapp/logs`)
      .flush(page([waLog]));
    await settle(fixture);
    expect(el.querySelectorAll('[formarrayname="variables"] input').length).toBe(0);
  });

  it('WhatsApp (RR. HH.): sin confirmaciones de pago y sin romperse si fallan los KPIs', async () => {
    const { fixture, el } = setup(WhatsAppPage, { role: 'hr' });
    await settle(fixture);
    http
      .expectOne(`${TEST_API}/communications/whatsapp/kpis`)
      .flush({ message: 'Fallo' }, { status: 500, statusText: 'Error' });
    http.expectOne((r) => r.url === `${TEST_API}/communications/whatsapp/logs`).flush(page([]));
    http.expectOne((r) => r.url === `${TEST_API}/communications/whatsapp/templates`).flush([]);
    http.expectNone((r) => r.url === `${TEST_API}/finance/payments`);
    await settle(fixture);
    expect(el.textContent).not.toContain('Confirmaciones de pago');
    expect(el.textContent).toContain('Notificar evento');
    expect(el.textContent).toContain('Sin envíos registrados');

    // Formulario inválido: no se envía nada.
    click(el, 'Enviar mensaje');
    await settle(fixture);
  });

  it('WhatsApp: notificar evento muestra el resumen de entrega', async () => {
    const { fixture, el } = setup(WhatsAppPage, { role: 'hr' });
    await settle(fixture);
    http.expectOne(`${TEST_API}/communications/whatsapp/kpis`).flush(KPIS);
    http.expectOne((r) => r.url === `${TEST_API}/communications/whatsapp/logs`).flush(page([]));
    http.expectOne((r) => r.url === `${TEST_API}/communications/whatsapp/templates`).flush([]);
    await settle(fixture);

    type(el, '[formcontrolname="date"] input', '2026-11-05');
    type(el, '[formcontrolname="name"] input', 'Día de la familia');
    await settle(fixture);
    click(el, 'Notificar a los acudientes');
    await settle(fixture);
    const req = http.expectOne(`${TEST_API}/communications/whatsapp/events`);
    expect(req.request.body).toEqual({ date: '2026-11-05', name: 'Día de la familia' });
    req.flush({ total: 3, sent: 2, failed: 0, skipped: 1, failures: [] });
    await settle(fixture);
    http.expectOne(`${TEST_API}/communications/whatsapp/kpis`).flush(KPIS);
    http.expectOne((r) => r.url === `${TEST_API}/communications/whatsapp/logs`).flush(page([]));
    await settle(fixture);
    expect(el.querySelector('app-delivery-summary')).not.toBeNull();
  });

  it('plantillas (admin): crea con etiquetas por variable y elimina con confirmación', async () => {
    const { fixture, el } = setup(WhatsAppTemplatesPage, { role: 'admin' });
    await settle(fixture);
    const list = http.expectOne((r) => r.url === `${TEST_API}/communications/whatsapp/templates`);
    expect(list.request.params.has('status')).toBe(false);
    list.flush([template()]);
    await settle(fixture);
    expect(el.textContent).toContain('cobro_mensual');
    expect(el.textContent).toContain('Activa');

    click(el, 'Nueva plantilla');
    await settle(fixture);
    type(el, '#template-form [formcontrolname="name"] input', 'aviso_general');
    type(el, '#template-form [formcontrolname="body"] textarea', 'Hola {{1}}, recuerde {{2}}.');
    await settle(fixture);
    const labels = el.querySelectorAll<HTMLInputElement>('[formarrayname="variables"] input');
    expect(labels.length).toBe(2);
    labels[0].value = 'Acudiente';
    labels[0].dispatchEvent(new Event('input'));
    await settle(fixture);
    submit(el, '#template-form');
    await settle(fixture);
    const create = http.expectOne(`${TEST_API}/communications/whatsapp/templates`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({
      name: 'aviso_general',
      language: 'es_CO',
      category: 'utility',
      body: 'Hola {{1}}, recuerde {{2}}.',
      variables: ['Acudiente', ''],
      status: 'active',
      headerType: 'none',
      buttons: [],
    });
    create.flush(template({ id: 4, name: 'aviso_general' }));
    await settle(fixture);
    http
      .expectOne((r) => r.url === `${TEST_API}/communications/whatsapp/templates`)
      .flush([template(), template({ id: 4, name: 'aviso_general' })]);
    await settle(fixture);
    expect(el.querySelector('#template-form')).toBeNull();

    (el.querySelector('button[aria-label="Eliminar plantilla"]') as HTMLButtonElement).click();
    await settle(fixture);
    http.expectOne(`${TEST_API}/communications/whatsapp/templates/3`).flush(null);
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/communications/whatsapp/templates`).flush([]);
    await settle(fixture);
    expect(el.textContent).toContain('No hay plantillas');
  });

  it('plantillas (finanzas): solo lectura y filtro por estado', async () => {
    const { fixture, el } = setup(WhatsAppTemplatesPage, { role: 'finance' });
    await settle(fixture);
    http
      .expectOne((r) => r.url === `${TEST_API}/communications/whatsapp/templates`)
      .flush([template()]);
    await settle(fixture);
    expect(el.textContent).not.toContain('Nueva plantilla');
    expect(el.querySelector('button[aria-label="Eliminar plantilla"]')).toBeNull();

    (el.querySelector('button[aria-label="Ver plantilla"]') as HTMLButtonElement).click();
    await settle(fixture);
    const name = el.querySelector(
      '#template-form [formcontrolname="name"] input',
    ) as HTMLInputElement;
    expect(name.value).toBe('cobro_mensual');
    expect(name.disabled).toBe(true);
    expect(el.textContent).not.toContain('Guardar plantilla');

    click(el, 'Pendiente');
    await settle(fixture);
    const filtered = http.expectOne(
      (r) => r.url === `${TEST_API}/communications/whatsapp/templates`,
    );
    expect(filtered.request.params.get('status')).toBe('pending');
    filtered.flush([]);
    await settle(fixture);
  });

  it('correos: KPIs, historial y detalle con el error del envío', async () => {
    const { fixture, el } = setup(EmailDashboardPage, { role: 'admin' });
    await settle(fixture);
    http
      .expectOne(`${TEST_API}/communications/email/kpis`)
      .flush({ total: 120, notices: 80, billing: 30, dian: 9, failed: 1 });
    const logs = http.expectOne((r) => r.url === `${TEST_API}/communications/email/logs`);
    expect(logs.request.params.get('limit')).toBe('20');
    logs.flush(page([emailLog]));
    await settle(fixture);

    const values = Array.from(el.querySelectorAll('ui-stat-card .value')).map((v) =>
      v.textContent?.trim(),
    );
    expect(values).toContain('120');
    expect(el.textContent).toContain('Herramientas');
    expect(el.textContent).toContain('Avisos de cobro');

    (el.querySelector('button[aria-label="Ver detalle"]') as HTMLButtonElement).click();
    await settle(fixture);
    expect(el.querySelector('[role="dialog"]')?.textContent).toContain('Buzón inexistente');
  });

  it('correos (RR. HH.): sin cobros ni herramientas; el error de KPIs no rompe la página', async () => {
    const { fixture, el } = setup(EmailDashboardPage, { role: 'hr' });
    await settle(fixture);
    http
      .expectOne(`${TEST_API}/communications/email/kpis`)
      .flush({ message: 'Fallo' }, { status: 500, statusText: 'Error' });
    http.expectOne((r) => r.url === `${TEST_API}/communications/email/logs`).flush(page([]));
    await settle(fixture);
    expect(el.textContent).not.toContain('Avisos de cobro');
    expect(el.textContent).not.toContain('Herramientas');
    expect(el.textContent).toContain('Redactar aviso');
  });

  it('redactar aviso: catálogo no disponible → id manual; envío a correos manuales', async () => {
    const { fixture, el } = setup(ComposeNoticePage, { role: 'hr' });
    await settle(fixture);
    http.expectNone(`${TEST_API}/academic/grades`);

    const radio = (label: string) =>
      Array.from(el.querySelectorAll('label.radio'))
        .find((l) => l.textContent?.includes(label))!
        .querySelector('input') as HTMLInputElement;
    radio('Acudientes por grado').click();
    await settle(fixture);
    http
      .expectOne(`${TEST_API}/academic/grades`)
      .flush({ message: 'Prohibido' }, { status: 403, statusText: 'Forbidden' });
    await settle(fixture);
    expect(el.textContent).toContain('Id del grado');

    radio('Correos manuales').click();
    await settle(fixture);
    type(
      el,
      '[formcontrolname="manualEmails"] textarea, [formcontrolname="manualemails"] textarea',
      'uno@colegio.co; malo',
    );
    await settle(fixture);
    submit(el);
    await settle(fixture);
    expect(el.textContent).toContain('Correos inválidos: malo');

    type(
      el,
      '[formcontrolname="manualEmails"] textarea, [formcontrolname="manualemails"] textarea',
      'uno@colegio.co\ndos@colegio.co',
    );
    type(el, '[formcontrolname="subject"] input', ' Reunión ');
    const editor = el.querySelector('ui-rich-text-editor [contenteditable]') as HTMLElement;
    editor.innerHTML = '<p>Mañana a las 7</p>';
    editor.dispatchEvent(new Event('input'));
    await settle(fixture);
    submit(el);
    await settle(fixture);

    const req = http.expectOne(`${TEST_API}/communications/email/notices`);
    const form = req.request.body as FormData;
    expect(form.get('audience')).toBe('manual');
    expect(form.get('manualEmails')).toBe('uno@colegio.co,dos@colegio.co');
    expect(form.get('subject')).toBe('Reunión');
    expect(String(form.get('bodyHtml'))).toContain('Mañana a las 7');
    req.flush({ total: 2, sent: 2, failed: 0, skipped: 0, failures: [] });
    await settle(fixture);
    expect(el.querySelector('app-delivery-summary')).not.toBeNull();
  });

  it('avisos de cobro: vista previa del mes y envío por los canales elegidos', async () => {
    const { fixture, el } = setup(BillingNoticesPage, { role: 'finance' });
    await settle(fixture);
    http
      .expectOne((r) => r.url === `${TEST_API}/finance/concepts`)
      .flush([{ id: 2, name: 'Pensión', isActive: true }]);
    http
      .expectOne((r) => r.url === `${TEST_API}/communications/whatsapp/templates`)
      .flush([template()]);
    await settle(fixture);

    type(el, '[formcontrolname="month"] input', '2026-10');
    await settle(fixture);
    click(el, 'Vista previa');
    await settle(fixture);
    const preview = http.expectOne(
      (r) => r.url === `${TEST_API}/communications/billing-notices/preview`,
    );
    expect(preview.request.params.get('month')).toBe('2026-10');
    preview.flush({
      month: '2026-10',
      charges: 42,
      totalAmount: 8_400_000,
      guardiansWithEmail: 40,
      guardiansWithMobile: 38,
      studentsWithoutEmail: 2,
    });
    await settle(fixture);
    expect(el.textContent).toContain('42');

    submit(el);
    await settle(fixture);
    const send = http.expectOne(`${TEST_API}/communications/billing-notices`);
    expect(send.request.body).toEqual({
      month: '2026-10',
      channels: ['email', 'whatsapp'],
      templateName: 'cobro_mensual',
    });
    send.flush({
      charges: 42,
      email: { total: 40, sent: 40, failed: 0, skipped: 2, failures: [] },
      whatsapp: {
        total: 38,
        sent: 37,
        failed: 1,
        skipped: 4,
        failures: [{ to: '573001112233', error: 'x' }],
      },
    });
    await settle(fixture);
    expect(el.querySelectorAll('app-delivery-summary').length).toBe(2);
  });
  it('herramientas de correo: prueba SMTP por perfil e imágenes validadas antes de subir', async () => {
    const { fixture, el } = setup(EmailToolsPage, { role: 'admin' });
    await settle(fixture);
    choose(el, 'ui-select select', 1);
    await settle(fixture);
    click(el, 'Enviar correo de prueba');
    await settle(fixture);
    const smtp = http.expectOne(`${TEST_API}/communications/email/smtp-test`);
    expect(smtp.request.body).toEqual({ profile: 'invoicing' });
    smtp.flush(
      {
        statusCode: 422,
        code: 'SMTP_NOT_CONFIGURED',
        message: 'Configure el SMTP de facturación.',
      },
      { status: 422, statusText: 'Unprocessable' },
    );
    await settle(fixture);
    expect(el.textContent).toContain('La prueba falló');
    expect(el.textContent).toContain('Configure el SMTP de facturación.');

    const input = el.querySelector('input[type="file"]') as HTMLInputElement;
    const pick = (file: File) => {
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      input.dispatchEvent(new Event('change'));
    };
    pick(new File(['x'], 'logo.bmp'));
    await settle(fixture);
    http.expectNone(`${TEST_API}/communications/email/images`);
    expect(el.textContent).toContain('Formato no permitido');

    // jsdom no implementa createObjectURL/revokeObjectURL.
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:logo'), revokeObjectURL: vi.fn() });
    pick(new File(['x'], 'logo.png', { type: 'image/png' }));
    await settle(fixture);
    const upload = http.expectOne(`${TEST_API}/communications/email/images`);
    expect((upload.request.body as FormData).get('type')).toBe('logo');
    upload.flush({ kind: 'logo', path: 'email/logo.png', contentType: 'image/png', size: 1 });
    await settle(fixture);
    expect(el.querySelector('img')?.getAttribute('src')).toBe('blob:logo');
  });
});
