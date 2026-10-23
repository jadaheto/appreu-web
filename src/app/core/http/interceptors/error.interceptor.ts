import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, Observable, of, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { APP_CONFIG } from '../../config/app-config';
import { ToastService } from '../../notifications/toast.service';
import { isApiUrl } from '../api-client';
import { toApiError } from '../api-error';
import { SKIP_ERROR_TOAST, SKIP_LOGOUT_ON_401 } from '../http-context';

/**
 * Traduce los errores HTTP a `ApiError` (mensajes en español) y:
 * - 401 con sesión activa → cierra la sesión y vuelve al login (`reason=expired`).
 * - sin conexión, 403, 429 y 5xx → toast automático (salvo `SKIP_ERROR_TOAST`).
 * Los 400/404/409/422 se dejan a la página (errores de formulario).
 * En descargas (`responseType: 'blob'`) el cuerpo JSON del error llega como
 * `Blob`: se lee antes de traducirlo para conservar el mensaje de la API.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const { apiUrl } = inject(APP_CONFIG);
  const auth = inject(AuthService);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((raw: unknown) => readBlobError(raw)),
    catchError((err: unknown) => {
      const error = toApiError(err);
      if (!isApiUrl(req.url, apiUrl)) return throwError(() => error);

      if (error.status === 401 && !req.context.get(SKIP_LOGOUT_ON_401)) {
        if (auth.isAuthenticated()) auth.logout('expired');
        return throwError(() => error);
      }

      const toastable =
        error.status === 0 || error.status === 403 || error.status === 429 || error.status >= 500;
      if (toastable && !req.context.get(SKIP_ERROR_TOAST)) {
        toast.error(error.message);
      }
      return throwError(() => error);
    }),
  );
};

/** Si el error trae un `Blob` JSON (descargas), lo reemplaza por el objeto parseado. */
export function readBlobError(err: unknown): Observable<never> {
  if (!(err instanceof HttpErrorResponse) || !(err.error instanceof Blob)) {
    return throwError(() => err);
  }
  const blob = err.error;
  if (blob.type && !blob.type.includes('json')) return throwError(() => err);
  return from(blob.text().catch(() => '')).pipe(
    switchMap((text) => {
      let body: unknown = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        return throwError(() => err);
      }
      return of(body);
    }),
    switchMap((body) =>
      throwError(
        () =>
          new HttpErrorResponse({
            error: body,
            headers: err.headers,
            status: err.status,
            statusText: err.statusText,
            url: err.url ?? undefined,
          }),
      ),
    ),
  );
}
