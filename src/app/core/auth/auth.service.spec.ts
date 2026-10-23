import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { makeUser, provideTestHttp, TEST_API } from '../../../testing/test-providers';
import { TenantService } from '../tenant/tenant.service';
import { AuthService } from './auth.service';
import { SessionStore } from './session.store';

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestHttp() });
    TestBed.inject(TenantService).set('colegio-a');
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  function doLogin(user = makeUser(), expiresIn = 3600) {
    let result: unknown;
    auth.login({ email: 'ana@apreu.co', password: 'secreto1' }).subscribe((u) => (result = u));
    const req = http.expectOne(`${TEST_API}/auth/login`);
    expect(req.request.headers.get('X-Tenant')).toBe('colegio-a');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ accessToken: 'jwt', expiresIn, user });
    return result;
  }

  it('inicia sesión y expone usuario, rol, portal y home', () => {
    const user = doLogin(makeUser({ role: 'teacher', portal: 'employee' }));
    http.expectOne(`${TEST_API}/auth/permissions`).flush({ modules: ['payslips'] });
    expect(user).toMatchObject({ role: 'teacher' });
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.role()).toBe('teacher');
    expect(auth.portal()).toBe('employee');
    expect(auth.homeUrl()).toBe('/portal-empleado');
    expect(auth.token()).toBe('jwt');
    expect(auth.expiresAt()).toBeGreaterThan(Date.now());
    expect(auth.permissions()?.has('payslips')).toBe(true);
    expect(TestBed.inject(SessionStore).session()?.tenant).toBe('colegio-a');
  });

  it('usa la matriz local si /auth/permissions falla', () => {
    doLogin();
    http
      .expectOne(`${TEST_API}/auth/permissions`)
      .flush({}, { status: 404, statusText: 'Not Found' });
    expect(auth.permissions()).toBeNull();
  });

  it('propaga el error de credenciales sin cerrar sesión ni toast', () => {
    let status = 0;
    auth
      .login({ email: 'x@y.co', password: 'bad' })
      .subscribe({ error: (e) => (status = e.status) });
    http
      .expectOne(`${TEST_API}/auth/login`)
      .flush({ message: 'Credenciales inválidas' }, { status: 401, statusText: 'U' });
    expect(status).toBe(401);
    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('logout limpia la sesión y navega al login', () => {
    doLogin();
    http.expectOne(`${TEST_API}/auth/permissions`).flush([]);
    auth.logout();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.permissions()).toBeNull();
    expect(auth.lastLogoutReason()).toBe('manual');
    expect(navigate).toHaveBeenCalledWith(['/', 'login'], { queryParams: {} });
  });

  it('cierra la sesión al expirar el token', () => {
    vi.useFakeTimers();
    doLogin(makeUser(), 10);
    http.expectOne(`${TEST_API}/auth/permissions`).flush([]);
    vi.advanceTimersByTime(10_001);
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.lastLogoutReason()).toBe('expired');
    expect(navigate).toHaveBeenCalledWith(['/', 'login'], { queryParams: { reason: 'expired' } });
  });

  it('init restaura la sesión y refresca usuario y permisos', () => {
    TestBed.inject(SessionStore).set({
      token: 't',
      expiresAt: Date.now() + 60_000,
      tenant: 'colegio-a',
      user: makeUser(),
    });
    auth.init();
    http.expectOne(`${TEST_API}/auth/me`).flush(makeUser({ name: 'Ana Actualizada' }));
    http.expectOne(`${TEST_API}/auth/permissions`).flush(['users']);
    expect(auth.user()?.name).toBe('Ana Actualizada');
    expect(auth.permissions()?.has('users')).toBe(true);
  });

  it('init sin sesión no hace peticiones', () => {
    auth.init();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('changePassword hace PATCH /auth/password', () => {
    let done = false;
    auth.changePassword({ currentPassword: 'a', newPassword: 'b' }).subscribe(() => (done = true));
    const req = http.expectOne(`${TEST_API}/auth/password`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ currentPassword: 'a', newPassword: 'b' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(done).toBe(true);
  });

  it('hasRole: superadmin siempre pasa', () => {
    doLogin(makeUser({ role: 'superadmin' }));
    http.expectOne(`${TEST_API}/auth/permissions`).flush([]);
    expect(auth.hasRole('finance')).toBe(true);
    expect(auth.isSuperadmin()).toBe(true);
  });
});
