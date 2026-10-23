import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  output,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { UiControlBase } from '../../forms/control-base';
import { UI_FORM_CONTROL } from '../../forms/form-control';

/**
 * Casilla de verificación con etiqueta proyectada. Usable con formularios
 * o de forma controlada con `[checked]` + `(checkedChange)` (p. ej. selección en tablas).
 */
@Component({
  selector: 'ui-checkbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UiCheckbox), multi: true },
    { provide: UI_FORM_CONTROL, useExisting: forwardRef(() => UiCheckbox) },
  ],
  template: `
    <label [class.disabled]="isDisabled()">
      <input
        type="checkbox"
        [id]="resolvedId()"
        [checked]="checked() ?? value()"
        [indeterminate]="indeterminate()"
        [disabled]="isDisabled() || disabled()"
        [attr.aria-label]="ariaLabel() || null"
        [attr.aria-describedby]="describedBy()"
        [attr.aria-invalid]="isInvalid() || null"
        (change)="onToggle($event)"
        (blur)="touch()"
      />
      <span class="text"><ng-content /></span>
    </label>
  `,
  styles: `
    :host {
      display: inline-block;
    }
    label {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-size: var(--text-sm);
      color: var(--color-text);
    }
    label.disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    input {
      width: 1rem;
      height: 1rem;
      accent-color: var(--color-primary);
      cursor: inherit;
      margin: 0;
    }
    .text:empty {
      display: none;
    }
  `,
})
export class UiCheckbox extends UiControlBase<boolean> {
  /** Modo controlado (sin formularios). */
  readonly checked = input<boolean | null>(null);
  readonly indeterminate = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input('');
  readonly checkedChange = output<boolean>();

  protected emptyValue(): boolean {
    return false;
  }
  protected override idPrefix(): string {
    return 'ui-checkbox';
  }

  protected onToggle(event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    this.commit(value);
    this.checkedChange.emit(value);
  }
}
