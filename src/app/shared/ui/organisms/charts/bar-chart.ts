import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ChartBase, ChartSeries, niceScale, seriesColor } from './chart-utils';

const PAD = { top: 12, right: 8, bottom: 28, left: 48 };

/**
 * Barras verticales agrupadas en SVG puro. Una serie → color de marca y sin
 * leyenda; varias → paleta categórica + leyenda. Tooltip al pasar el cursor y
 * tabla accesible oculta con los valores.
 */
@Component({
  selector: 'ui-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bar-chart.html',
  styleUrl: './chart.scss',
})
export class UiBarChart extends ChartBase {
  readonly labels = input<readonly string[]>([]);
  readonly series = input<readonly ChartSeries[]>([]);

  protected readonly hover = signal<{ group: number; series: number } | null>(null);
  protected readonly hasData = computed(() => this.series().some((s) => s.values.some((v) => v)));
  protected readonly scale = computed(() =>
    niceScale(Math.max(0, ...this.series().flatMap((s) => s.values.map((v) => v || 0)))),
  );
  protected readonly plot = computed(() => ({
    x: PAD.left,
    y: PAD.top,
    w: Math.max(10, this.width() - PAD.left - PAD.right),
    h: Math.max(10, this.height() - PAD.top - PAD.bottom),
  }));

  protected readonly bars = computed(() => {
    const { x, y, w, h } = this.plot();
    const labels = this.labels();
    const series = this.series();
    const groups = Math.max(1, labels.length);
    const groupW = w / groups;
    const inner = groupW * 0.7;
    const gap = 2;
    const barW = Math.max(2, (inner - gap * (series.length - 1)) / Math.max(1, series.length));
    const max = this.scale().max;
    return labels.flatMap((label, g) =>
      series.map((s, i) => {
        const value = s.values[g] ?? 0;
        const bh = (Math.max(0, value) / max) * h;
        return {
          group: g,
          series: i,
          label,
          name: s.name,
          value,
          color: seriesColor(i, series.length, s.color),
          x: x + g * groupW + (groupW - inner) / 2 + i * (barW + gap),
          y: y + h - bh,
          w: barW,
          h: bh,
        };
      }),
    );
  });

  protected readonly xLabels = computed(() => {
    const { x, w } = this.plot();
    const labels = this.labels();
    const groupW = w / Math.max(1, labels.length);
    const every = Math.ceil(labels.length / Math.max(1, Math.floor(w / 56)));
    return labels.map((label, i) => ({
      label,
      x: x + groupW * i + groupW / 2,
      show: i % every === 0,
    }));
  });

  protected readonly yTicks = computed(() => {
    const { y, h } = this.plot();
    const { max, ticks } = this.scale();
    return ticks.map((t) => ({ value: t, y: y + h - (t / max) * h }));
  });

  protected readonly tooltip = computed(() => {
    const hv = this.hover();
    if (!hv) return null;
    const bar = this.bars().find((b) => b.group === hv.group && b.series === hv.series);
    return bar ? { ...bar, left: bar.x + bar.w / 2, top: bar.y } : null;
  });

  /** Barra con extremo superior redondeado (4 px) y base recta sobre el eje. */
  protected barPath(b: { x: number; y: number; w: number; h: number }): string {
    if (b.h <= 0) return '';
    const r = Math.min(4, b.w / 2, b.h);
    const bottom = b.y + b.h;
    return `M${b.x},${bottom}V${b.y + r}Q${b.x},${b.y} ${b.x + r},${b.y}H${b.x + b.w - r}Q${b.x + b.w},${b.y} ${b.x + b.w},${b.y + r}V${bottom}Z`;
  }
}
