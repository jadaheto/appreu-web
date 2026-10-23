import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Barra de progreso 0–100 con tono automático por umbrales (rojo < 40 ≤ ámbar < 75 ≤ verde). */
@Component({
  selector: 'ui-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'progressbar',
    '[attr.aria-valuenow]': 'clamped()',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-label]': 'label() || null',
  },
  template: `<span
    class="fill"
    [style.width.%]="clamped()"
    [class]="'fill fill--' + tone()"
  ></span>`,
  styles: `
    :host {
      display: block;
      height: 0.5rem;
      border-radius: var(--radius-full);
      background: var(--color-neutral-bg);
      overflow: hidden;
    }
    .fill {
      display: block;
      height: 100%;
      border-radius: inherit;
      transition: width 0.3s ease;
    }
    .fill--primary {
      background: var(--gradient-primary);
    }
    .fill--success {
      background: var(--color-success);
    }
    .fill--warning {
      background: var(--color-warning);
    }
    .fill--danger {
      background: var(--color-danger);
    }
  `,
})
export class UiProgressBar {
  readonly value = input(0);
  readonly label = input('');
  /** `auto` usa umbrales; `primary` siempre el color de marca. */
  readonly mode = input<'auto' | 'primary'>('primary');

  protected readonly clamped = computed(() =>
    Math.round(Math.min(100, Math.max(0, this.value() || 0))),
  );
  protected readonly tone = computed(() => {
    if (this.mode() === 'primary') return 'primary';
    const v = this.clamped();
    return v < 40 ? 'danger' : v < 75 ? 'warning' : 'success';
  });
}
