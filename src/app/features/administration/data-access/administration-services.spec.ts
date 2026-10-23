import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import { nitCheckDigit, SECRET_MASK, SettingField } from './administration.models';
import { InstitutionService } from './institution.service';
import { buildSettingControl, changedSettingValues } from './settings-form';
import { UsersService } from './users.service';

const field = (overrides: Partial<SettingField>): SettingField => ({
  key: 'k',
  label: 'Campo',
  type: 'text',
  secret: false,
  readOnly: false,
  options: null,
  min: null,
  max: null,
  maxLength: null,
  ...overrides,
});

describe('servicios de administración', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideTestHttp() });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('UsersService', () => {
    it('listado: filtros como query params (incluido active=false) y Page', async () => {
      const users = TestBed.inject(UsersService);
      const res = firstValueFrom(
        users.list({ page: 3, pageSize: 50, role: 'teacher', active: false, search: null }),
      );
      const req = http.expectOne((r) => r.url === `${TEST_API}/users`);
      expect(req.request.params.get('page')).toBe('3');
      expect(req.request.params.get('limit')).toBe('50');
      expect(req.request.params.get('role')).toBe('teacher');
      expect(req.request.params.get('active')).toBe('false');
      expect(req.request.params.has('search')).toBe(false);
      req.flush({ items: [], total: 0, page: 3, limit: 50 });
      expect(await res).toEqual({ items: [], total: 0, page: 3, pageSize: 50 });
    });

    it('alta, edición, estado y restablecimiento de contraseña', async () => {
      const users = TestBed.inject(UsersService);
      const created = firstValueFrom(users.create({ name: 'Ana', email: 'ana@x.co', role: 'hr' }));
      const post = http.expectOne(`${TEST_API}/users`);
      expect(post.request.method).toBe('POST');
      post.flush({ user: { id: 2 }, temporaryPassword: 'Tmp' });
      expect((await created).temporaryPassword).toBe('Tmp');

      const updated = firstValueFrom(users.update(2, { role: 'finance' }));
      const patch = http.expectOne(`${TEST_API}/users/2`);
      expect(patch.request.method).toBe('PATCH');
      expect(patch.request.body).toEqual({ role: 'finance' });
      patch.flush({ id: 2 });
      await updated;

      const status = firstValueFrom(users.setActive(2, false));
      const st = http.expectOne(`${TEST_API}/users/2/status`);
      expect(st.request.body).toEqual({ active: false });
      st.flush({ id: 2 });
      await status;

      const reset = firstValueFrom(users.resetPassword(2));
      const rs = http.expectOne(`${TEST_API}/users/2/password-reset`);
      expect(rs.request.method).toBe('POST');
      rs.flush({ user: { id: 2 }, temporaryPassword: 'Tmp2' });
      await reset;
    });

    it('registro de accesos: filtros de usuario, módulo, resultado y fechas', async () => {
      const users = TestBed.inject(UsersService);
      const res = firstValueFrom(
        users.accessLog({
          userId: 9,
          module: 'finance',
          allowed: false,
          from: '2026-10-01',
          to: '2026-10-21',
        }),
      );
      const req = http.expectOne((r) => r.url === `${TEST_API}/audit/access-log`);
      expect(req.request.params.get('userId')).toBe('9');
      expect(req.request.params.get('module')).toBe('finance');
      expect(req.request.params.get('allowed')).toBe('false');
      expect(req.request.params.get('from')).toBe('2026-10-01');
      expect(req.request.params.get('to')).toBe('2026-10-21');
      req.flush({ items: [], total: 0, page: 1, limit: 20 });
      await res;
    });
  });

  describe('InstitutionService', () => {
    it('catálogo: excluye las secciones que no gestiona esta pantalla (DIAN)', async () => {
      const svc = TestBed.inject(InstitutionService);
      const res = firstValueFrom(svc.catalog());
      http.expectOne(`${TEST_API}/institution/settings`).flush([
        { key: 'academic', label: 'Académico', fields: [] },
        { key: 'dian', label: 'DIAN', fields: [] },
      ]);
      expect((await res).map((s) => s.key)).toEqual(['academic']);
    });

    it('guarda una sección como { values } y sube el logo como multipart', async () => {
      const svc = TestBed.inject(InstitutionService);
      const saved = firstValueFrom(svc.updateSection('payments', { nequi_number: '3001112233' }));
      const put = http.expectOne(`${TEST_API}/institution/settings/payments`);
      expect(put.request.method).toBe('PUT');
      expect(put.request.body).toEqual({ values: { nequi_number: '3001112233' } });
      put.flush({ section: 'payments', label: 'Pagos', values: {} });
      await saved;

      const logo = firstValueFrom(
        svc.uploadLogo(new File(['x'], 'logo.png', { type: 'image/png' })),
      );
      const post = http.expectOne(`${TEST_API}/institution/logo`);
      expect((post.request.body as FormData).get('file')).toBeInstanceOf(File);
      post.flush({ id: 1 });
      await logo;
    });
  });

  describe('utilidades', () => {
    it('dígito de verificación DIAN', () => {
      expect(nitCheckDigit('800197268')).toBe(4);
      expect(nitCheckDigit('900.123.456')).toBe(8);
      expect(nitCheckDigit('')).toBeNull();
    });

    it('cambios de configuración: solo lo modificado; la máscara del secreto no se reenvía', () => {
      const fields = [
        field({ key: 'token', secret: true }),
        field({ key: 'phone_id' }),
        field({ key: 'port', type: 'integer' }),
        field({ key: 'year', type: 'integer', readOnly: true }),
        field({ key: 'methods', type: 'enum-set', options: ['nequi', 'efectivo'] }),
      ];
      const initial = {
        token: SECRET_MASK,
        phone_id: '111',
        port: 587,
        year: 2026,
        methods: ['nequi', 'efectivo'],
      };
      expect(
        changedSettingValues(
          fields,
          {
            token: SECRET_MASK,
            phone_id: ' 222 ',
            port: 587,
            year: 2027,
            methods: ['efectivo', 'nequi'],
          },
          initial,
        ),
      ).toEqual({ phone_id: '222' });
      expect(
        changedSettingValues(fields, { token: '', phone_id: '', port: 587, methods: [] }, initial),
      ).toEqual({
        token: null,
        phone_id: null,
        methods: [],
      });
    });

    it('control de configuración: valida enteros y no valida la máscara', () => {
      const port = buildSettingControl(field({ type: 'integer', min: 1, max: 65535 }), 587);
      port.setValue(70000);
      expect(port.hasError('max')).toBe(true);
      const url = buildSettingControl(field({ type: 'url', secret: true }), SECRET_MASK);
      expect(url.valid).toBe(true);
      url.setValue('no-es-url');
      expect(url.hasError('pattern')).toBe(true);
      expect(buildSettingControl(field({ readOnly: true }), 'x').disabled).toBe(true);
    });
  });
});
