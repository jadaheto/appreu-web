import { HttpTestingController } from '@angular/common/http/testing';
import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideTestHttp, TEST_API } from '../../../testing/test-providers';
import { InboxNotification, NotificationCenterService } from './notification-center.service';

const note = (id: number, isRead = false): InboxNotification => ({
  id,
  title: `Aviso ${id}`,
  message: 'Mensaje',
  type: 'info',
  isRead,
  createdAt: '2026-10-21T10:00:00Z',
});

describe('NotificationCenterService', () => {
  let http: HttpTestingController;
  let service: NotificationCenterService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestHttp()] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(NotificationCenterService);
  });
  afterEach(() => {
    service.clear();
    http.verify();
    vi.useRealTimers();
  });

  function flushList(items: InboxNotification[], unread: number) {
    const req = http.expectOne((r) => r.url === `${TEST_API}/notifications`);
    expect(req.request.params.get('limit')).toBe('10');
    req.flush({ items, total: items.length, page: 1, limit: 10, unread });
  }

  it('carga las últimas y el total sin leer', () => {
    service.refresh();
    flushList([note(1), note(2, true)], 1);
    expect(service.items().length).toBe(2);
    expect(service.unread()).toBe(1);
    expect(service.loading()).toBe(false);
  });

  it('marca una como leída y descuenta el contador', () => {
    service.refresh();
    flushList([note(1), note(2)], 2);
    service.markRead(1).subscribe();
    const req = http.expectOne(`${TEST_API}/notifications/1/read`);
    expect(req.request.method).toBe('PATCH');
    req.flush({});
    expect(service.unread()).toBe(1);
    expect(service.items()[0].isRead).toBe(true);
    // Ya leída: no vuelve a llamar a la API.
    service.markRead(1).subscribe();
    http.expectNone(`${TEST_API}/notifications/1/read`);
  });

  it('marca todas como leídas', () => {
    service.refresh();
    flushList([note(1), note(2)], 2);
    service.markAllRead().subscribe();
    http.expectOne(`${TEST_API}/notifications/read-all`).flush({});
    expect(service.unread()).toBe(0);
    expect(service.items().every((n) => n.isRead)).toBe(true);
  });

  it('consulta periódicamente y se detiene al destruirse quien la inició', () => {
    vi.useFakeTimers();
    const callbacks: (() => void)[] = [];
    const destroyRef = {
      onDestroy: (cb: () => void) => callbacks.push(cb),
    } as unknown as DestroyRef;
    service.start(destroyRef, 1000);
    flushList([note(1)], 1);
    vi.advanceTimersByTime(1000);
    flushList([note(1), note(2)], 2);
    expect(service.unread()).toBe(2);
    callbacks.forEach((cb) => cb());
    vi.advanceTimersByTime(5000);
    http.expectNone((r) => r.url === `${TEST_API}/notifications`);
    expect(service.items()).toEqual([]);
  });

  it('un error de la API no rompe la campana', () => {
    service.refresh();
    http
      .expectOne((r) => r.url === `${TEST_API}/notifications`)
      .flush({}, { status: 500, statusText: 'Error' });
    expect(service.unread()).toBe(0);
  });
});
