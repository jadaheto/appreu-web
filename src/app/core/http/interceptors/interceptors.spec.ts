import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { makeUser, provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import { AuthService } from '../../auth/auth.service';
import { SessionStore } from '../../auth/session.store';
import { ToastService } from '../../notifications/toast.service';
import { TenantService } from '../../tenant/tenant.service';
import { ApiClient } from '../api-client';
import { ApiError } from '../api-error';
import { withContext } from '../http-context';

describe('interceptores HTTP', () => {
  let http: HttpTestingController;
  let api: ApiClient;
  let toast: ToastService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestHttp() });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(ApiClient);
    toast = TestBed.inject(ToastService);
    TestBed.inject(TenantService).set('colegio-a');
  });

  afterEach(() => {
    http.verify();
    toast.clear();
  });

  function loginSession() {
    TestBed.inject(SessionStore).set({
      token: 'jwt-123',
      expiresAt: Date.now() + 60_000,
      tenant: 'colegio-a',
      user: makeUser(),
    });
  }

  it('agrega X-Tenant a las peticiones de la API', () => {
    api.get('auth/me').subscribe();
    const req = http.expectOne(`${TEST_API}/auth/me`);
    expect(req.request.headers.get('X-Tenant')).toBe('colegio-a');
    req.flush({});
  });

  it('no toca peticiones fuera de la API', () => {
    loginSession();
    TestBed.inject(HttpClient).get('/assets/data.json').subscribe();
    const req = http.expectOne('/assets/data.json');
    expect(req.request.headers.has('X-Tenant')).toBe(false);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('agrega Authorization cuando hay sesión, salvo SKIP_AUTH', () => {
    loginSession();
    api.get('a').subscribe();
    api.get('b', { context: withContext({ skipAuth: true }) }).subscribe();
    const a = http.expectOne(`${TEST_API}/a`);
    const b = http.expectOne(`${TEST_API}/b`);
    expect(a.request.headers.get('Authorization')).toBe('Bearer jwt-123');
    expect(b.request.headers.has('Authorization')).toBe(false);
    a.flush({});
    b.flush({});
  });

  it('ante un 401 con sesión cierra la sesión y redirige al login', () => {
    loginSession();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    let error: ApiError | undefined;
    api.get('x').subscribe({ error: (e: ApiError) => (error = e) });
    http
      .expectOne(`${TEST_API}/x`)
      .flush(
        { statusCode: 401, code: 'UNAUTHORIZED', message: 'Token inválido' },
        { status: 401, statusText: 'Unauthorized' },
      );
    expect(error).toBeInstanceOf(ApiError);
    expect(error?.status).toBe(401);
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/', 'login'], { queryParams: { reason: 'expired' } });
  });

  it('respeta SKIP_LOGOUT_ON_401', () => {
    loginSession();
    api
      .get('x', { context: withContext({ skipLogoutOn401: true }) })
      .subscribe({ error: () => {} });
    http.expectOne(`${TEST_API}/x`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(true);
  });

  it('muestra toast en errores de servidor y no en validaciones', () => {
    api.get('s').subscribe({ error: () => {} });
    http.expectOne(`${TEST_API}/s`).flush({}, { status: 500, statusText: 'Error' });
    expect(toast.toasts().length).toBe(1);
    expect(toast.toasts()[0].type).toBe('error');

    api.post('v', {}).subscribe({ error: () => {} });
    http
      .expectOne(`${TEST_API}/v`)
      .flush(
        { statusCode: 400, code: 'VALIDATION', message: 'Dato inválido' },
        { status: 400, statusText: 'Bad' },
      );
    expect(toast.toasts().length).toBe(1);
  });

  it('respeta SKIP_ERROR_TOAST', () => {
    api.get('s', { context: withContext({ skipErrorToast: true }) }).subscribe({ error: () => {} });
    http.expectOne(`${TEST_API}/s`).flush({}, { status: 503, statusText: 'Down' });
    expect(toast.toasts().length).toBe(0);
  });

  it('en descargas lee el mensaje JSON que llega dentro de un Blob', async () => {
    let message = '';
    let code = '';
    api.download('docs/1/pdf').subscribe({
      error: (e: { message: string; code: string }) => {
        message = e.message;
        code = e.code;
      },
    });
    const body = {
      statusCode: 422,
      code: 'ARTIFACT_UNAVAILABLE',
      message: 'El PDF aún no está disponible',
    };
    http
      .expectOne(`${TEST_API}/docs/1/pdf`)
      .flush(new Blob([JSON.stringify(body)], { type: 'application/json' }), {
        status: 422,
        statusText: 'Unprocessable',
      });
    await new Promise((r) => setTimeout(r, 10));
    expect(message).toBe('El PDF aún no está disponible');
    expect(code).toBe('ARTIFACT_UNAVAILABLE');
  });
});
