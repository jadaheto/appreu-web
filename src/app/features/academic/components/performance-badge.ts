import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UiBadge } from '../../../shared/ui';
import { PERFORMANCE_TONES } from '../data-access/academic.labels';
import type { Performance } from '../data-access/academic.models';

/** Desempeño (Superior/Alto/Básico/Bajo) tal como lo calcula la API. */
@Component({
  selector: 'app-performance-badge',
  imports: [UiBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (performance(); as p) {
      <ui-badge [tone]="tone()">{{ p.label }}</ui-badge>
    } @else {
      <span class="text-muted">—</span>
    }
  `,
})
export class PerformanceBadge {
  readonly performance = input<Performance | null | undefined>(null);
  protected readonly tone = computed(() => {
    const p = this.performance();
    return p ? PERFORMANCE_TONES[p.level] : 'neutral';
  });
}
