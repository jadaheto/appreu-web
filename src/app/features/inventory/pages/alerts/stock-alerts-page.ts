import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  TableAction,
  TableActionEvent,
  TableColumn,
  UiAlert,
  UiButton,
  UiCellDef,
  UiDataTable,
} from '../../../../shared/ui';
import { StockMovementDialog } from '../../components/stock-movement-dialog';
import { INVENTORY_BASE, InventoryItem } from '../../data-access/inventory.models';
import { InventoryService } from '../../data-access/inventory.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** Alertas de stock: ítems agotados y por debajo del mínimo (calculadas por la API). */
@Component({
  selector: 'app-stock-alerts-page',
  imports: [StockMovementDialog, UiAlert, UiButton, UiCellDef, UiDataTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Alertas de stock</h1>
        <p class="page-header__subtitle">Ítems activos agotados o en el stock mínimo</p>
      </div>
      <button ui-button icon="arrows-up-down" (click)="alerts.reload()">Actualizar</button>
    </div>

    @if (alerts.error()) {
      <ui-alert tone="error" class="mb" title="No se pudieron cargar las alertas" />
    }

    <section class="ui-card mb" aria-labelledby="out-title">
      <h2 class="ui-card__title" id="out-title">
        Agotados ({{ data()?.outOfStock?.length ?? 0 }})
      </h2>
      <ui-data-table
        caption="Ítems agotados"
        [columns]="columns"
        [rows]="data()?.outOfStock ?? []"
        [actions]="actions"
        [loading]="alerts.isLoading()"
        emptyTitle="Ningún ítem agotado"
        emptyIcon="check-circle"
        (action)="onAction($event)"
      >
        <ng-template uiCell="stock" let-row>
          <span class="stock out">{{ row.stock }}</span> <span class="muted">{{ row.unit }}</span>
        </ng-template>
      </ui-data-table>
    </section>

    <section class="ui-card" aria-labelledby="low-title">
      <h2 class="ui-card__title" id="low-title">
        Stock bajo ({{ data()?.lowStock?.length ?? 0 }})
      </h2>
      <ui-data-table
        caption="Ítems con stock bajo"
        [columns]="columns"
        [rows]="data()?.lowStock ?? []"
        [actions]="actions"
        [loading]="alerts.isLoading()"
        emptyTitle="Ningún ítem con stock bajo"
        emptyIcon="check-circle"
        (action)="onAction($event)"
      >
        <ng-template uiCell="stock" let-row>
          <span class="stock low">{{ row.stock }}</span> <span class="muted">{{ row.unit }}</span>
        </ng-template>
      </ui-data-table>
    </section>

    <app-stock-movement-dialog
      [(open)]="moveOpen"
      [item]="moving()"
      initialType="entrada"
      (saved)="alerts.reload()"
    />
  `,
  styleUrls: ['../inventory-page.scss'],
})
export class StockAlertsPage {
  private readonly inventory = inject(InventoryService);
  private readonly router = inject(Router);

  protected readonly alerts = rxResource({ stream: () => this.inventory.alerts() });
  protected readonly data = computed(() => resourceValue(this.alerts, null));

  protected readonly columns: TableColumn<InventoryItem>[] = [
    { key: 'sku', header: 'SKU', mono: true, hideBelow: 'sm' },
    { key: 'name', header: 'Ítem' },
    { key: 'categoryName', header: 'Categoría', hideBelow: 'md' },
    { key: 'stock', header: 'Stock', align: 'end' },
    { key: 'minStock', header: 'Mínimo', align: 'end', mono: true },
    { key: 'location', header: 'Ubicación', hideBelow: 'lg' },
  ];
  protected readonly actions: TableAction<InventoryItem>[] = [
    { id: 'move', label: 'Registrar entrada', icon: 'arrow-up' },
    { id: 'kardex', label: 'Ver kárdex', icon: 'clipboard' },
  ];

  protected readonly moveOpen = signal(false);
  protected readonly moving = signal<InventoryItem | null>(null);

  protected onAction(event: TableActionEvent<InventoryItem>): void {
    if (event.action === 'kardex') {
      void this.router.navigate([INVENTORY_BASE, 'items', event.row.id, 'movimientos']);
      return;
    }
    this.moving.set(event.row);
    this.moveOpen.set(true);
  }
}
