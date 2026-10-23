import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Etiqueta de campo (`text-xs font-semibold`), con asterisco si es obligatorio. */
@Component({
  selector: 'ui-label',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [attr.for]="for() || null" [attr.id]="labelId() || null">
      <ng-content />
      @if (required()) {
        <span class="req" aria-hidden="true">*</span>
      }
    </label>
  `,
  styles: `
    :host {
      display: block;
    }
    label {
      display: inline-block;
      font-size: var(--text-xs);
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 0.375rem;
    }
    .req {
      color: var(--color-danger);
      margin-left: 0.15rem;
    }
  `,
})
export class UiLabel {
  readonly for = input<string | null>(null);
  readonly labelId = input<string | null>(null);
  readonly required = input(false, { transform: booleanAttribute });
}
