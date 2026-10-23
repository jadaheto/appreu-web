import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiBarChart } from './bar-chart';
import { ChartDatum, ChartSeries, niceScale, seriesColor } from './chart-utils';
import { arcPath, UiDonutChart } from './donut-chart';
import { UiLineChart } from './line-chart';

describe('chart-utils', () => {
  it('niceScale produce un máximo redondo y marcas desde 0', () => {
    expect(niceScale(87)).toEqual({ max: 100, ticks: [0, 20, 40, 60, 80, 100] });
    expect(niceScale(0)).toEqual({ max: 1, ticks: [0, 1] });
    expect(niceScale(26_300_000).max).toBe(30_000_000);
  });

  it('seriesColor usa marca con una serie y paleta fija con varias', () => {
    expect(seriesColor(0, 1)).toBe('var(--color-primary)');
    expect(seriesColor(1, 3)).toBe('var(--series-2)');
    expect(seriesColor(8, 9)).toBe('var(--series-1)');
    expect(seriesColor(0, 2, '#f00')).toBe('#f00');
  });

  it('arcPath genera un sector cerrado', () => {
    expect(arcPath(50, 40, 20, 0, Math.PI / 2)).toMatch(/^M.*A.*L.*A.*Z$/);
    expect(arcPath(50, 40, 20, 1, 1)).toBe('');
  });
});

@Component({
  imports: [UiBarChart, UiLineChart, UiDonutChart],
  template: `
    <ui-bar-chart [labels]="labels" [series]="series()" ariaLabel="Ingresos" />
    <ui-line-chart [labels]="labels" [series]="two" ariaLabel="Comparativo" />
    <ui-donut-chart [data]="donut()" ariaLabel="Niveles" />
  `,
})
class Host {
  labels = ['Ene', 'Feb', 'Mar'];
  series = signal<ChartSeries[]>([{ name: 'Ingresos', values: [10, 20, 30] }]);
  two: ChartSeries[] = [
    { name: '2025', values: [1, 2, 3] },
    { name: '2026', values: [2, 3, 4] },
  ];
  donut = signal<ChartDatum[]>([
    { label: 'Primaria', value: 30 },
    { label: 'Media', value: 10 },
  ]);
}

describe('gráficas SVG', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, host: fixture.componentInstance };
  }

  it('barras: una barra por dato, sin leyenda con una serie, tabla accesible y tooltip', () => {
    const { fixture, el } = setup();
    const bar = el.querySelector('ui-bar-chart')!;
    const svg = bar.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Ingresos');
    expect(bar.querySelectorAll('g path').length).toBe(3);
    expect(bar.querySelector('.legend')).toBeNull();
    expect(bar.querySelectorAll('table tbody tr').length).toBe(3);
    bar.querySelectorAll('rect.hit')[2].dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();
    expect(bar.querySelector('.tooltip')?.textContent).toContain('Mar');
    expect(bar.querySelector('.tooltip')?.textContent).toContain('30');
  });

  it('barras: estado vacío', () => {
    const { fixture, el, host } = setup();
    host.series.set([{ name: 'x', values: [0, 0, 0] }]);
    fixture.detectChanges();
    expect(el.querySelector('ui-bar-chart .empty')?.textContent).toContain('Sin datos');
  });

  it('líneas: un trazo por serie, leyenda y cruz de guía', () => {
    const { fixture, el } = setup();
    const line = el.querySelector('ui-line-chart')!;
    expect(line.querySelectorAll('path[fill=none]').length).toBe(2);
    expect(line.querySelectorAll('.legend li').length).toBe(2);
    expect(line.querySelectorAll('circle').length).toBe(6);
    line.querySelectorAll('rect.hit')[1].dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();
    expect(line.querySelector('.crosshair')).not.toBeNull();
    expect(line.querySelectorAll('.tooltip .row').length).toBe(2);
  });

  it('dona: porciones proporcionales, total y leyenda con porcentajes', () => {
    const { fixture, el, host } = setup();
    const donut = el.querySelector('ui-donut-chart')!;
    expect(donut.querySelectorAll('svg path').length).toBe(2);
    expect(donut.querySelector('.center-value')?.textContent?.trim()).toBe('40');
    const legend = Array.from(donut.querySelectorAll('.legend li')).map((li) =>
      li.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(legend[0]).toContain('75 %');
    expect(legend[1]).toContain('25 %');
    host.donut.set([]);
    fixture.detectChanges();
    expect(donut.querySelector('.empty')).not.toBeNull();
  });
});
