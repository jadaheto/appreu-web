import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Chip/píldora de filtro (`text-xs rounded-full font-bold`, activo con color sólido).
 * `<button ui-chip [active]="filtro() === 'urgent'" (click)="...">Urgentes</button>`
 */
@Component({
  selector: 'button[ui-chip]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-chip',
    type: 'button',
    '[class.ui-chip--active]': 'active()',
    '[attr.aria-pressed]': 'active()',
  },
  template: `<ng-content />
    @if (count() !== null) {
      <span class="count">{{ count() }}</span>
    }`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.375rem 0.85rem;
      border-radius: var(--radius-full);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text-muted);
      font-size: var(--text-xs);
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }
    :host(:hover) {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
    :host(.ui-chip--active) {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: #fff;
    }
    .count {
      background: rgb(0 0 0 / 0.08);
      border-radius: var(--radius-full);
      padding: 0 0.4rem;
    }
  `,
})
export class UiChip {
  readonly active = input(false, { transform: booleanAttribute });
  readonly count = input<number | null>(null);
}
