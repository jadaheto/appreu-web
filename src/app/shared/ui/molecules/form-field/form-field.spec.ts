import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiInput } from '../../atoms/input/input';
import { UiFormField } from './form-field';

@Component({
  imports: [ReactiveFormsModule, UiFormField, UiInput],
  template: `
    <ui-form-field
      label="Correo"
      hint="Correo institucional"
      required
      [error]="serverError()"
      [errorMessages]="{ email: 'Correo raro' }"
    >
      <ui-input [formControl]="email" />
    </ui-form-field>
  `,
})
class Host {
  email = new FormControl('', [Validators.required, Validators.email]);
  serverError = signal<string | null>(null);
}

describe('UiFormField', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, host: fixture.componentInstance, input: el.querySelector('input')! };
  }

  it('asocia etiqueta, control y ayuda', () => {
    const { el, input } = setup();
    const label = el.querySelector('label')!;
    expect(label.textContent).toContain('Correo');
    expect(label.getAttribute('for')).toBe(input.id);
    const hint = el.querySelector('.hint')!;
    expect(hint.textContent).toContain('Correo institucional');
    expect(input.getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('muestra el error solo cuando el control fue tocado', () => {
    const { fixture, el, host, input } = setup();
    expect(el.querySelector('.error')).toBeNull();
    host.email.markAsTouched();
    fixture.detectChanges();
    const error = el.querySelector('.error')!;
    expect(error.textContent).toContain('Este campo es obligatorio.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(error.id);
  });

  it('usa mensajes personalizados y se limpia al corregir', () => {
    const { fixture, el, input } = setup();
    input.value = 'no-es-correo';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(el.querySelector('.error')?.textContent).toContain('Correo raro');
    input.value = 'ana@apreu.co';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(el.querySelector('.error')).toBeNull();
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('prioriza el error explícito (servidor)', () => {
    const { fixture, el, host } = setup();
    host.serverError.set('El correo ya existe.');
    fixture.detectChanges();
    expect(el.querySelector('.error')?.textContent).toContain('El correo ya existe.');
  });
});
