import { ChangeDetectionStrategy, Component, computed, forwardRef, input } from '@angular/core';
import {
  AbstractControl,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { UiControlBase } from '../../forms/control-base';
import { UI_FORM_CONTROL } from '../../forms/form-control';

/** Rango de fechas ISO (`YYYY-MM-DD`); `null` = abierto en ese extremo. */
export interface DateRange {
  from: string | null;
  to: string | null;
}

export function isRangeValid(range: DateRange | null | undefined): boolean {
  return !range?.from || !range?.to || range.from <= range.to;
}

/**
 * Selector "Desde / Hasta". Valida que `from <= to` (error `dateRange`).
 * Funciona como control de formulario o con `(ngModelChange)`.
 */
@Component({
  selector: 'ui-date-range',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UiDateRange), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => UiDateRange), multi: true },
    { provide: UI_FORM_CONTROL, useExisting: forwardRef(() => UiDateRange) },
  ],
  template: `
    <div
      class="range"
      [class.invalid]="isInvalid() || !valid()"
      role="group"
      [attr.aria-describedby]="describedBy()"
    >
      <label>
        <span class="cap">{{ fromLabel() }}</span>
        <input
          type="date"
          [id]="resolvedId()"
          [value]="value().from ?? ''"
          [attr.min]="min()"
          [attr.max]="value().to ?? max()"
          [disabled]="isDisabled()"
          (input)="update('from', $any($event.target).value)"
          (blur)="touch()"
        />
      </label>
      <label>
        <span class="cap">{{ toLabel() }}</span>
        <input
          type="date"
          [value]="value().to ?? ''"
          [attr.min]="value().from ?? min()"
          [attr.max]="max()"
          [disabled]="isDisabled()"
          (input)="update('to', $any($event.target).value)"
          (blur)="touch()"
        />
      </label>
    </div>
  `,
  styles: `
    .range {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    label {
      flex: 1 1 9rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .cap {
      font-size: 0.7rem;
      color: var(--color-text-subtle);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    input {
      padding: 0.55rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text-strong);
    }
    input:focus {
      outline: 0;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-ring);
    }
    .invalid input {
      border-color: var(--color-danger);
    }
  `,
})
export class UiDateRange extends UiControlBase<DateRange> implements Validator {
  readonly fromLabel = input('Desde');
  readonly toLabel = input('Hasta');
  readonly min = input<string | null>(null);
  readonly max = input<string | null>(null);

  protected readonly valid = computed(() => isRangeValid(this.value()));

  protected emptyValue(): DateRange {
    return { from: null, to: null };
  }
  protected override idPrefix(): string {
    return 'ui-date-range';
  }

  validate(control: AbstractControl<DateRange | null>): ValidationErrors | null {
    return isRangeValid(control.value) ? null : { dateRange: true };
  }

  protected update(edge: keyof DateRange, raw: string): void {
    this.commit({ ...this.value(), [edge]: raw || null });
  }
}
