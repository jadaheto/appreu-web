import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UiIcon } from '../icon/icon';

/**
 * Enlace con estilo de marca. Funciona con `href` o `routerLink`:
 * `<a ui-link routerLink="/admin/finanzas" iconRight="chevron-right">Ver cartera</a>`
 */
@Component({
  selector: 'a[ui-link]',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-link', '[class.ui-link--muted]': 'muted()' },
  template: `
    @if (icon()) {
      <ui-icon [name]="icon()!" [size]="16" />
    }
    <ng-content />
    @if (iconRight()) {
      <ui-icon [name]="iconRight()!" [size]="16" />
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      color: var(--color-primary);
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
    }
    :host(:hover) {
      text-decoration: underline;
    }
    :host(.ui-link--muted) {
      color: var(--color-text-muted);
    }
  `,
})
export class UiLink {
  readonly icon = input<string | null>(null);
  readonly iconRight = input<string | null>(null);
  readonly muted = input(false, { transform: booleanAttribute });
}
