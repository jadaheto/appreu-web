import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ConfirmService } from './confirm.service';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let toast: ToastService;
  beforeEach(() => {
    vi.useFakeTimers();
    toast = TestBed.inject(ToastService);
  });
  afterEach(() => {
    toast.clear();
    vi.useRealTimers();
  });

  it('agrega toasts y los cierra solos', () => {
    toast.success('Guardado');
    toast.error('Falló', { title: 'Error' });
    expect(toast.toasts().map((t) => t.type)).toEqual(['success', 'error']);
    vi.advanceTimersByTime(4001);
    expect(toast.toasts().map((t) => t.type)).toEqual(['error']);
    vi.advanceTimersByTime(2000);
    expect(toast.toasts()).toEqual([]);
  });

  it('duration 0 es permanente y dismiss lo cierra', () => {
    const id = toast.info('Fijo', { duration: 0 });
    vi.advanceTimersByTime(60_000);
    expect(toast.toasts().length).toBe(1);
    toast.dismiss(id);
    expect(toast.toasts().length).toBe(0);
  });

  it('conserva como máximo 5', () => {
    for (let i = 0; i < 7; i++) toast.warning(`m${i}`);
    expect(toast.toasts().length).toBe(5);
    expect(toast.toasts()[0].message).toBe('m2');
  });
});

describe('ConfirmService', () => {
  it('resuelve con la respuesta del usuario', async () => {
    const confirm = TestBed.inject(ConfirmService);
    const promise = confirm.ask({ title: '¿Seguro?' });
    expect(confirm.state()?.title).toBe('¿Seguro?');
    confirm.respond(true);
    await expect(promise).resolves.toBe(true);
    expect(confirm.state()).toBeNull();
  });

  it('una nueva pregunta cancela la anterior', async () => {
    const confirm = TestBed.inject(ConfirmService);
    const first = confirm.ask({ title: 'A' });
    const second = confirm.ask({ title: 'B' });
    await expect(first).resolves.toBe(false);
    confirm.respond(false);
    await expect(second).resolves.toBe(false);
  });
});
