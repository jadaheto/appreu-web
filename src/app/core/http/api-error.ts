import { HttpErrorResponse } from '@angular/common/http';

/** Cuerpo de error estándar de `apreu-api`. */
export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string | string[];
  details?: unknown;
}

const DEFAULT_MESSAGES: Record<number, string> = {
  0: 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.',
  400: 'La solicitud no es válida. Revisa los datos ingresados.',
  401: 'Tu sesión expiró o no es válida. Inicia sesión de nuevo.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'El recurso solicitado no existe.',
  409: 'La operación entra en conflicto con el estado actual de los datos.',
  413: 'El archivo o la solicitud es demasiado grande.',
  422: 'Los datos enviados no son válidos.',
  429: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
  500: 'Ocurrió un error en el servidor. Inténtalo más tarde.',
  502: 'El servidor no está disponible en este momento.',
  503: 'El servicio no está disponible en este momento.',
  504: 'El servidor tardó demasiado en responder.',
};

const DEFAULT_CODES: Record<number, string> = {
  0: 'NETWORK_ERROR',
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
};

/** Error de la API ya traducido: mensaje en español listo para mostrar. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
    /** Mensajes individuales (p. ej. validaciones de varios campos). */
    readonly messages: string[] = [message],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

export function defaultMessageFor(status: number): string {
  if (DEFAULT_MESSAGES[status]) return DEFAULT_MESSAGES[status];
  return status >= 500 ? DEFAULT_MESSAGES[500] : 'No se pudo completar la operación.';
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && 'message' in value;
}

/** Convierte cualquier error (HTTP o no) en un `ApiError` con mensaje en español. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof HttpErrorResponse) {
    const status = error.status;
    const body: unknown = error.error;
    if (isApiErrorBody(body)) {
      const messages = (Array.isArray(body.message) ? body.message : [body.message]).filter(
        (m): m is string => typeof m === 'string' && m.trim().length > 0,
      );
      const message = messages.length ? messages.join('. ') : defaultMessageFor(status);
      const code =
        typeof body.code === 'string' ? body.code : (DEFAULT_CODES[status] ?? 'HTTP_ERROR');
      return new ApiError(
        status,
        code,
        message,
        body.details,
        messages.length ? messages : [message],
      );
    }
    return new ApiError(status, DEFAULT_CODES[status] ?? 'HTTP_ERROR', defaultMessageFor(status));
  }

  const message =
    error instanceof Error && error.message ? error.message : 'Ocurrió un error inesperado.';
  return new ApiError(-1, 'UNKNOWN_ERROR', message);
}
