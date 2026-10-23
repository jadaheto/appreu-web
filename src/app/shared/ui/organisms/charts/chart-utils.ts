import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

/** Serie de datos para gráficas de barras y líneas. */
export interface ChartSeries {
  name: string;
  values: readonly number[];
  /** Color CSS opcional; por defecto la paleta categórica en orden fijo. */
  color?: string;
}

/** Porción de una dona. */
export interface ChartDatum {
  label: string;
  value: number;
  color?: string;
}

export type ValueFormatter = (value: number) => string;

const compact = new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 });
const plain = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

export const formatCompact: ValueFormatter = (v) => compact.format(v);
export const formatNumber: ValueFormatter = (v) => plain.format(v);

/**
 * Color de la serie `index`: paleta categórica validada (`--series-1..8`) en
 * orden fijo. Con una sola serie se usa el color de marca.
 */
export function seriesColor(index: number, total: number, custom?: string): string {
  if (custom) return custom;
  if (total === 1) return 'var(--color-primary)';
  return `var(--series-${(index % 8) + 1})`;
}

/** Máximo "redondo" y marcas del eje Y (desde 0). */
export function niceScale(maxValue: number, tickCount = 4): { max: number; ticks: number[] } {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return { max: 1, ticks: [0, 1] };
  const rough = maxValue / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const step = (residual > 7.5 ? 10 : residual > 3.5 ? 5 : residual > 1.5 ? 2 : 1) * magnitude;
  const max = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= max + step / 2; t += step) ticks.push(Number(t.toPrecision(12)));
  return { max, ticks };
}

/**
 * Base de las gráficas SVG: mide el ancho del contenedor (ResizeObserver) para
 * que el SVG use coordenadas en píxeles y el texto no se deforme.
 */
@Directive()
export abstract class ChartBase {
  protected readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly height = input(256);
  readonly ariaLabel = input('Gráfica');
  /** Formato de los valores (ejes, tooltip y tabla accesible). */
  readonly valueFormat = input<ValueFormatter>(formatNumber);
  readonly axisFormat = input<ValueFormatter>(formatCompact);

  protected readonly width = signal(600);

  constructor() {
    let observer: ResizeObserver | null = null;
    afterNextRender(() => {
      const node = this.el.nativeElement;
      if (node.clientWidth) this.width.set(node.clientWidth);
      if (typeof ResizeObserver === 'undefined') return;
      observer = new ResizeObserver((entries) => {
        const w = Math.floor(entries[0]?.contentRect.width ?? 0);
        if (w > 0 && w !== this.width()) this.width.set(w);
      });
      observer.observe(node);
    });
    inject(DestroyRef).onDestroy(() => observer?.disconnect());
  }
}
