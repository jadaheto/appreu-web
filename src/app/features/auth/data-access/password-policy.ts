import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Política de contraseñas de `apreu-api` (`password-policy.ts`): ≥ 8 caracteres, letras y números. */
export const PASSWORD_MIN_LENGTH = 8;

export function strongPasswordValidator(
  control: AbstractControl<string | null>,
): ValidationErrors | null {
  const value = control.value ?? '';
  if (!value) return null;
  const ok = value.length >= PASSWORD_MIN_LENGTH && /[A-Za-z]/.test(value) && /\d/.test(value);
  return ok ? null : { weakPassword: true };
}

export const PASSWORD_ERROR_MESSAGES = {
  weakPassword: `Debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres e incluir letras y números.`,
  mismatch: 'Las contraseñas no coinciden.',
};
