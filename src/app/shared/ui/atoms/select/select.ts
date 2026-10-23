import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { UiControlBase } from '../../forms/control-base';
import { UI_FORM_CONTROL } from '../../forms/form-control';

export interface SelectOption<T = unknown> {
  value: T;
  label: string;
  disabled?: boolean;
  /** Agrupa opciones en `<optgroup>`. */
  group?: string;
}

/**
 * Lista desplegable nativa (`.apreu-select`). Los valores pueden ser de
 * cualquier tipo: se comparan por igualdad estricta. `placeholder` añade una
 * opción vacía que produce `null`.
 */
@Component({
  selector: 'ui-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UiSelect), multi: true },
    { provide: UI_FORM_CONTROL, useExisting: forwardRef(() => UiSelect) },
  ],
  template: `
    <select
      [id]="resolvedId()"
      [disabled]="isDisabled()"
      [class.invalid]="isInvalid()"
      [attr.aria-invalid]="isInvalid() || null"
      [attr.aria-describedby]="describedBy()"
      [attr.aria-label]="ariaLabel() || null"
      [attr.required]="required() || null"
      (change)="onSelect($event)"
      (blur)="touch()"
    >
      @if (placeholder() !== null) {
        <option value="" [selected]="selectedIndex() === -1">{{ placeholder() }}</option>
      }
      @for (opt of options(); track $index) {
        <option [value]="$index" [disabled]="opt.disabled" [selected]="$index === selectedIndex()">
          {{ opt.label }}
        </option>
      }
    </select>
  `,
  styles: `
    :host {
      display: block;
    }
    select {
      width: 100%;
      appearance: none;
      padding: 0.625rem 2.5rem 0.625rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface)
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")
        no-repeat right 0.85rem center / 1rem;
      color: var(--color-text-strong);
      font-size: var(--text-sm);
      cursor: pointer;
      transition:
        border-color 0.15s,
        box-shadow 0.15s;
    }
    select:focus {
      outline: 0;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-ring);
    }
    select.invalid {
      border-color: var(--color-danger);
    }
    select:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      background-color: var(--color-surface-2);
    }
  `,
})
export class UiSelect<T = unknown> extends UiControlBase<T | null> {
  readonly options = input<readonly SelectOption<T>[]>([]);
  /** Texto de la opción vacía; `null` para no mostrarla. */
  readonly placeholder = input<string | null>('Seleccione…');
  readonly ariaLabel = input('');
  readonly required = input(false, { transform: booleanAttribute });

  protected emptyValue(): T | null {
    return null;
  }
  protected override idPrefix(): string {
    return 'ui-select';
  }

  protected selectedIndex(): number {
    const v = this.value();
    return this.options().findIndex((o) => o.value === v);
  }

  protected onSelect(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    this.commit(raw === '' ? null : (this.options()[Number(raw)]?.value ?? null));
  }
}
