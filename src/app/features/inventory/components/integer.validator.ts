import { AbstractControl, ValidationErrors } from '@angular/forms';

/** El valor (si existe) debe ser un entero. */
export function integerValidator(control: AbstractControl): ValidationErrors | null {
  const v = control.value as unknown;
  return v === null || v === undefined || v === '' || Number.isInteger(v)
    ? null
    : { integer: true };
}

export const INTEGER_MESSAGES = { integer: 'Debe ser un número entero.' };
