import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { formatCop } from '../../pipes/cop-currency.pipe';

/** Monto en COP con fuente monoespaciada; opcionalmente coloreado por signo. */
@Component({
  selector: 'ui-money-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-money-text font-mono',
    '[class.positive]': 'signed() && (amount() ?? 0) > 0',
    '[class.negative]': 'signed() && (amount() ?? 0) < 0',
  },
  template: `{{ text() }}`,
  styles: `
    :host {
      font-weight: 700;
      white-space: nowrap;
    }
    :host(.positive) {
      color: var(--color-success);
    }
    :host(.negative) {
      color: var(--color-danger);
    }
  `,
})
export class UiMoneyText {
  readonly amount = input<number | null>(null);
  /** Colorear verde/rojo según el signo. */
  readonly signed = input(false, { transform: booleanAttribute });
  protected readonly text = computed(() => formatCop(this.amount()));
}
