import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validador de grupo: `confirmKey` debe ser igual a `key`. Marca el error
 * `mismatch` también en el control de confirmación para que `ui-form-field` lo muestre.
 */
export function matchFieldsValidator(key: string, confirmKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(key);
    const b = group.get(confirmKey);
    if (!a || !b) return null;
    const mismatch = !!b.value && a.value !== b.value;
    const others = { ...(b.errors ?? {}) };
    delete others['mismatch'];
    if (mismatch) b.setErrors({ ...others, mismatch: true });
    else b.setErrors(Object.keys(others).length ? others : null);
    return mismatch ? { mismatch: true } : null;
  };
}
