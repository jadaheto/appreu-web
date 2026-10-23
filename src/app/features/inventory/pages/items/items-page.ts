import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ConfirmService, ToastService } from '../../../../core';
import {
  formatCop,
  PageChange,
  SelectOption,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiCheckbox,
  UiDataTable,
  UiFilterBar,
  UiPagination,
  UiSearchBox,
  UiSelect,
  UiStatCard,
  BadgeTone,
} from '../../../../shared/ui';
import { ItemFormDialog } from '../../components/item-form-dialog';
import { notifyError } from '../../components/notify-error';
import { StockMovementDialog } from '../../components/stock-movement-dialog';
import {
  INVENTORY_BASE,
  InventoryItem,
  ItemFilters,
  ManualMovementType,
  STOCK_STATUS_LABELS,
  STOCK_STATUS_TONES,
  StockAlertFilter,
} from '../../data-access/inventory.models';
import { InventoryService } from '../../data-access/inventory.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** Inventario: KPIs, listado filtrable y gestión de ítems y movimientos. */
@Component({
  selector: 'app-items-page',
  imports: [
    FormsModule,
    ItemFormDialog,
    StockMovementDialog,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiCheckbox,
    UiDataTable,
    UiFilterBar,
    UiPagination,
    UiSearchBox,
    UiSelect,
    UiStatCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './items-page.html',
  styleUrls: ['../inventory-page.scss'],
})
export class ItemsPage {
  private readonly inventory = inject(InventoryService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly cop = formatCop;
  protected readonly statusLabels: Readonly<Record<string, string>> = STOCK_STATUS_LABELS;
  protected readonly statusTones: Readonly<Record<string, BadgeTone>> = STOCK_STATUS_TONES;

  // Borrador de filtros
  protected readonly search = signal('');
  protected readonly categoryId = signal<number | null>(null);
  protected readonly alert = signal<StockAlertFilter | null>(
    this.parseAlert(inject(ActivatedRoute).snapshot.queryParamMap.get('alerta')),
  );
  protected readonly includeInactive = signal(false);

  protected readonly filters = signal<ItemFilters>({ page: 1, pageSize: 20, alert: this.alert() });
  protected readonly result = rxResource({
    params: () => this.filters(),
    stream: ({ params }) => this.inventory.items(params),
  });
  protected readonly page = computed(() => resourceValue(this.result, null));
  protected readonly kpis = rxResource({ stream: () => this.inventory.kpis() });
  protected readonly kpi = computed(() => resourceValue(this.kpis, null));
  protected readonly categories = rxResource({ stream: () => this.inventory.categories() });
  protected readonly categoryList = computed(() => resourceValue(this.categories, []));
  protected readonly categoryOptions = computed<SelectOption<number>[]>(() =>
    this.categoryList().map((c) => ({ value: c.id, label: c.name })),
  );
  protected readonly alertOptions: SelectOption<StockAlertFilter>[] = [
    { value: 'any', label: 'Con alerta (stock ≤ mínimo)' },
    { value: 'low', label: 'Stock bajo' },
    { value: 'out', label: 'Sin stock' },
  ];
  protected readonly hasFilters = computed(() => {
    const f = this.filters();
    return !!f.search || !!f.categoryId || !!f.alert || !!f.includeInactive;
  });

  protected readonly columns: TableColumn<InventoryItem>[] = [
    { key: 'sku', header: 'SKU', mono: true, sortable: true, hideBelow: 'sm' },
    { key: 'name', header: 'Ítem', sortable: true },
    { key: 'categoryName', header: 'Categoría', hideBelow: 'lg' },
    {
      key: 'unitCost',
      header: 'Costo',
      align: 'end',
      mono: true,
      hideBelow: 'lg',
      format: (v) => formatCop(v as number),
    },
    {
      key: 'salePrice',
      header: 'P. venta',
      align: 'end',
      mono: true,
      hideBelow: 'lg',
      format: (v) => formatCop(v as number),
    },
    { key: 'stock', header: 'Stock', align: 'end', sortable: true },
    { key: 'minStock', header: 'Mínimo', align: 'end', mono: true, hideBelow: 'md' },
    {
      key: 'stockValue',
      header: 'Valor',
      align: 'end',
      mono: true,
      hideBelow: 'md',
      format: (v) => formatCop(v as number),
    },
    { key: 'stockStatus', header: 'Estado' },
  ];
  protected readonly actions: TableAction<InventoryItem>[] = [
    {
      id: 'move',
      label: 'Registrar movimiento',
      icon: 'arrows-up-down',
      hidden: (i) => !i.isActive,
    },
    { id: 'kardex', label: 'Ver kárdex', icon: 'clipboard' },
    { id: 'edit', label: 'Editar ítem', icon: 'pencil', hidden: (i) => !i.isActive },
    {
      id: 'deactivate',
      label: 'Desactivar ítem',
      icon: 'trash',
      tone: 'danger',
      hidden: (i) => !i.isActive,
    },
  ];
  protected readonly rowClass = (i: InventoryItem) => (i.isActive ? null : 'is-muted');

  // Diálogos
  protected readonly itemOpen = signal(false);
  protected readonly editing = signal<InventoryItem | null>(null);
  protected readonly moveOpen = signal(false);
  protected readonly moving = signal<InventoryItem | null>(null);
  protected readonly moveType = signal<ManualMovementType>('entrada');

  protected apply(): void {
    this.filters.update((f) => ({
      ...f,
      page: 1,
      search: this.search().trim() || undefined,
      categoryId: this.categoryId(),
      alert: this.alert(),
      includeInactive: this.includeInactive() || undefined,
    }));
  }

  protected clear(): void {
    this.search.set('');
    this.categoryId.set(null);
    this.alert.set(null);
    this.includeInactive.set(false);
    this.apply();
  }

  protected filterAlert(alert: StockAlertFilter): void {
    this.alert.set(alert);
    this.apply();
  }

  protected onPage(change: PageChange): void {
    this.filters.update((f) => ({ ...f, page: change.page, pageSize: change.pageSize }));
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.itemOpen.set(true);
  }

  protected onAction(event: TableActionEvent<InventoryItem>): void {
    const item = event.row;
    switch (event.action) {
      case 'edit':
        this.editing.set(item);
        this.itemOpen.set(true);
        break;
      case 'move':
        this.moving.set(item);
        this.moveType.set('entrada');
        this.moveOpen.set(true);
        break;
      case 'kardex':
        void this.router.navigate([INVENTORY_BASE, 'items', item.id, 'movimientos']);
        break;
      case 'deactivate':
        void this.deactivate(item);
        break;
    }
  }

  protected refresh(): void {
    this.result.reload();
    this.kpis.reload();
  }

  private async deactivate(item: InventoryItem): Promise<void> {
    const ok = await this.confirm.ask({
      title: `¿Desactivar ${item.name}?`,
      message: 'El ítem deja de aparecer en el inventario activo. Su kárdex se conserva.',
      confirmLabel: 'Desactivar',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.inventory.deactivateItem(item.id));
      this.toast.success('Ítem desactivado.');
      this.refresh();
    } catch (e) {
      notifyError(this.toast, e);
    }
  }

  private parseAlert(value: string | null): StockAlertFilter | null {
    return value === 'any' || value === 'low' || value === 'out' ? value : null;
  }
}
