import { InjectionToken, Signal, WritableSignal } from '@angular/core';

/**
 * Contrato que implementan los átomos de formulario (`ui-input`, `ui-select`,
 * `ui-textarea`, `ui-checkbox`, `ui-date-range`) para que `ui-form-field`
 * enlace la etiqueta (`for`), el texto de ayuda/error (`aria-describedby`) y
 * el estado inválido sin que la página tenga que repetirlo.
 */
export interface UiFormControl {
  readonly controlId: Signal<string>;
  readonly describedBy: WritableSignal<string | null>;
  readonly fieldInvalid: WritableSignal<boolean>;
}

export const UI_FORM_CONTROL = new InjectionToken<UiFormControl>('UI_FORM_CONTROL');

let counter = 0;
/** Id único para asociar etiquetas y controles. */
export function uniqueId(prefix = 'ui'): string {
  counter += 1;
  return `${prefix}-${counter}`;
}
