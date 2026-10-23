import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { makeUser, provideTestHttp, TEST_API } from '../../../../../testing/test-providers';
import { AuthService, TenantService } from '../../../../core';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  let http: HttpTestingController;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  function setup(query: Record<string, string> = {}, tenant: string | null = 'colegio-a') {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ...provideTestHttp(),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap(query)),
            snapshot: { queryParamMap: convertToParamMap(query) },
          },
        },
      ],
    });
    if (tenant) TestBed.inject(TenantService).set(tenant);
    http = TestBed.inject(HttpTestingController);
    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  function fill(el: HTMLElement, selector: string, value: string) {
    const input = el.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function submit(fixture: ReturnType<typeof setup>['fixture']) {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  it('valida los campos antes de enviar', () => {
    const { fixture, el } = setup();
    submit(fixture);
    expect(el.querySelectorAll('.error').length).toBe(2);
    http.expectNone(`${TEST_API}/auth/login`);
  });

  it('muestra el colegio activo y permite cambiarlo', () => {
    const { fixture, el } = setup();
    expect(el.querySelector('.tenant strong')?.textContent).toBe('colegio-a');
    (el.querySelector('.change') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('input[autocomplete=organization]')).not.toBeNull();
  });

  it('pide el código del colegio si no hay tenant', () => {
    const { fixture, el } = setup({}, null);
    fill(el, 'input[type=email]', 'ana@apreu.co');
    fill(el, 'input[autocomplete=current-password]', 'secreto1');
    submit(fixture);
    expect(el.querySelector('.error')?.textContent).toContain('Indica el código de tu colegio');
    fill(el, 'input[autocomplete=organization]', 'San-Jose');
    submit(fixture);
    expect(TestBed.inject(TenantService).slug()).toBe('san-jose');
    const req = http.expectOne(`${TEST_API}/auth/login`);
    expect(req.request.headers.get('X-Tenant')).toBe('san-jose');
    req.flush({ accessToken: 't', expiresIn: 60, user: makeUser() });
    http.expectOne(`${TEST_API}/auth/permissions`).flush([]);
  });

  it('inicia sesión y redirige al portal del usuario', () => {
    const { fixture, el } = setup();
    fill(el, 'input[type=email]', 'profe@apreu.co');
    fill(el, 'input[autocomplete=current-password]', 'secreto1');
    submit(fixture);
    const req = http.expectOne(`${TEST_API}/auth/login`);
    expect(req.request.body).toEqual({ email: 'profe@apreu.co', password: 'secreto1' });
    req.flush({
      accessToken: 't',
      expiresIn: 60,
      user: makeUser({ role: 'teacher', portal: 'employee' }),
    });
    http.expectOne(`${TEST_API}/auth/permissions`).flush([]);
    expect(navigateByUrl).toHaveBeenCalledWith('/portal-empleado');
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(true);
  });

  it('respeta returnUrl solo dentro del portal del usuario', () => {
    const { fixture, el } = setup({ returnUrl: '/admin/usuarios' });
    fill(el, 'input[type=email]', 'ana@apreu.co');
    fill(el, 'input[autocomplete=current-password]', 'secreto1');
    submit(fixture);
    http
      .expectOne(`${TEST_API}/auth/login`)
      .flush({ accessToken: 't', expiresIn: 60, user: makeUser() });
    http.expectOne(`${TEST_API}/auth/permissions`).flush([]);
    expect(navigateByUrl).toHaveBeenCalledWith('/admin/usuarios');
  });

  it('muestra el error de credenciales', () => {
    const { fixture, el } = setup();
    fill(el, 'input[type=email]', 'ana@apreu.co');
    fill(el, 'input[autocomplete=current-password]', 'mala');
    submit(fixture);
    http
      .expectOne(`${TEST_API}/auth/login`)
      .flush(
        { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'x' },
        { status: 401, statusText: 'U' },
      );
    fixture.detectChanges();
    expect(el.querySelector('ui-alert[role=alert]')?.textContent).toContain(
      'Correo o contraseña incorrectos.',
    );
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('avisa cuando la sesión expiró', () => {
    const { el } = setup({ reason: 'expired' });
    expect(el.querySelector('ui-alert')?.textContent).toContain('Tu sesión expiró');
  });
});
