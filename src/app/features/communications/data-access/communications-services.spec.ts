import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import { AiService } from './ai.service';
import { countPlaceholders, renderTemplate, WhatsAppTemplateInput } from './communications.models';
import { EmailService } from './email.service';
import { NotificationsService } from './notifications.service';
import { WhatsAppService } from './whatsapp.service';

const apiPage = <T>(items: T[], page = 1, limit = 20) => ({
  items,
  total: items.length,
  page,
  limit,
});

describe('servicios de comunicaciones', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideTestHttp() });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('WhatsAppService', () => {
    it('historial: traduce pageSize→limit, omite filtros vacíos y devuelve Page', async () => {
      const wa = TestBed.inject(WhatsAppService);
      const result = firstValueFrom(
        wa.logs({ page: 2, pageSize: 50, search: '', status: 'failed' }),
      );
      const req = http.expectOne((r) => r.url === `${TEST_API}/communications/whatsapp/logs`);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('50');
      expect(req.request.params.get('status')).toBe('failed');
      expect(req.request.params.has('search')).toBe(false);
      req.flush(apiPage([], 2, 50));
      expect(await result).toEqual({ items: [], total: 0, page: 2, pageSize: 50 });
    });

    it('plantilla: limpia los opcionales según el tipo de encabezado', async () => {
      const wa = TestBed.inject(WhatsAppService);
      const input: WhatsAppTemplateInput = {
        name: 'cobro_mensual',
        metaTemplateId: null,
        language: 'es_CO',
        category: 'utility',
        body: 'Hola {{1}}',
        variables: ['Nombre'],
        status: 'active',
        headerType: 'text',
        headerText: 'Aviso',
        headerImageUrl: 'https://ignorada',
        footerText: null,
        buttons: [],
      };
      const created = firstValueFrom(wa.createTemplate(input));
      const req = http.expectOne(`${TEST_API}/communications/whatsapp/templates`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        name: 'cobro_mensual',
        language: 'es_CO',
        category: 'utility',
        body: 'Hola {{1}}',
        variables: ['Nombre'],
        status: 'active',
        headerType: 'text',
        headerText: 'Aviso',
        buttons: [],
      });
      req.flush({ id: 1 });
      await created;

      const updated = firstValueFrom(wa.updateTemplate(1, { ...input, headerType: 'none' }));
      const put = http.expectOne(`${TEST_API}/communications/whatsapp/templates/1`);
      expect(put.request.method).toBe('PUT');
      expect(put.request.body.headerText).toBeUndefined();
      put.flush({ id: 1 });
      await updated;
    });

    it('evento: omite los detalles vacíos; confirmación de pago por id', async () => {
      const wa = TestBed.inject(WhatsAppService);
      const sent = firstValueFrom(
        wa.notifyEvent({ date: '2026-11-01', name: 'Feria', details: '' }),
      );
      const req = http.expectOne(`${TEST_API}/communications/whatsapp/events`);
      expect(req.request.body).toEqual({ date: '2026-11-01', name: 'Feria' });
      req.flush({ total: 1, sent: 1, failed: 0, skipped: 0, failures: [] });
      await sent;

      const confirmed = firstValueFrom(wa.confirmPayment(9));
      const post = http.expectOne(`${TEST_API}/communications/whatsapp/payment-confirmations/9`);
      expect(post.request.method).toBe('POST');
      post.flush({ phone: '573001112233', messageId: 'wamid' });
      await confirmed;
    });

    it('pagos recientes: solo aplicados, 10 por página', async () => {
      const wa = TestBed.inject(WhatsAppService);
      const res = firstValueFrom(wa.recentPayments('R-1'));
      const req = http.expectOne((r) => r.url === `${TEST_API}/finance/payments`);
      expect(req.request.params.get('status')).toBe('applied');
      expect(req.request.params.get('limit')).toBe('10');
      expect(req.request.params.get('search')).toBe('R-1');
      req.flush(apiPage([], 1, 10));
      expect((await res).pageSize).toBe(10);
    });
  });

  describe('EmailService', () => {
    it('aviso: multipart solo con los campos de la audiencia elegida', async () => {
      const email = TestBed.inject(EmailService);
      const file = new File(['x'], 'circular.pdf', { type: 'application/pdf' });
      const sent = firstValueFrom(
        email.sendNotice({
          audience: 'by_grade',
          gradeId: 3,
          classroomId: 8,
          manualEmails: 'a@b.co',
          subject: 'Reunión',
          bodyHtml: '<p>Hola</p>',
          attachments: [file],
        }),
      );
      const req = http.expectOne(`${TEST_API}/communications/email/notices`);
      const form = req.request.body as FormData;
      expect(form.get('audience')).toBe('by_grade');
      expect(form.get('gradeId')).toBe('3');
      expect(form.has('classroomId')).toBe(false);
      expect(form.has('manualEmails')).toBe(false);
      expect(form.get('subject')).toBe('Reunión');
      expect((form.getAll('attachments')[0] as File).name).toBe('circular.pdf');
      req.flush({ total: 10, sent: 10, failed: 0, skipped: 0, failures: [] });
      expect((await sent).sent).toBe(10);
    });

    it('avisos de cobro: preview con mes/concepto y envío sin plantilla si no hay WhatsApp', async () => {
      const email = TestBed.inject(EmailService);
      const preview = firstValueFrom(email.billingPreview('2026-10', 4));
      const get = http.expectOne(
        (r) => r.url === `${TEST_API}/communications/billing-notices/preview`,
      );
      expect(get.request.params.get('month')).toBe('2026-10');
      expect(get.request.params.get('conceptId')).toBe('4');
      get.flush({
        month: '2026-10',
        charges: 3,
        totalAmount: 1,
        guardiansWithEmail: 1,
        guardiansWithMobile: 1,
        studentsWithoutEmail: 0,
      });
      await preview;

      const sent = firstValueFrom(
        email.sendBilling({
          month: '2026-10',
          conceptId: null,
          channels: ['email'],
          templateName: 'cobro_mensual',
        }),
      );
      const post = http.expectOne(`${TEST_API}/communications/billing-notices`);
      expect(post.request.body).toEqual({ month: '2026-10', channels: ['email'] });
      post.flush({ charges: 3, email: null, whatsapp: null });
      await sent;
    });

    it('herramientas: prueba SMTP e imagen del correo', async () => {
      const email = TestBed.inject(EmailService);
      const smtp = firstValueFrom(email.testSmtp('invoicing'));
      http
        .expectOne(`${TEST_API}/communications/email/smtp-test`)
        .flush({ to: 'a@b.co', host: 'smtp', port: 587, security: 'tls' });
      expect((await smtp).port).toBe(587);

      const upload = firstValueFrom(email.uploadImage('logo', new File(['x'], 'logo.png')));
      const req = http.expectOne(`${TEST_API}/communications/email/images`);
      expect((req.request.body as FormData).get('type')).toBe('logo');
      req.flush({ kind: 'logo', path: 'x', contentType: 'image/png', size: 1 });
      await upload;
    });
  });

  describe('AiService', () => {
    it('chat sin toast automático; historial propio con 15 por página', async () => {
      const ai = TestBed.inject(AiService);
      const answer = firstValueFrom(ai.chat('¿Cuántos alumnos hay?'));
      const req = http.expectOne(`${TEST_API}/ai/chat`);
      expect(req.request.body).toEqual({ message: '¿Cuántos alumnos hay?' });
      req.flush({ response: '400' });
      expect((await answer).response).toBe('400');

      const history = firstValueFrom(ai.myHistory({}));
      const get = http.expectOne((r) => r.url === `${TEST_API}/ai/chat/history`);
      expect(get.request.params.get('limit')).toBe('15');
      get.flush(apiPage([], 1, 15));
      await history;
    });

    it('monitor y marketing: filtros como query params', async () => {
      const ai = TestBed.inject(AiService);
      const logs = firstValueFrom(ai.logs({ role: 'teacher', from: '2026-10-01', to: null }));
      const req = http.expectOne((r) => r.url === `${TEST_API}/ai/chat/logs`);
      expect(req.request.params.get('role')).toBe('teacher');
      expect(req.request.params.get('from')).toBe('2026-10-01');
      expect(req.request.params.has('to')).toBe(false);
      req.flush(apiPage([]));
      await logs;

      const gen = firstValueFrom(ai.generate('email', 'Campaña de matrículas'));
      const post = http.expectOne(`${TEST_API}/marketing/generations`);
      expect(post.request.body).toEqual({ type: 'email', context: 'Campaña de matrículas' });
      post.flush({ id: 1 });
      await gen;

      const hist = firstValueFrom(ai.marketingHistory({ type: 'email', date: '2026-10-20' }));
      const get = http.expectOne((r) => r.url === `${TEST_API}/marketing/generations`);
      expect(get.request.params.get('type')).toBe('email');
      expect(get.request.params.get('date')).toBe('2026-10-20');
      expect(get.request.params.get('limit')).toBe('10');
      get.flush(apiPage([], 1, 10));
      await hist;
    });
  });

  describe('NotificationsService', () => {
    it('mis notificaciones conserva el total de no leídas', async () => {
      const svc = TestBed.inject(NotificationsService);
      const res = firstValueFrom(svc.mine({ unreadOnly: true }));
      const req = http.expectOne((r) => r.url === `${TEST_API}/notifications`);
      expect(req.request.params.get('unreadOnly')).toBe('true');
      req.flush({ ...apiPage([], 1, 10), unread: 4 });
      expect(await res).toEqual({ items: [], total: 0, page: 1, pageSize: 10, unread: 4 });

      const all = firstValueFrom(svc.markAllRead());
      const patch = http.expectOne(`${TEST_API}/notifications/read-all`);
      expect(patch.request.method).toBe('PATCH');
      patch.flush({ updated: 4 });
      expect((await all).updated).toBe(4);

      const sent = firstValueFrom(
        svc.send({ userIds: [2, 3], title: 'Reunión', message: 'Mañana 7 a. m.' }),
      );
      const post = http.expectOne(`${TEST_API}/notifications`);
      expect(post.request.body).toEqual({
        userIds: [2, 3],
        title: 'Reunión',
        message: 'Mañana 7 a. m.',
      });
      post.flush({ created: 2 });
      await sent;
    });
  });

  it('plantillas: cuenta y reemplaza placeholders', () => {
    expect(countPlaceholders('Hola {{1}}, debe {{3}} de {{ 2 }}')).toBe(3);
    expect(renderTemplate('Hola {{1}}, saldo {{2}}', ['Ana'])).toBe('Hola Ana, saldo {{2}}');
  });
});
