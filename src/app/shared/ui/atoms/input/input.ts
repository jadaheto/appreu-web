import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { UiControlBase } from '../../forms/control-base';
import { UI_FORM_CONTROL } from '../../forms/form-control';
import { UiIcon } from '../icon/icon';

export type InputType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'search'
  | 'date'
  | 'month'
  | 'time'
  | 'datetime-local'
  | 'color';

/**
 * Campo de texto (`.apreu-input`). Compatible con formularios reactivos y `ngModel`.
 * Con `type="password"` muestra un botón para ver/ocultar la contraseña.
 */
@Component({
  selector: 'ui-input',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UiInput), multi: true },
    { provide: UI_FORM_CONTROL, useExisting: forwardRef(() => UiInput) },
  ],
  template: `
    <div
      class="wrap"
      [class.invalid]="isInvalid()"
      [class.disabled]="isDisabled()"
      [class.has-icon]="!!icon()"
    >
      @if (icon()) {
        <ui-icon class="lead" [name]="icon()!" [size]="18" />
      }
      @if (prefix()) {
        <span class="affix">{{ prefix() }}</span>
      }
      <input
        [id]="resolvedId()"
        [type]="effectiveType()"
        [value]="value()"
        [attr.name]="name() || null"
        [attr.placeholder]="placeholder() || null"
        [attr.autocomplete]="autocomplete() || null"
        [attr.inputmode]="inputmode() || null"
        [attr.min]="min()"
        [attr.max]="max()"
        [attr.step]="step()"
        [attr.maxlength]="maxlength()"
        [attr.aria-invalid]="isInvalid() || null"
        [attr.aria-describedby]="describedBy()"
        [attr.aria-label]="ariaLabel() || null"
        [attr.required]="required() || null"
        [readOnly]="readonly()"
        [disabled]="isDisabled()"
        [class.mono]="mono()"
        (input)="onInput($event)"
        (blur)="touch()"
      />
      @if (suffix()) {
        <span class="affix">{{ suffix() }}</span>
      }
      @if (type() === 'password') {
        <button
          type="button"
          class="reveal"
          (click)="revealed.set(!revealed())"
          [attr.aria-label]="revealed() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          [attr.aria-pressed]="revealed()"
        >
          <ui-icon [name]="revealed() ? 'eye-slash' : 'eye'" [size]="18" />
        </button>
      }
    </div>
  `,
  styleUrl: './input.scss',
})
export class UiInput extends UiControlBase<string | number | null> {
  readonly type = input<InputType>('text');
  readonly placeholder = input('');
  readonly name = input('');
  readonly autocomplete = input('');
  readonly inputmode = input('');
  readonly icon = input<string | null>(null);
  readonly prefix = input('');
  readonly suffix = input('');
  readonly min = input<string | number | null>(null);
  readonly max = input<string | number | null>(null);
  readonly step = input<string | number | null>(null);
  readonly maxlength = input<number | null>(null);
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly mono = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input('');
  /** Valor inicial cuando no se usa con formularios. */
  readonly initialValue = input<string | number | null>(null, { alias: 'value' });

  protected readonly revealed = signal(false);
  protected readonly effectiveType = computed(() =>
    this.type() === 'password' && this.revealed() ? 'text' : this.type(),
  );

  constructor() {
    super();
    effect(() => {
      const v = this.initialValue();
      if (v !== null) this.value.set(v);
    });
  }

  protected emptyValue(): string | number | null {
    return '';
  }
  protected override idPrefix(): string {
    return 'ui-input';
  }

  protected onInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    if (this.type() === 'number') {
      this.commit(el.value === '' ? null : Number(el.value));
    } else {
      this.commit(el.value);
    }
  }
}
