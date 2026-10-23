import { ToastService, toApiError } from '../../../core';

/**
 * Muestra el error de una acción como toast si el interceptor no lo hizo ya
 * (red, 403, 429 y 5xx se notifican automáticamente) y devuelve el mensaje.
 */
export function reportError(toast: ToastService, error: unknown): string {
  const e = toApiError(error);
  const alreadyShown = e.status === 0 || e.status === 403 || e.status === 429 || e.status >= 500;
  if (!alreadyShown && e.status !== 401) toast.error(e.message);
  return e.message;
}
