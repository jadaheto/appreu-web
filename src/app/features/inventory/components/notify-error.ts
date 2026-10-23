import { toApiError, ToastService } from '../../../core';

/**
 * Muestra en un toast el error de una acción, salvo los que ya notifica el
 * `errorInterceptor` (red, 403, 429 y 5xx). Devuelve el mensaje en español.
 */
export function notifyError(toast: ToastService, error: unknown): string {
  const err = toApiError(error);
  const autoToasted =
    err.status === 0 || err.status === 403 || err.status === 429 || err.status >= 500;
  if (!autoToasted) toast.error(err.message);
  return err.message;
}
