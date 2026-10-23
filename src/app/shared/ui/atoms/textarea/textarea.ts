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

/** Área de texto con contador opcional de caracteres. */
@Component({
  selector: 'ui-textarea',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UiTextarea), multi: true },
    { provide: UI_FORM_CONTROL, useExisting: forwardRef(() => UiTextarea) },
  ],
  template: `
    <textarea
      [id]="resolvedId()"
      [rows]="rows()"
      [value]="value()"
      [disabled]="isDisabled()"
      [class.invalid]="isInvalid()"
      [attr.placeholder]="placeholder() || null"
      [attr.maxlength]="maxlength()"
      [attr.aria-invalid]="isInvalid() || null"
      [attr.aria-describedby]="describedBy()"
      (input)="commit($any($event.target).value)"
      (blur)="touch()"
    ></textarea>
    @if (maxlength() && showCount()) {
      <span class="count" aria-live="polite">{{ value().length }}/{{ maxlength() }}</span>
    }
  `,
  styles: `
    :host {
      display: block;
      position: relative;
    }
    textarea {
      width: 100%;
      resize: vertical;
      padding: 0.625rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text-strong);
      font-size: var(--text-sm);
      line-height: 1.5;
    }
    textarea:focus {
      outline: 0;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-ring);
    }
    textarea.invalid {
      border-color: var(--color-danger);
    }
    textarea:disabled {
      opacity: 0.7;
      background: var(--color-surface-2);
    }
    .count {
      display: block;
      text-align: right;
      font-size: var(--text-xs);
      color: var(--color-text-subtle);
      margin-top: 0.25rem;
    }
  `,
})
export class UiTextarea extends UiControlBase<string> {
  readonly rows = input(3);
  readonly placeholder = input('');
  readonly maxlength = input<number | null>(null);
  readonly showCount = input(true, { transform: booleanAttribute });

  protected emptyValue(): string {
    return '';
  }
  protected override idPrefix(): string {
    return 'ui-textarea';
  }
}
