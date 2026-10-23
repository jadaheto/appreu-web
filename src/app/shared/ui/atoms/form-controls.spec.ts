import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UiCheckbox } from './checkbox/checkbox';
import { UiInput } from './input/input';
import { SelectOption, UiSelect } from './select/select';
import { UiTextarea } from './textarea/textarea';

@Component({
  imports: [ReactiveFormsModule, UiInput, UiSelect, UiTextarea, UiCheckbox],
  template: `
    <ui-input [formControl]="name" placeholder="Nombre" inputId="nombre" />
    <ui-input [formControl]="age" type="number" />
    <ui-input [formControl]="secret" type="password" />
    <ui-select [formControl]="role" [options]="options" placeholder="Todos" />
    <ui-textarea [formControl]="notes" [maxlength]="10" />
    <ui-checkbox [formControl]="active">Activo</ui-checkbox>
  `,
})
class Host {
  name = new FormControl('Ana');
  age = new FormControl<number | null>(null);
  secret = new FormControl('x');
  role = new FormControl<{ id: number } | null>(null);
  notes = new FormControl('');
  active = new FormControl(false);
  objA = { id: 1 };
  objB = { id: 2 };
  options: SelectOption<{ id: number }>[] = [
    { value: this.objA, label: 'A' },
    { value: this.objB, label: 'B' },
  ];
}

describe('controles de formulario (ControlValueAccessor)', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, host: fixture.componentInstance, el };
  }

  function type(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('ui-input escribe y lee el valor del control', () => {
    const { fixture, host, el } = setup();
    const input = el.querySelector('#nombre') as HTMLInputElement;
    expect(input.value).toBe('Ana');
    expect(input.placeholder).toBe('Nombre');
    type(input, 'Bruno');
    expect(host.name.value).toBe('Bruno');
    host.name.setValue('Carla');
    fixture.detectChanges();
    expect(input.value).toBe('Carla');
    input.dispatchEvent(new Event('blur'));
    expect(host.name.touched).toBe(true);
  });

  it('ui-input number convierte a número y vacío a null', () => {
    const { host, el } = setup();
    const input = el.querySelectorAll('ui-input')[1].querySelector('input')!;
    type(input, '42');
    expect(host.age.value).toBe(42);
    type(input, '');
    expect(host.age.value).toBeNull();
  });

  it('ui-input password permite mostrar/ocultar', () => {
    const { fixture, el } = setup();
    const wrapper = el.querySelectorAll('ui-input')[2];
    const input = wrapper.querySelector('input')!;
    const toggle = wrapper.querySelector('button.reveal') as HTMLButtonElement;
    expect(input.type).toBe('password');
    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Ocultar contraseña');
  });

  it('respeta disabled del control', () => {
    const { fixture, host, el } = setup();
    host.name.disable();
    fixture.detectChanges();
    expect((el.querySelector('#nombre') as HTMLInputElement).disabled).toBe(true);
  });

  it('ui-select mapea valores de cualquier tipo', () => {
    const { fixture, host, el } = setup();
    const select = el.querySelector('select')!;
    expect(select.options.length).toBe(3);
    select.value = '1';
    select.dispatchEvent(new Event('change'));
    expect(host.role.value).toBe(host.objB);
    select.value = '';
    select.dispatchEvent(new Event('change'));
    expect(host.role.value).toBeNull();
    host.role.setValue(host.objA);
    fixture.detectChanges();
    expect(select.options[1].selected).toBe(true);
  });

  it('ui-textarea muestra el contador', () => {
    const { fixture, host, el } = setup();
    const area = el.querySelector('textarea')!;
    type(area, 'hola');
    fixture.detectChanges();
    expect(host.notes.value).toBe('hola');
    expect(el.querySelector('ui-textarea .count')?.textContent).toContain('4/10');
  });

  it('ui-checkbox enlaza booleanos', () => {
    const { fixture, host, el } = setup();
    const box = el.querySelector('ui-checkbox input') as HTMLInputElement;
    box.click();
    fixture.detectChanges();
    expect(host.active.value).toBe(true);
    host.active.setValue(false);
    fixture.detectChanges();
    expect(box.checked).toBe(false);
    expect(el.querySelector('ui-checkbox')?.textContent).toContain('Activo');
  });
});

describe('UiCheckbox controlado', () => {
  @Component({
    imports: [FormsModule, UiCheckbox],
    template: `<ui-checkbox
      [checked]="checked"
      ariaLabel="Seleccionar"
      (checkedChange)="last = $event"
    />`,
  })
  class Controlled {
    checked = true;
    last: boolean | null = null;
  }

  it('emite checkedChange', () => {
    const fixture = TestBed.createComponent(Controlled);
    fixture.detectChanges();
    const box = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(box.checked).toBe(true);
    expect(box.getAttribute('aria-label')).toBe('Seleccionar');
    box.click();
    expect(fixture.componentInstance.last).toBe(false);
  });
});
