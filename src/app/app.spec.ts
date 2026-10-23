import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { makeUser, provideTestHttp, TEST_API } from '../testing/test-providers';
import { App } from './app';
import { routes } from './app.routes';
import { AuthUser, ConfirmService, SessionStore, TenantService, ToastService } from './core';

describe('App y rutas', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestHttp(routes) });
  });

  function login(user: Partial<AuthUser> = {}) {
    TestBed.inject(SessionStore).set({
      token: 't',
      expiresAt: Date.now() + 60_000,
      tenant: null,
      user: makeUser(user),
    });
  }

  const url = () => TestBed.inject(Router).url;

  it('renderiza toasts y el diálogo de confirmación globales', async () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(ToastService).success('Hola');
    const answer = TestBed.inject(ConfirmService).ask({ title: '¿Seguro?' });
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('ui-toast-stack')?.textContent).toContain('Hola');
    expect(el.querySelector('ui-confirm-dialog')?.textContent).toContain('¿Seguro?');
    (el.querySelectorAll('ui-confirm-dialog button')[1] as HTMLButtonElement).click();
    await expect(answer).resolves.toBe(true);
    TestBed.inject(ToastService).clear();
  });

  it('/ sin sesión lleva al login', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(url()).toBe('/login');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Iniciar Sesión',
    );
  });

  it('/ con sesión redirige según el portal', async () => {
    login({ role: 'student', portal: 'student' });
    const harness = await RouterTestingHarness.create('/');
    TestBed.inject(HttpTestingController)
      .match(() => true)
      .forEach((r) => r.flush({}));
    expect(url()).toBe('/portal-estudiante');
    expect(harness.routeNativeElement?.querySelector('ui-student-portal-layout')).not.toBeNull();
  });

  it('un rol de otro portal no entra a /admin', async () => {
    login({ role: 'teacher', portal: 'employee' });
    await RouterTestingHarness.create('/admin/usuarios');
    expect(url()).toBe('/portal-empleado');
  });

  it('rutas protegidas sin sesión conservan returnUrl', async () => {
    await RouterTestingHarness.create('/admin/finanzas');
    expect(url()).toBe('/login?returnUrl=%2Fadmin%2Ffinanzas');
  });

  it('/<slug>/login fija el tenant', async () => {
    await RouterTestingHarness.create('/colegio-x/login');
    expect(url()).toBe('/login');
    expect(TestBed.inject(TenantService).slug()).toBe('colegio-x');
  });

  it('módulos sin pantalla muestran "en construcción" dentro del layout', async () => {
    login();
    const harness = await RouterTestingHarness.create('/admin/modulo-sin-pantalla');
    TestBed.inject(HttpTestingController)
      .match(() => true)
      .forEach((r) => r.flush({}));
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Módulo en construcción');
    expect(harness.routeNativeElement?.querySelector('ui-topbar .title')?.textContent).toBe(
      'En construcción',
    );
  });

  it('verificación pública de certificados sin sesión', async () => {
    const harness = await RouterTestingHarness.create('/verificar/ABC-123');
    expect(url()).toBe('/verificar/ABC-123');
    expect(harness.routeNativeElement?.textContent).toContain('Verificar certificado');
    TestBed.inject(HttpTestingController)
      .match(() => true)
      .forEach((r) => r.flush(null));
    expect(TestBed.inject(TenantService).slug()).not.toBe('verificar');
  });

  it('ruta inexistente → 404', async () => {
    const harness = await RouterTestingHarness.create('/a/b/c');
    expect(harness.routeNativeElement?.textContent).toContain('Página no encontrada');
  });

  it('expone el catálogo /dev/ui en desarrollo', async () => {
    const harness = await RouterTestingHarness.create('/dev/ui');
    expect(harness.routeNativeElement?.textContent).toContain('Catálogo de componentes');
    void TEST_API;
  });
});
