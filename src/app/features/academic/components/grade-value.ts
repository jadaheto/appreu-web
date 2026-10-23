import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatScore } from '../data-access/academic.labels';

/** Nota con un decimal; en rojo si la API la marca como reprobada (`passing = false`). */
@Component({
  selector: 'app-grade-value',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'font-mono',
    '[class.failing]': 'passing() === false',
    '[class.strong]': 'strong()',
    '[attr.title]': 'passing() === false ? "Por debajo de la nota mínima" : null',
  },
  template: `{{ text() }}`,
  styles: `
    :host {
      font-variant-numeric: tabular-nums;
    }
    :host(.strong) {
      font-weight: 700;
      color: var(--color-text-strong);
    }
    :host(.failing) {
      color: var(--color-danger);
      font-weight: 700;
    }
  `,
})
export class GradeValue {
  readonly value = input<number | null | undefined>(null);
  readonly passing = input<boolean | null | undefined>(null);
  readonly strong = input(false);
  protected readonly text = computed(() => formatScore(this.value()));
}
