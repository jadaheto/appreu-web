import { HttpContext, HttpContextToken } from '@angular/common/http';

/** No mostrar el toast automático de error (la página lo maneja). */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);
/** No adjuntar `Authorization` (p. ej. login). */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);
/** No cerrar sesión ante un 401 (p. ej. login con credenciales inválidas, cambio de contraseña). */
export const SKIP_LOGOUT_ON_401 = new HttpContextToken<boolean>(() => false);

export function withContext(flags: {
  skipErrorToast?: boolean;
  skipAuth?: boolean;
  skipLogoutOn401?: boolean;
}): HttpContext {
  const ctx = new HttpContext();
  if (flags.skipErrorToast) ctx.set(SKIP_ERROR_TOAST, true);
  if (flags.skipAuth) ctx.set(SKIP_AUTH, true);
  if (flags.skipLogoutOn401) ctx.set(SKIP_LOGOUT_ON_401, true);
  return ctx;
}
