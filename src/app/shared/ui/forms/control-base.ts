import { booleanAttribute, computed, Directive, input, signal } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { uniqueId, UiFormControl } from './form-control';

/**
 * Base común de los átomos de formulario: implementa `ControlValueAccessor`
 * (funcionan con `formControlName`, `[formControl]` y `ngModel`) y el contrato
 * `UiFormControl` que usa `ui-form-field`.
 */
@Directive()
export abstract class UiControlBase<T> implements ControlValueAccessor, UiFormControl {
  /** Id del elemento nativo; se genera si no se indica. */
  readonly inputId = input<string>('');
  /** Fuerza el estado inválido (además del que informa `ui-form-field`). */
  readonly invalid = input(false, { transform: booleanAttribute });

  private readonly generatedId = uniqueId(this.idPrefix());
  readonly controlId = computed(() => this.inputId() || this.generatedId);
  readonly describedBy = signal<string | null>(null);
  readonly fieldInvalid = signal(false);

  protected readonly value = signal<T>(this.emptyValue());
  protected readonly isDisabled = signal(false);

  private onChange: (value: T) => void = () => {};
  private onTouched: () => void = () => {};

  protected abstract emptyValue(): T;
  protected idPrefix(): string {
    return 'ui-control';
  }

  protected resolvedId(): string {
    return this.controlId();
  }

  protected isInvalid(): boolean {
    return this.invalid() || this.fieldInvalid();
  }

  writeValue(value: T | null | undefined): void {
    this.value.set(value ?? this.emptyValue());
  }
  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(disabled: boolean): void {
    this.isDisabled.set(disabled);
  }

  /** Actualiza el valor desde la vista y notifica al formulario. */
  protected commit(value: T): void {
    this.value.set(value);
    this.onChange(value);
  }

  protected touch(): void {
    this.onTouched();
  }
}
