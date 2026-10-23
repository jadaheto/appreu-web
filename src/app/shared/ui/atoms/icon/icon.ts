import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
} from '@angular/core';
import { iconPath } from './icon.registry';

/**
 * Ícono SVG (Heroicons outline). Decorativo por defecto (`aria-hidden`); si se
 * pasa `label`, se anuncia como imagen.
 */
@Component({
  selector: 'ui-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-icon',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[attr.role]': 'label() ? "img" : null',
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': 'label() ? null : "true"',
  },
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      focusable="false"
    >
      @if (path(); as d) {
        <path [attr.d]="d" stroke-linecap="round" stroke-linejoin="round" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      line-height: 0;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class UiIcon {
  readonly name = input.required<string>();
  readonly size = input(20, { transform: numberAttribute });
  readonly strokeWidth = input(1.75, { transform: numberAttribute });
  readonly label = input<string>('');

  protected readonly path = computed(() => iconPath(this.name()));
}
