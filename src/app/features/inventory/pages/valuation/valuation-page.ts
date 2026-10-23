import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { BrandingService } from '../../../../core';
import {
  ChartDatum,
  formatCop,
  UiAlert,
  UiDonutChart,
  UiEmptyState,
  UiPrintableSheet,
  UiSpinner,
  UiStatCard,
} from '../../../../shared/ui';
import { InventoryService } from '../../data-access/inventory.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** Valoración del inventario por categoría (unidades × costo promedio, ítems activos). */
@Component({
  selector: 'app-valuation-page',
  imports: [UiAlert, UiDonutChart, UiEmptyState, UiPrintableSheet, UiSpinner, UiStatCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header no-print">
      <div>
        <h1>Valoración del inventario</h1>
        <p class="page-header__subtitle">
          Unidades en stock × costo promedio ponderado (ítems activos)
        </p>
      </div>
    </div>

    @if (valuation.isLoading() && !data()) {
      <div class="ui-card" style="display: grid; place-items: center"><ui-spinner size="lg" /></div>
    } @else if (valuation.error()) {
      <ui-alert tone="error" title="No se pudo calcular la valoración" />
    } @else if (data(); as v) {
      <section class="grid grid--3 mb no-print" aria-label="Totales">
        <ui-stat-card
          label="Valor total"
          icon="banknotes"
          tone="success"
          [value]="cop(v.totalValue)"
        />
        <ui-stat-card label="Unidades en stock" icon="cube" tone="primary" [value]="v.totalUnits" />
        <ui-stat-card label="Categorías" icon="tag" tone="info" [value]="v.categories.length" />
      </section>

      @if (chart().length) {
        <section class="ui-card mb no-print">
          <h2 class="ui-card__title">Distribución del valor</h2>
          <ui-donut-chart
            [data]="chart()"
            [valueFormat]="cop"
            ariaLabel="Valor del inventario por categoría"
          />
        </section>
      }

      <ui-printable-sheet
        [institutionName]="branding.schoolName()"
        [logoUrl]="branding.logoUrl()"
        documentTitle="Valoración del inventario"
        [issuedAt]="today"
      >
        @if (v.categories.length) {
          <table class="simple-table">
            <caption class="sr-only">
              Valoración por categoría
            </caption>
            <thead>
              <tr>
                <th scope="col">Categoría</th>
                <th scope="col" class="num">Ítems</th>
                <th scope="col" class="num">Unidades</th>
                <th scope="col" class="num">Valor</th>
              </tr>
            </thead>
            <tbody>
              @for (c of v.categories; track c.categoryId) {
                <tr>
                  <td>{{ c.categoryName }}</td>
                  <td class="num">{{ c.items }}</td>
                  <td class="num">{{ c.units }}</td>
                  <td class="num">{{ cop(c.value) }}</td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr>
                <td>TOTAL</td>
                <td class="num"></td>
                <td class="num">{{ v.totalUnits }}</td>
                <td class="num">{{ cop(v.totalValue) }}</td>
              </tr>
            </tfoot>
          </table>
        } @else {
          <ui-empty-state icon="cube" title="No hay ítems activos con stock" />
        }
      </ui-printable-sheet>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .mb {
      margin-bottom: var(--space-6);
    }
    .simple-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm);
    }
    .simple-table th,
    .simple-table td {
      padding: 0.55rem 0.75rem;
      border-bottom: 1px solid var(--color-border-soft);
      text-align: left;
    }
    .simple-table th {
      font-size: var(--text-xs);
      text-transform: uppercase;
      color: var(--color-text-muted);
    }
    .simple-table .num {
      text-align: right;
      font-family: var(--font-mono);
    }
    .simple-table tfoot td {
      font-weight: 700;
      border-top: 2px solid var(--color-border);
    }
  `,
})
export class ValuationPage {
  private readonly inventory = inject(InventoryService);
  protected readonly branding = inject(BrandingService);
  protected readonly cop = formatCop;
  protected readonly today = new Date().toLocaleDateString('es-CO');

  protected readonly valuation = rxResource({ stream: () => this.inventory.valuation() });
  protected readonly data = computed(() => resourceValue(this.valuation, null));
  protected readonly chart = computed<ChartDatum[]>(() =>
    (this.data()?.categories ?? [])
      .filter((c) => c.value > 0)
      .map((c) => ({ label: c.categoryName, value: c.value })),
  );
}
