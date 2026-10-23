import { TestBed } from '@angular/core/testing';
import { UiNotificationItem, UiNotificationsPanel } from './notifications-panel';

const items: UiNotificationItem[] = [
  {
    id: 1,
    title: 'Boletines',
    message: 'Ya están',
    type: 'success',
    isRead: false,
    createdAt: '2026-10-21T10:00:00Z',
  },
  { id: 2, title: 'Pago', message: 'Recibido', type: 'info', isRead: true, createdAt: null },
];

describe('UiNotificationsPanel', () => {
  function render(list: UiNotificationItem[], unread: number) {
    const fixture = TestBed.createComponent(UiNotificationsPanel);
    fixture.componentRef.setInput('items', list);
    fixture.componentRef.setInput('unread', unread);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('lista las notificaciones, resalta las no leídas y emite acciones', () => {
    const { fixture, el } = render(items, 1);
    const clicked: number[] = [];
    let all = 0;
    let closed = 0;
    fixture.componentInstance.itemClick.subscribe((id) => clicked.push(id));
    fixture.componentInstance.markAll.subscribe(() => all++);
    fixture.componentInstance.closeRequest.subscribe(() => closed++);

    expect(el.textContent).toContain('1 sin leer');
    const buttons = el.querySelectorAll<HTMLButtonElement>('button.item');
    expect(buttons.length).toBe(2);
    expect(buttons[0].classList).toContain('unread');
    expect(buttons[0].getAttribute('aria-label')).toBe('Sin leer: Boletines');
    buttons[0].click();
    expect(clicked).toEqual([1]);

    el.querySelector<HTMLButtonElement>('footer .link')!.click();
    expect(all).toBe(1);
    el.querySelector<HTMLElement>('.backdrop')!.click();
    expect(closed).toBe(1);
  });

  it('estado vacío sin acción de marcar todas', () => {
    const { el } = render([], 0);
    expect(el.textContent).toContain('No tiene notificaciones.');
    expect(el.querySelector('footer')).toBeNull();
  });
});
