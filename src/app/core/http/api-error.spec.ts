import { HttpErrorResponse } from '@angular/common/http';
import { ApiError, defaultMessageFor, toApiError } from './api-error';

describe('toApiError', () => {
  it('usa el cuerpo estándar de la API', () => {
    const err = toApiError(
      new HttpErrorResponse({
        status: 409,
        error: {
          statusCode: 409,
          code: 'EMAIL_TAKEN',
          message: 'El correo ya existe.',
          details: { field: 'email' },
        },
      }),
    );
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(err.code).toBe('EMAIL_TAKEN');
    expect(err.message).toBe('El correo ya existe.');
    expect(err.details).toEqual({ field: 'email' });
  });

  it('une los mensajes de validación en arreglo', () => {
    const err = toApiError(
      new HttpErrorResponse({
        status: 400,
        error: { statusCode: 400, code: 'VALIDATION', message: ['Uno', 'Dos'] },
      }),
    );
    expect(err.message).toBe('Uno. Dos');
    expect(err.messages).toEqual(['Uno', 'Dos']);
  });

  it('traduce errores sin cuerpo y de red', () => {
    expect(toApiError(new HttpErrorResponse({ status: 0 })).isNetworkError).toBe(true);
    expect(toApiError(new HttpErrorResponse({ status: 0 })).message).toContain(
      'No se pudo conectar',
    );
    const server = toApiError(new HttpErrorResponse({ status: 503, error: 'down' }));
    expect(server.isServerError).toBe(true);
    expect(server.message).toBe(defaultMessageFor(503));
    expect(defaultMessageFor(599)).toBe(defaultMessageFor(500));
  });

  it('envuelve errores genéricos y respeta ApiError existentes', () => {
    const existing = new ApiError(404, 'X', 'msg');
    expect(toApiError(existing)).toBe(existing);
    expect(toApiError(new Error('boom')).code).toBe('UNKNOWN_ERROR');
    expect(toApiError('???').message).toBe('Ocurrió un error inesperado.');
  });
});
