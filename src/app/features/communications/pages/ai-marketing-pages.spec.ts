import { HttpTestingController } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthUser, SessionStore } from '../../../core';
import { makeUser, provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import type {
  ChatExchange,
  ChatLog,
  MarketingGeneration,
  MarketingTypeInfo,
} from '../data-access/communications.models';
import { AiHistoryPage } from './ai/ai-history-page';
import { AiMonitorPage } from './ai/ai-monitor-page';
import { MarketingGeneratorPage } from './marketing/marketing-generator-page';
import { MarketingHistoryPage } from './marketing/marketing-history-page';
import { MarketingPage } from './marketing/marketing-page';

const page = <T>(items: T[], limit = 20) => ({ items, total: items.length, page: 1, limit });

const TYPES: MarketingTypeInfo[] = [
  {
    type: 'estrategia',
    icon: '🎯',
    title: 'Estrategia',
    description: 'Plan de marketing',
    color: 'blue',
  },
  {
    type: 'email',
    icon: '📧',
    title: 'Email marketing',
    description: 'Correos de campaña',
    color: 'green',
  },
];

const generation: MarketingGeneration = {
  id: 5,
  type: 'email',
  contextInput: 'Campaña de matrículas 2027',
  crmData: { estudiantes_activos: 400 },
  aiResponse: '**Asunto:** ¡Matrículas abiertas!',
  createdAt: '2026-10-20T10:00:00Z',
};

const exchange: ChatExchange = {
  id: 1,
  role: 'teacher',
  userMessage: '¿Cuántos alumnos tengo?',
  aiResponse: 'Tienes **32** alumnos.',
  createdAt: '2026-10-20T10:00:00Z',
};

const chatLog: ChatLog = {
  ...exchange,
  userId: 9,
  userName: 'Carlos Díaz',
  userEmail: 'carlos@colegio.co',
};

describe('páginas de IA y marketing', () => {
  let http: HttpTestingController;

  function setup<T>(
    cmp: Type<T>,
    user: Partial<AuthUser> = {},
    inputs: Record<string, unknown> = {},
  ) {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestHttp() });
    TestBed.inject(SessionStore).set({
      token: 't',
      expiresAt: Date.now() + 60_000,
      tenant: null,
      user: makeUser(user),
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(cmp);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  async function settle(fixture: ComponentFixture<unknown>) {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r));
    }
    fixture.detectChanges();
  }

  const type = (el: HTMLElement, selector: string, value: string) => {
    const input = el.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const submit = (el: HTMLElement, selector = 'form') =>
    (el.querySelector(selector) as HTMLFormElement).dispatchEvent(new Event('submit'));

  afterEach(() => http.verify());

  it('marketing: catálogo de generadores y generaciones recientes', async () => {
    const { fixture, el } = setup(MarketingPage, { role: 'admin' });
    await settle(fixture);
    http.expectOne(`${TEST_API}/marketing/types`).flush(TYPES);
    const recent = http.expectOne((r) => r.url === `${TEST_API}/marketing/generations`);
    expect(recent.request.params.get('limit')).toBe('3');
    recent.flush(page([generation], 3));
    await settle(fixture);

    const cards = Array.from(el.querySelectorAll('a.type-card'));
    expect(cards.length).toBe(2);
    expect(cards[1].getAttribute('href')).toContain('generar/email');
    expect(el.textContent).toContain('Campaña de matrículas 2027');
    expect(el.textContent).toContain('Email marketing');
  });

  it('marketing: si el catálogo falla muestra el error (sin romper la plantilla)', async () => {
    const { fixture, el } = setup(MarketingPage, { role: 'admin' });
    await settle(fixture);
    http
      .expectOne(`${TEST_API}/marketing/types`)
      .flush({ message: 'Fallo' }, { status: 500, statusText: 'Error' });
    http.expectOne((r) => r.url === `${TEST_API}/marketing/generations`).flush(page([], 3));
    await settle(fixture);
    expect(el.querySelector('ui-alert')?.textContent).toContain('No se pudo cargar el catálogo');
    expect(el.textContent).toContain('Aún no has generado contenido');
  });

  it('generador: valida el contexto, genera y muestra el resultado con los datos del CRM', async () => {
    const { fixture, el } = setup(MarketingGeneratorPage, { role: 'admin' }, { type: 'email' });
    await settle(fixture);
    http.expectOne(`${TEST_API}/marketing/types`).flush(TYPES);
    await settle(fixture);
    expect(el.querySelector('h1')?.textContent).toContain('Email marketing');

    type(el, 'textarea', 'corto');
    await settle(fixture);
    submit(el);
    await settle(fixture); // mínimo 10 caracteres: no se envía

    type(el, 'textarea', '  Campaña de matrículas 2027  ');
    await settle(fixture);
    submit(el);
    await settle(fixture);
    const req = http.expectOne(`${TEST_API}/marketing/generations`);
    expect(req.request.body).toEqual({ type: 'email', context: 'Campaña de matrículas 2027' });
    req.flush(generation);
    await settle(fixture);
    expect(el.querySelector('.ai-text strong')?.textContent).toContain('Asunto:');
    expect(el.textContent).toContain('estudiantes activos: 400');
  });

  it('generador: IA sin configurar → aviso con enlace a configuración para admin', async () => {
    const { fixture, el } = setup(
      MarketingGeneratorPage,
      { role: 'admin' },
      { type: 'estrategia' },
    );
    await settle(fixture);
    http.expectOne(`${TEST_API}/marketing/types`).flush(TYPES);
    type(el, 'textarea', 'Plan anual de admisiones para bachillerato');
    await settle(fixture);
    submit(el);
    await settle(fixture);
    http.expectOne(`${TEST_API}/marketing/generations`).flush(
      {
        statusCode: 422,
        code: 'MARKETING_AI_NOT_CONFIGURED',
        message: 'Configure la clave de IA.',
      },
      { status: 422, statusText: 'Unprocessable' },
    );
    await settle(fixture);
    const alert = el.querySelector('ui-alert');
    expect(alert?.textContent).toContain('Marketing IA sin configurar');
    expect(alert?.textContent).toContain('Configure la clave de IA.');
    expect(alert?.querySelector('a')?.getAttribute('href')).toContain('/admin/configuracion');
  });

  it('generador: tipo inválido en la URL', async () => {
    const { fixture, el } = setup(MarketingGeneratorPage, { role: 'admin' }, { type: 'otro' });
    await settle(fixture);
    http.expectOne(`${TEST_API}/marketing/types`).flush(TYPES);
    await settle(fixture);
    expect(el.textContent).toContain('Generador no encontrado');
  });

  it('historial de marketing: lista paginada con filtros', async () => {
    const { fixture, el } = setup(MarketingHistoryPage, { role: 'admin' });
    await settle(fixture);
    http.expectOne(`${TEST_API}/marketing/types`).flush(TYPES);
    const req = http.expectOne((r) => r.url === `${TEST_API}/marketing/generations`);
    expect(req.request.params.get('limit')).toBe('10');
    req.flush(page([generation], 10));
    await settle(fixture);
    expect(el.textContent).toContain('📧 Email marketing');
    expect(el.textContent).toContain('Campaña de matrículas 2027');
    expect(el.querySelector('ui-pagination')).not.toBeNull();
  });

  it('historial IA (portal): chat → al responder recarga el historial', async () => {
    const { fixture, el } = setup(AiHistoryPage, { role: 'teacher', portal: 'employee' });
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/ai/chat/history`).flush(page([exchange], 15));
    await settle(fixture);
    expect(el.textContent).toContain('Tú preguntaste: “¿Cuántos alumnos tengo?”');

    type(el, '#ai-chat-input', '¿Qué notas faltan?');
    await settle(fixture);
    submit(el, 'app-ai-chat form');
    await settle(fixture);
    const chat = http.expectOne(`${TEST_API}/ai/chat`);
    expect(chat.request.body).toEqual({ message: '¿Qué notas faltan?' });
    chat.flush({ response: 'Faltan **3** notas.' });
    await settle(fixture);
    expect(el.querySelector('[role="log"]')?.textContent).toContain('Faltan 3 notas.');
    http
      .expectOne((r) => r.url === `${TEST_API}/ai/chat/history`)
      .flush(
        page(
          [exchange, exchange].map((x, i) => ({ ...x, id: i + 1 })),
          15,
        ),
      );
    await settle(fixture);
  });

  it('historial IA: el error del chat se muestra en la conversación', async () => {
    const { fixture, el } = setup(AiHistoryPage, { role: 'student', portal: 'student' });
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/ai/chat/history`).flush(page([], 15));
    await settle(fixture);
    expect(el.textContent).toContain('Historial vacío');

    type(el, '#ai-chat-input', 'Hola');
    await settle(fixture);
    submit(el, 'app-ai-chat form');
    await settle(fixture);
    http
      .expectOne(`${TEST_API}/ai/chat`)
      .flush({ message: 'Demasiadas solicitudes' }, { status: 429, statusText: 'Too Many' });
    await settle(fixture);
    expect(el.querySelector('.bubble.error')?.textContent).toContain(
      'Has enviado muchos mensajes seguidos',
    );
  });

  it('monitor IA: conversaciones del colegio y detalle completo', async () => {
    const { fixture, el } = setup(AiMonitorPage, { role: 'admin' });
    await settle(fixture);
    const req = http.expectOne((r) => r.url === `${TEST_API}/ai/chat/logs`);
    expect(req.request.params.get('limit')).toBe('20');
    req.flush(page([chatLog]));
    await settle(fixture);
    expect(el.textContent).toContain('Carlos Díaz');

    (
      el.querySelector('button[aria-label="Ver conversación completa"]') as HTMLButtonElement
    ).click();
    await settle(fixture);
    const dialog = el.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('¿Cuántos alumnos tengo?');
    expect(dialog?.textContent).toContain('32');
  });
});
