import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiModal } from './modal';

@Component({
  imports: [UiModal],
  template: `
    <button id="opener" (click)="open.set(true)">Abrir</button>
    <ui-modal
      [(open)]="open"
      title="Nuevo usuario"
      description="Datos básicos"
      (closed)="closed = closed + 1"
    >
      <input id="first" />
      <button id="last" uiModalFooter>Guardar</button>
    </ui-modal>
  `,
})
class Host {
  open = signal(false);
  closed = 0;
}

describe('UiModal', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, host: fixture.componentInstance };
  }

  async function openModal(fixture: ReturnType<typeof setup>['fixture']) {
    (fixture.nativeElement.querySelector('#opener') as HTMLButtonElement).focus();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('no renderiza nada cerrado', () => {
    const { el } = setup();
    expect(el.querySelector('[role=dialog]')).toBeNull();
  });

  it('abre con semántica de diálogo, bloquea el scroll y enfoca el primer control', async () => {
    const { fixture, el } = setup();
    await openModal(fixture);
    const dialog = el.querySelector('[role=dialog]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(el.querySelector('#' + dialog.getAttribute('aria-labelledby'))?.textContent).toBe(
      'Nuevo usuario',
    );
    expect(document.body.classList).toContain('ui-scroll-locked');
    expect(document.activeElement?.id).toBe('first');
  });

  it('cierra con Escape, devuelve el foco y emite closed', async () => {
    const { fixture, el, host } = setup();
    await openModal(fixture);
    el.querySelector('[role=dialog]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.open()).toBe(false);
    expect(host.closed).toBe(1);
    expect(el.querySelector('[role=dialog]')).toBeNull();
    expect(document.body.classList).not.toContain('ui-scroll-locked');
    expect(document.activeElement?.id).toBe('opener');
  });

  it('cierra al hacer clic en el fondo y con el botón X', async () => {
    const { fixture, el, host } = setup();
    await openModal(fixture);
    (el.querySelector('.backdrop') as HTMLElement).click();
    fixture.detectChanges();
    expect(host.open()).toBe(false);
    await openModal(fixture);
    (el.querySelector('[aria-label="Cerrar"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(host.closed).toBe(2);
  });

  it('atrapa el foco con Tab', async () => {
    const { fixture, el } = setup();
    await openModal(fixture);
    const last = el.querySelector('#last') as HTMLButtonElement;
    last.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    last.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Cerrar');
  });
});
