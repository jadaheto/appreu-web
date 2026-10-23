import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { ChartBase, ChartSeries, niceScale, seriesColor } from './chart-utils';

const PAD = { top: 12, right: 12, bottom: 28, left: 48 };

/**
 * Líneas (series en el tiempo) en SVG puro: trazo de 2 px, marcadores,
 * área opcional, cruz de guía y tooltip por categoría.
 */
@Component({
  selector: 'ui-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './line-chart.html',
  styleUrl: './chart.scss',
})
export class UiLineChart extends ChartBase {
  readonly labels = input<readonly string[]>([]);
  readonly series = input<readonly ChartSeries[]>([]);
  /** Relleno suave bajo la línea (solo con una serie). */
  readonly area = input(true, { transform: booleanAttribute });

  protected readonly hoverIndex = signal<number | null>(null);
  protected readonly hasData = computed(
    () => this.labels().length > 0 && this.series().some((s) => s.values.length),
  );
  protected readonly scale = computed(() =>
    niceScale(Math.max(0, ...this.series().flatMap((s) => s.values.map((v) => v || 0)))),
  );
  protected readonly plot = computed(() => ({
    x: PAD.left,
    y: PAD.top,
    w: Math.max(10, this.width() - PAD.left - PAD.right),
    h: Math.max(10, this.height() - PAD.top - PAD.bottom),
  }));

  protected xAt(i: number): number {
    const n = this.labels().length;
    const { x, w } = this.plot();
    return n <= 1 ? x + w / 2 : x + (w * i) / (n - 1);
  }

  protected yAt(v: number): number {
    const { y, h } = this.plot();
    return y + h - (Math.max(0, v || 0) / this.scale().max) * h;
  }

  protected readonly lines = computed(() => {
    const series = this.series();
    const { y, h } = this.plot();
    return series.map((s, i) => {
      const pts = s.values.map((v, j) => ({ x: this.xAt(j), y: this.yAt(v), value: v }));
      const d = pts.map((p, j) => `${j ? 'L' : 'M'}${p.x},${p.y}`).join('');
      const areaD = pts.length
        ? `${d}L${pts[pts.length - 1].x},${y + h}L${pts[0].x},${y + h}Z`
        : '';
      return { name: s.name, color: seriesColor(i, series.length, s.color), points: pts, d, areaD };
    });
  });

  protected readonly yTicks = computed(() =>
    this.scale().ticks.map((t) => ({ value: t, y: this.yAt(t) })),
  );

  protected readonly xLabels = computed(() => {
    const labels = this.labels();
    const every = Math.ceil(labels.length / Math.max(1, Math.floor(this.plot().w / 64)));
    return labels.map((label, i) => ({
      label,
      x: this.xAt(i),
      show: i % every === 0 || i === labels.length - 1,
    }));
  });

  protected readonly hitWidth = computed(
    () => this.plot().w / Math.max(1, this.labels().length - 1),
  );

  protected readonly tooltip = computed(() => {
    const i = this.hoverIndex();
    if (i === null) return null;
    const lines = this.lines();
    const top = Math.min(...lines.map((l) => l.points[i]?.y ?? this.plot().y + this.plot().h));
    return {
      label: this.labels()[i],
      left: this.xAt(i),
      top,
      rows: lines.map((l) => ({ name: l.name, color: l.color, value: l.points[i]?.value ?? 0 })),
    };
  });
}
