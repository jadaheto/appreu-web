import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SpinnerSize = 'sm' | 'md' | 'lg';

/** Indicador de carga accesible (`role="status"`). */
@Component({
  selector: 'ui-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status', class: 'ui-spinner', '[class]': '"ui-spinner--" + size()' },
  template: `<span class="ring" aria-hidden="true"></span
    ><span class="sr-only">{{ label() }}</span>`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .ring {
      width: 1.25rem;
      height: 1.25rem;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: ui-spin 0.7s linear infinite;
      opacity: 0.8;
    }
    :host(.ui-spinner--sm) .ring {
      width: 0.9rem;
      height: 0.9rem;
    }
    :host(.ui-spinner--lg) .ring {
      width: 2.25rem;
      height: 2.25rem;
      border-width: 3px;
      color: var(--color-primary);
    }
  `,
})
export class UiSpinner {
  readonly size = input<SpinnerSize>('md');
  readonly label = input('Cargando…');
}
