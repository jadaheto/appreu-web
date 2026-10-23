import { ErrorHandler, inject, Injectable } from '@angular/core';
import { ApiError } from '../http/api-error';
import { ToastService } from '../notifications/toast.service';

/**
 * Captura errores no manejados. Los `ApiError` ya fueron notificados por el
 * interceptor (o por la página), así que solo se registran.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly toast = inject(ToastService);

  handleError(error: unknown): void {
    const unwrapped = (error as { rejection?: unknown })?.rejection ?? error;
    console.error(unwrapped);
    if (unwrapped instanceof ApiError) return;
    this.toast.error('Ocurrió un error inesperado. Si persiste, recarga la página.', {
      title: 'Error',
    });
  }
}
