import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { makeUser, provideTestHttp, TEST_API } from '../../../../../testing/test-providers';
import { SessionStore, ToastService } from '../../../../core';
import { strongPasswordValidator } from '../../data-access/password-policy';
import { FormControl } from '@angular/forms';
import { ChangePasswordPage } from './change-password-page';

describe('ChangePasswordPage', () => {
  let http: HttpTestingController;

  function setup() {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestHttp() });
    TestBed.inject(SessionStore).set({
      token: 't',
      expiresAt: Date.now() + 60_000,
      tenant: null,
      user: makeUser(),
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ChangePasswordPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const inputs = () => Array.from(el.querySelectorAll('input')) as HTMLInputElement[];
    const fill = (values: string[]) =>
      inputs().forEach((input, i) => {
        input.value = values[i];
        input.dispatchEvent(new Event('input'));
      });
    const submit = () => {
      el.querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    };
    return { fixture, el, fill, submit };
  }

  afterEach(() => {
    http.verify();
    TestBed.inject(ToastService).clear();
  });

  it('valida fortaleza y coincidencia', () => {
    const { el, fill, submit } = setup();
    fill(['actual', 'corta', 'otra']);
    submit();
    const errors = Array.from(el.querySelectorAll('.error')).map((e) => e.textContent);
    expect(errors.some((e) => e?.includes('letras y números'))).toBe(true);
    expect(errors.some((e) => e?.includes('no coinciden'))).toBe(true);
    http.expectNone(`${TEST_API}/auth/password`);
  });

  it('envía el cambio y notifica', () => {
    const { fill, submit } = setup();
    fill(['Actual123', 'NuevaClave9', 'NuevaClave9']);
    submit();
    const req = http.expectOne(`${TEST_API}/auth/password`);
    expect(req.request.body).toEqual({ currentPassword: 'Actual123', newPassword: 'NuevaClave9' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(TestBed.inject(ToastService).toasts()[0].type).toBe('success');
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/admin');
  });

  it('muestra el error si la contraseña actual es incorrecta (sin cerrar sesión)', () => {
    const { fixture, el, fill, submit } = setup();
    fill(['Mala1234', 'NuevaClave9', 'NuevaClave9']);
    submit();
    http
      .expectOne(`${TEST_API}/auth/password`)
      .flush({ message: 'x' }, { status: 401, statusText: 'U' });
    fixture.detectChanges();
    expect(el.querySelector('ui-alert')?.textContent).toContain(
      'La contraseña actual no es correcta.',
    );
    expect(TestBed.inject(SessionStore).session()).not.toBeNull();
  });

  it('strongPasswordValidator', () => {
    expect(strongPasswordValidator(new FormControl('abcdefgh'))).toEqual({ weakPassword: true });
    expect(strongPasswordValidator(new FormControl('abcdefg1'))).toBeNull();
    expect(strongPasswordValidator(new FormControl(''))).toBeNull();
  });
});
