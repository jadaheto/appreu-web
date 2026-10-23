import { HttpTestingController } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthUser, ConfirmService, SessionStore } from '../../../core';
import { makeUser, provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import {
  AccessLogRecord,
  InstitutionProfile,
  ManagedUser,
  SECRET_MASK,
  SettingsSectionMetadata,
} from '../data-access/administration.models';
import { AuditPage } from './audit/audit-page';
import { SettingsPage } from './settings/settings-page';
import { UsersPage } from './users/users-page';

const page = <T>(items: T[], limit = 20) => ({ items, total: items.length, page: 1, limit });

const user = (overrides: Partial<ManagedUser>): ManagedUser => ({
  id: 2,
  name: 'Carlos Díaz',
  email: 'carlos@colegio.co',
  role: 'teacher',
  avatar: null,
  isActive: true,
  mustChangePassword: false,
  lastLogin: '2026-10-20T08:00:00Z',
  createdAt: '2026-01-10T08:00:00Z',
  employmentStatus: 'active',
  effectiveStatus: 'active',
  ...overrides,
});

const STATS = { total: 4, admins: 2, staff: 1, families: 0, inactive: 1 };

const profile: InstitutionProfile = {
  id: 1,
  name: 'Colegio Demo',
  nit: '900123456',
  nitDv: 8,
  nitFormatted: '900.123.456-8',
  documentType: 'NIT',
  personType: 'juridica',
  address: 'Cra 1 # 2-3',
  phone: '6011234567',
  email: 'info@demo.edu.co',
  city: 'Bogotá',
  cityDaneCode: '001',
  department: 'Bogotá D.C.',
  departmentDaneCode: '11',
  postalCode: '110111',
  taxResponsibilities: ['O-13', 'R-99-PN'],
  daneCode: '311001000001',
  resolutionNumber: '123',
  rectorName: 'María López',
  billingContact: { name: null, phone: null, email: null },
  logoUrl: null,
};

const INTEGRATIONS: SettingsSectionMetadata = {
  key: 'integrations',
  label: 'Integraciones',
  fields: [
    {
      key: 'whatsapp_token',
      label: 'Token de WhatsApp',
      type: 'text',
      secret: true,
      readOnly: false,
      options: null,
      min: null,
      max: null,
      maxLength: 500,
    },
    {
      key: 'whatsapp_phone_id',
      label: 'Phone Number ID',
      type: 'text',
      secret: false,
      readOnly: false,
      options: null,
      min: null,
      max: null,
      maxLength: 50,
    },
    {
      key: 'smtp_port',
      label: 'Puerto SMTP',
      type: 'integer',
      secret: false,
      readOnly: false,
      options: null,
      min: 1,
      max: 65535,
      maxLength: null,
    },
  ],
};
const CATALOG: SettingsSectionMetadata[] = [
  INTEGRATIONS,
  { key: 'dian', label: 'DIAN', fields: [] },
  { key: 'ai', label: 'Apreu IA', fields: [INTEGRATIONS.fields[1]] },
];

describe('páginas de administración', () => {
  let http: HttpTestingController;
  let confirmAnswer = true;

  function setup<T>(
    cmp: Type<T>,
    me: Partial<AuthUser> = {},
    inputs: Record<string, unknown> = {},
  ) {
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
      user: makeUser(me),
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

  const click = (el: HTMLElement, text: string) => {
    const btn = Array.from(el.querySelectorAll<HTMLElement>('button, a')).find((b) =>
      b.textContent?.includes(text),
    );
    if (!btn) throw new Error(`No se encontró el botón «${text}»`);
    btn.click();
  };
  const type = (el: HTMLElement, selector: string, value: string) => {
    const input = el.querySelector(selector) as HTMLInputElement;
    if (!input) throw new Error(`No se encontró ${selector}`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const submit = (el: HTMLElement, selector: string) =>
    (el.querySelector(selector) as HTMLFormElement).dispatchEvent(new Event('submit'));
  const row = (el: HTMLElement, text: string) =>
    Array.from(el.querySelectorAll<HTMLTableRowElement>('tbody tr')).find((r) =>
      r.textContent?.includes(text),
    )!;
  const actionLabels = (tr: HTMLElement) =>
    Array.from(tr.querySelectorAll('button[aria-label]')).map((b) => b.getAttribute('aria-label'));

  afterEach(() => http.verify());

  async function loadUsers(fixture: ComponentFixture<unknown>, rows: ManagedUser[]) {
    await settle(fixture);
    http.expectOne(`${TEST_API}/users/stats`).flush(STATS);
    const list = http.expectOne((r) => r.url === `${TEST_API}/users`);
    expect(list.request.params.get('limit')).toBe('20');
    list.flush(page(rows));
    await settle(fixture);
  }

  it('usuarios: KPIs y acciones según la fila (yo, superadmin, inactivo)', async () => {
    const { fixture, el } = setup(UsersPage, { id: 1, role: 'admin' });
    await loadUsers(fixture, [
      user({ id: 1, name: 'Ana Pérez', role: 'admin' }),
      user({ id: 2 }),
      user({ id: 3, name: 'Root', role: 'superadmin' }),
      user({ id: 4, name: 'Inés Mora', isActive: false, effectiveStatus: 'inactive' }),
    ]);

    expect(el.querySelector('ui-stat-card .value')?.textContent).toContain('4');
    expect(row(el, 'Ana Pérez').textContent).toContain('Tú');
    expect(actionLabels(row(el, 'Ana Pérez'))).toEqual(['Editar usuario']);
    expect(actionLabels(row(el, 'Carlos Díaz'))).toEqual([
      'Editar usuario',
      'Restablecer contraseña',
      'Desactivar usuario',
    ]);
    expect(actionLabels(row(el, 'Root'))).toEqual([]);
    expect(actionLabels(row(el, 'Inés Mora'))).toContain('Activar usuario');
  });

  it('usuarios: alta muestra la contraseña temporal una sola vez', async () => {
    const { fixture, el } = setup(UsersPage, { id: 1, role: 'admin' });
    await loadUsers(fixture, []);

    click(el, 'Nuevo usuario');
    await settle(fixture);
    // Un administrador no puede asignar superadmin.
    const roleSelect = el.querySelector(
      '#user-form [formcontrolname="role"] select',
    ) as HTMLSelectElement;
    expect(Array.from(roleSelect.options).map((o) => o.textContent?.trim())).not.toContain(
      'Superadministrador',
    );
    type(el, '#user-form [formcontrolname="name"] input', ' Laura Gil ');
    type(el, '#user-form [formcontrolname="email"] input', 'Laura@Colegio.CO');
    roleSelect.value = '2'; // admin, finance, hr…
    roleSelect.dispatchEvent(new Event('change'));
    await settle(fixture);
    submit(el, '#user-form');
    await settle(fixture);

    const req = http.expectOne(`${TEST_API}/users`);
    expect(req.request.body).toEqual({ name: 'Laura Gil', email: 'laura@colegio.co', role: 'hr' });
    req.flush({
      user: user({ id: 9, name: 'Laura Gil', email: 'laura@colegio.co', role: 'hr' }),
      temporaryPassword: 'Tmp-4821',
    });
    await settle(fixture);
    http.expectOne(`${TEST_API}/users/stats`).flush(STATS);
    http.expectOne((r) => r.url === `${TEST_API}/users`).flush(page([]));
    await settle(fixture);

    expect(el.querySelector('code[aria-label="Contraseña temporal"]')?.textContent).toBe(
      'Tmp-4821',
    );
    click(el, 'Entendido');
    await settle(fixture);
    expect(el.textContent).not.toContain('Tmp-4821');
  });

  it('usuarios: el error de la API (correo duplicado) se muestra en el formulario', async () => {
    const { fixture, el } = setup(UsersPage, { id: 1, role: 'admin' });
    await loadUsers(fixture, []);
    click(el, 'Nuevo usuario');
    await settle(fixture);
    type(el, '#user-form [formcontrolname="name"] input', 'Laura Gil');
    type(el, '#user-form [formcontrolname="email"] input', 'laura@colegio.co');
    await settle(fixture);
    submit(el, '#user-form');
    await settle(fixture);
    http
      .expectOne(`${TEST_API}/users`)
      .flush(
        { statusCode: 409, code: 'CONFLICT', message: 'Ya existe un usuario con ese correo.' },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(fixture);
    expect(el.querySelector('#user-form ui-alert')?.textContent).toContain(
      'Ya existe un usuario con ese correo.',
    );
  });

  it('usuarios: editar envía solo los cambios (con confirmación de rol) y desactivar', async () => {
    const { fixture, el } = setup(UsersPage, { id: 1, role: 'admin' });
    await loadUsers(fixture, [user({ id: 2 })]);

    (
      row(el, 'Carlos Díaz').querySelector(
        'button[aria-label="Editar usuario"]',
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    const roleSelect = el.querySelector(
      '#user-form [formcontrolname="role"] select',
    ) as HTMLSelectElement;
    roleSelect.value = '1'; // finance
    roleSelect.dispatchEvent(new Event('change'));
    await settle(fixture);
    submit(el, '#user-form');
    await settle(fixture);
    const patch = http.expectOne(`${TEST_API}/users/2`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ role: 'finance' });
    patch.flush(user({ id: 2, role: 'finance' }));
    await settle(fixture);
    http
      .expectOne((r) => r.url === `${TEST_API}/users`)
      .flush(page([user({ id: 2, role: 'finance' })]));
    http.expectOne(`${TEST_API}/users/stats`).flush(STATS);
    await settle(fixture);

    (
      row(el, 'Carlos Díaz').querySelector(
        'button[aria-label="Desactivar usuario"]',
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    const status = http.expectOne(`${TEST_API}/users/2/status`);
    expect(status.request.body).toEqual({ active: false });
    status.flush(user({ id: 2, isActive: false }));
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/users`).flush(page([]));
    http.expectOne(`${TEST_API}/users/stats`).flush(STATS);
    await settle(fixture);
  });

  it('usuarios: restablecer contraseña cancelado no llama a la API', async () => {
    const { fixture, el } = setup(UsersPage, { id: 1, role: 'admin' });
    await loadUsers(fixture, [user({ id: 2 })]);
    confirmAnswer = false;
    (
      row(el, 'Carlos Díaz').querySelector(
        'button[aria-label="Restablecer contraseña"]',
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    http.expectNone(`${TEST_API}/users/2/password-reset`);
  });

  it('auditoría: lista de 50 por página, denegados resaltados y filtro rápido por usuario', async () => {
    const record = (overrides: Partial<AccessLogRecord>): AccessLogRecord => ({
      id: 1,
      userId: 9,
      userName: 'Carlos Díaz',
      userEmail: 'carlos@colegio.co',
      role: 'teacher',
      path: '/api/finance/payments',
      module: 'finance',
      allowed: false,
      ipAddress: '10.0.0.1',
      createdAt: '2026-10-20T08:00:00Z',
      ...overrides,
    });
    const { fixture, el } = setup(AuditPage, { role: 'admin' });
    await settle(fixture);
    const req = http.expectOne((r) => r.url === `${TEST_API}/audit/access-log`);
    expect(req.request.params.get('limit')).toBe('50');
    req.flush(
      page(
        [
          record({}),
          record({ id: 2, allowed: true, module: 'academic', path: '/api/academic/grades' }),
        ],
        50,
      ),
    );
    await settle(fixture);
    expect(el.textContent).toContain('Denegado');
    expect(el.textContent).toContain('Permitido');
    expect(el.querySelectorAll('tr.is-denied').length).toBe(1);

    (el.querySelector('button.link-btn') as HTMLButtonElement).click();
    await settle(fixture);
    const filtered = http.expectOne((r) => r.url === `${TEST_API}/audit/access-log`);
    expect(filtered.request.params.get('userId')).toBe('9');
    filtered.flush(page([], 50));
    await settle(fixture);
    expect(el.textContent).toContain('Ningún acceso coincide con los filtros.');
  });

  it('configuración (admin): institución + pestañas del catálogo sin DIAN; guarda la institución', async () => {
    const { fixture, el } = setup(SettingsPage, { role: 'admin' });
    await settle(fixture);
    http.expectOne(`${TEST_API}/institution/settings`).flush(CATALOG);
    http.expectOne(`${TEST_API}/institution`).flush(profile);
    await settle(fixture);

    const tabs = Array.from(el.querySelectorAll('[role="tab"]')).map((t) => t.textContent?.trim());
    expect(tabs).toEqual(['Institución / RUT', 'Integraciones', 'Apreu IA']);
    const name = el.querySelector('[formcontrolname="name"] input') as HTMLInputElement;
    expect(name.value).toBe('Colegio Demo');

    type(el, '[formcontrolname="name"] input', 'Colegio Demo Bilingüe');
    type(el, '[formcontrolname="nit"] input', '900.123.456');
    await settle(fixture);
    submit(el, 'app-institution-form form');
    await settle(fixture);
    const put = http.expectOne(`${TEST_API}/institution`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toMatchObject({
      name: 'Colegio Demo Bilingüe',
      nit: '900123456',
      taxResponsibilities: ['O-13', 'R-99-PN'],
      billingContactName: null,
    });
    put.flush({ ...profile, name: 'Colegio Demo Bilingüe' });
    await settle(fixture);
    expect((el.querySelector('[formcontrolname="name"] input') as HTMLInputElement).value).toBe(
      'Colegio Demo Bilingüe',
    );
  });

  it('configuración: pestaña de integraciones envía solo los cambios y no reenvía el secreto', async () => {
    const { fixture, el } = setup(SettingsPage, { role: 'admin' });
    await settle(fixture);
    http.expectOne(`${TEST_API}/institution/settings`).flush(CATALOG);
    http
      .expectOne(`${TEST_API}/institution`)
      .flush({ message: 'No encontrado' }, { status: 404, statusText: 'NF' });
    await settle(fixture);
    expect(el.textContent).toContain('Aún no hay datos registrados');

    Array.from(el.querySelectorAll<HTMLElement>('[role="tab"]'))
      .find((t) => t.textContent?.includes('Integraciones'))!
      .click();
    await settle(fixture);
    http.expectOne(`${TEST_API}/institution/settings/integrations`).flush({
      section: 'integrations',
      label: 'Integraciones',
      values: { whatsapp_token: SECRET_MASK, whatsapp_phone_id: '111', smtp_port: 587 },
    });
    await settle(fixture);
    expect(el.textContent).toContain('Configurado. Déjalo así');

    // Los controles dinámicos usan [formControlName]: se ubican por la etiqueta del campo.
    const phoneId = Array.from(el.querySelectorAll('app-settings-section-form ui-form-field'))
      .find((f) => f.textContent?.includes('Phone Number ID'))!
      .querySelector('input') as HTMLInputElement;
    phoneId.value = '222';
    phoneId.dispatchEvent(new Event('input'));
    await settle(fixture);
    submit(el, 'app-settings-section-form form');
    await settle(fixture);
    const put = http.expectOne(`${TEST_API}/institution/settings/integrations`);
    expect(put.request.body).toEqual({ values: { whatsapp_phone_id: '222' } });
    put.flush({
      section: 'integrations',
      label: 'Integraciones',
      values: { whatsapp_token: SECRET_MASK, whatsapp_phone_id: '222', smtp_port: 587 },
    });
    await settle(fixture);
  });

  it('configuración: ?tab= abre la sección pedida (sin cargar la institución)', async () => {
    const { fixture, el } = setup(SettingsPage, { role: 'finance' }, { tab: 'ai' });
    await settle(fixture);
    http.expectOne(`${TEST_API}/institution/settings`).flush(CATALOG);
    await settle(fixture);
    http
      .expectOne(`${TEST_API}/institution/settings/ai`)
      .flush({ section: 'ai', label: 'Apreu IA', values: { whatsapp_phone_id: null } });
    await settle(fixture);
    expect(el.querySelector('app-settings-section-form h2')?.textContent).toContain('Apreu IA');
    http.expectNone(`${TEST_API}/institution`);
  });
});
