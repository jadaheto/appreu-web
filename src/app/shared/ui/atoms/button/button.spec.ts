import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiButton } from './button';

@Component({
  imports: [UiButton],
  template: `<button
    ui-button
    [variant]="variant()"
    [loading]="loading()"
    icon="plus"
    (click)="clicks = clicks + 1"
  >
    Crear
  </button>`,
})
class Host {
  variant = signal<'primary' | 'danger'>('primary');
  loading = signal(false);
  clicks = 0;
}

describe('UiButton', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    return { fixture, button };
  }

  it('aplica la variante y muestra el ícono', () => {
    const { button } = setup();
    expect(button.classList).toContain('ui-button--primary');
    expect(button.querySelector('ui-icon')).not.toBeNull();
    expect(button.textContent).toContain('Crear');
  });

  it('cambia de variante', () => {
    const { fixture, button } = setup();
    fixture.componentInstance.variant.set('danger');
    fixture.detectChanges();
    expect(button.classList).toContain('ui-button--danger');
  });

  it('en loading se deshabilita, marca aria-busy y muestra spinner', () => {
    const { fixture, button } = setup();
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('ui-spinner')).not.toBeNull();
    button.click();
    expect(fixture.componentInstance.clicks).toBe(0);
  });

  it('emite click cuando está habilitado', () => {
    const { fixture, button } = setup();
    button.click();
    expect(fixture.componentInstance.clicks).toBe(1);
  });
});
