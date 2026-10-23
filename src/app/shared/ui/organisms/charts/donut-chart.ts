import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { ChartBase, ChartDatum, seriesColor } from './chart-utils';

/**
 * Dona en SVG puro con total al centro y leyenda (valor + %). Pensada para
 * pocas categorías (≤ 8); el resto debe agruparse en "Otros".
 */
@Component({
  selector: 'ui-donut-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './donut-chart.html',
  styleUrl: './chart.scss',
  styles: `
    .donut {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1.25rem;
    }
    .donut svg {
      flex-shrink: 0;
    }
    .donut .legend {
      flex: 1 1 10rem;
      flex-direction: column;
      margin: 0;
    }
    .donut .legend li {
      justify-content: space-between;
      gap: 0.75rem;
      cursor: default;
    }
    .donut .legend .name {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .center-value {
      font-family: var(--font-mono);
      font-weight: 700;
      fill: var(--color-text-strong);
    }
    .center-label {
      fill: var(--color-text-subtle);
      font-size: 11px;
    }
  `,
})
export class UiDonutChart extends ChartBase {
  readonly data = input<readonly ChartDatum[]>([]);
  readonly centerLabel = input('Total');
  readonly showLegend = input(true, { transform: booleanAttribute });
  readonly thickness = input(22);

  protected readonly hover = signal<number | null>(null);
  protected readonly size = computed(() => Math.min(this.height(), 220));
  protected readonly total = computed(() =>
    this.data().reduce((acc, d) => acc + Math.max(0, d.value || 0), 0),
  );

  protected readonly arcs = computed(() => {
    const data = this.data();
    const total = this.total();
    const size = this.size();
    const r = size / 2 - 2;
    const inner = Math.max(0, r - this.thickness());
    const c = size / 2;
    let angle = -Math.PI / 2;
    return data.map((d, i) => {
      const value = Math.max(0, d.value || 0);
      const fraction = total ? value / total : 0;
      const sweep = fraction * Math.PI * 2;
      const start = angle;
      const end = angle + sweep;
      angle = end;
      return {
        label: d.label,
        value,
        percent: fraction * 100,
        color: seriesColor(i, data.length > 1 ? data.length : 2, d.color),
        d: fraction >= 0.9999 ? ringPath(c, r, inner) : arcPath(c, r, inner, start, end),
      };
    });
  });
}

function point(c: number, r: number, a: number): string {
  return `${c + r * Math.cos(a)},${c + r * Math.sin(a)}`;
}

/** Sector de anillo (con 1px de separación visual vía trazo del color de superficie). */
export function arcPath(c: number, r: number, inner: number, start: number, end: number): string {
  if (end - start <= 0) return '';
  const large = end - start > Math.PI ? 1 : 0;
  return [
    `M${point(c, r, start)}`,
    `A${r},${r} 0 ${large} 1 ${point(c, r, end)}`,
    `L${point(c, inner, end)}`,
    `A${inner},${inner} 0 ${large} 0 ${point(c, inner, start)}`,
    'Z',
  ].join('');
}

function ringPath(c: number, r: number, inner: number): string {
  return `M${c - r},${c}A${r},${r} 0 1 1 ${c + r},${c}A${r},${r} 0 1 1 ${c - r},${c}ZM${c - inner},${c}A${inner},${inner} 0 1 0 ${c + inner},${c}A${inner},${inner} 0 1 0 ${c - inner},${c}Z`;
}
