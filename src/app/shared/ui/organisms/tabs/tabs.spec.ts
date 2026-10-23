import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TabItem, UiTabs } from './tabs';

@Component({
  imports: [UiTabs],
  template: `<ui-tabs [tabs]="tabs" [(active)]="active" variant="vertical"
    ><p class="content">{{ active() }}</p></ui-tabs
  >`,
})
class Host {
  tabs: TabItem[] = [
    { id: 'a', label: 'Empresa', icon: 'building' },
    { id: 'b', label: 'DIAN', badge: 2 },
    { id: 'c', label: 'Oculta', disabled: true },
    { id: 'd', label: 'Nómina' },
  ];
  active = signal<string | null>(null);
}

describe('UiTabs', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const tabs = () => Array.from(el.querySelectorAll('[role=tab]')) as HTMLButtonElement[];
    return { fixture, el, host: fixture.componentInstance, tabs };
  }

  it('selecciona la primera habilitada por defecto y enlaza el panel', () => {
    const { el, tabs } = setup();
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs()[0].tabIndex).toBe(0);
    expect(tabs()[1].tabIndex).toBe(-1);
    const panel = el.querySelector('[role=tabpanel]')!;
    expect(panel.getAttribute('aria-labelledby')).toBe(tabs()[0].id);
    expect(el.querySelector('[role=tablist]')?.getAttribute('aria-orientation')).toBe('vertical');
    expect(tabs()[1].querySelector('.badge')?.textContent).toBe('2');
  });

  it('cambia con clic e ignora deshabilitadas', () => {
    const { fixture, host, tabs } = setup();
    tabs()[1].click();
    fixture.detectChanges();
    expect(host.active()).toBe('b');
    tabs()[2].click();
    expect(host.active()).toBe('b');
  });

  it('navega con el teclado saltando deshabilitadas', () => {
    const { fixture, el, host } = setup();
    const list = el.querySelector('[role=tablist]')!;
    const key = (k: string) => {
      list.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
      fixture.detectChanges();
    };
    key('ArrowDown');
    expect(host.active()).toBe('b');
    key('ArrowDown');
    expect(host.active()).toBe('d');
    key('ArrowDown');
    expect(host.active()).toBe('a');
    key('End');
    expect(host.active()).toBe('d');
    key('Home');
    expect(host.active()).toBe('a');
    key('ArrowUp');
    expect(host.active()).toBe('d');
  });
});
