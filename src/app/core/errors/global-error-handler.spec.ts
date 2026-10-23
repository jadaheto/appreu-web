import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ApiError } from '../http/api-error';
import { ToastService } from '../notifications/toast.service';
import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GlobalErrorHandler] });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.inject(ToastService).clear();
  });

  it('notifica errores inesperados', () => {
    TestBed.inject(GlobalErrorHandler).handleError(new Error('boom'));
    expect(TestBed.inject(ToastService).toasts()[0].message).toContain('error inesperado');
  });

  it('no duplica la notificación de ApiError (también en promesas rechazadas)', () => {
    TestBed.inject(GlobalErrorHandler).handleError({ rejection: new ApiError(500, 'X', 'fallo') });
    expect(TestBed.inject(ToastService).toasts()).toEqual([]);
  });
});
