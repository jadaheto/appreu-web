import { ValidationErrors } from '@angular/forms';

export type ErrorMessageMap = Record<string, string | ((error: unknown) => string)>;

/** Mensajes en español para los validadores estándar de Angular y los propios. */
export const DEFAULT_ERROR_MESSAGES: ErrorMessageMap = {
  required: 'Este campo es obligatorio.',
  requiredTrue: 'Debes aceptar esta opción.',
  email: 'Ingresa un correo electrónico válido.',
  minlength: (e) =>
    `Debe tener al menos ${(e as { requiredLength: number }).requiredLength} caracteres.`,
  maxlength: (e) =>
    `Debe tener máximo ${(e as { requiredLength: number }).requiredLength} caracteres.`,
  min: (e) => `El valor mínimo es ${(e as { min: number }).min}.`,
  max: (e) => `El valor máximo es ${(e as { max: number }).max}.`,
  pattern: 'El formato no es válido.',
  mismatch: 'Los valores no coinciden.',
  dateRange: 'La fecha inicial no puede ser posterior a la final.',
  server: (e) => String(e),
};

/** Devuelve el primer mensaje aplicable a los errores de un control. */
export function validationMessage(
  errors: ValidationErrors | null | undefined,
  overrides: ErrorMessageMap = {},
): string | null {
  if (!errors) return null;
  const messages = { ...DEFAULT_ERROR_MESSAGES, ...overrides };
  for (const [key, value] of Object.entries(errors)) {
    const msg = messages[key];
    if (typeof msg === 'function') return msg(value);
    if (typeof msg === 'string') return msg;
    if (typeof value === 'string') return value;
  }
  return 'El valor no es válido.';
}
