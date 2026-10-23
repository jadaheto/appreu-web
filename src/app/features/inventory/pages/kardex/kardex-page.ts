import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
  formatCop,
  formatDateEs,
  PageChange,
  TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiPagination,
  UiSpinner,
  UiStatCard,
  BadgeTone,
} from '../../../../shared/ui';
import { ItemFormDialog } from '../../components/item-form-dialog';
import { StockMovementDialog } from '../../components/stock-movement-dialog';
import {
  INVENTORY_BASE,
  ManualMovementType,
  MOVEMENT_LABELS,
  STOCK_STATUS_LABELS,
  STOCK_STATUS_TONES,
  StockMovement,
  StockMovementType,
} from '../../data-access/inventory.models';
import { InventoryService } from '../../data-access/inventory.service';
import { resourceValue } from '../../../../core/resource/resource-value';

const MOVEMENT_TONES: Record<StockMovementType, 'info' | 'success' | 'danger' | 'warning'> = {
  inicial: 'info',
  entrada: 'success',
  salida: 'danger',
  ajuste: 'warning',
};

/** Kárdex de un ítem: historial de movimientos con saldo y costo. */
@Component({
  selector: 'app-kardex-page',
  imports: [
    RouterLink,
    ItemFormDialog,
    StockMovementDialog,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiPagination,
    UiSpinner,
    UiStatCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kardex-page.html',
  styleUrls: ['../inventory-page.scss'],
})
export class KardexPage {
  private readonly inventory = inject(InventoryService);

  protected readonly base = INVENTORY_BASE;
  protected readonly cop = formatCop;
  protected readonly statusLabels: Readonly<Record<string, string>> = STOCK_STATUS_LABELS;
  protected readonly statusTones: Readonly<Record<string, BadgeTone>> = STOCK_STATUS_TONES;
  protected readonly movementLabels: Readonly<Record<string, string>> = MOVEMENT_LABELS;
  protected readonly movementTones: Readonly<Record<string, BadgeTone>> = MOVEMENT_TONES;

  private readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((p) => Number(p.get('id')) || undefined)),
  );
  protected readonly paging = signal({ page: 1, pageSize: 20 });
  protected readonly item = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.inventory.item(params),
  });
  protected readonly data = computed(() => resourceValue(this.item, null));
  protected readonly movements = rxResource({
    params: () => {
      const id = this.id();
      return id ? { id, ...this.paging() } : undefined;
    },
    stream: ({ params }) => this.inventory.movements(params.id, params),
  });
  protected readonly page = computed(() => resourceValue(this.movements, null));
  protected readonly categories = rxResource({ stream: () => this.inventory.categories() });
  protected readonly categoryList = computed(() => resourceValue(this.categories, []));

  protected readonly columns: TableColumn<StockMovement>[] = [
    { key: 'createdAt', header: 'Fecha', format: (v) => formatDateEs(v as string, 'datetime') },
    { key: 'type', header: 'Tipo' },
    { key: 'quantity', header: 'Cantidad', align: 'end' },
    { key: 'balanceAfter', header: 'Saldo', align: 'end', mono: true },
    {
      key: 'unitCost',
      header: 'Costo unit.',
      align: 'end',
      mono: true,
      hideBelow: 'md',
      format: (v) => formatCop(v as number),
    },
    {
      key: 'totalCost',
      header: 'Costo total',
      align: 'end',
      mono: true,
      hideBelow: 'md',
      format: (v) => formatCop(v as number),
    },
    { key: 'reason', header: 'Motivo / referencia', hideBelow: 'sm' },
  ];

  protected readonly moveOpen = signal(false);
  protected readonly moveType = signal<ManualMovementType>('entrada');
  protected readonly editOpen = signal(false);

  protected openMove(type: ManualMovementType): void {
    this.moveType.set(type);
    this.moveOpen.set(true);
  }

  protected onPage(change: PageChange): void {
    this.paging.set({ page: change.page, pageSize: change.pageSize });
  }

  protected refresh(): void {
    this.item.reload();
    // Un objeto nuevo de paginación ya vuelve a consultar el kárdex (desde la página 1);
    // llamar además a `movements.reload()` disparaba una petición duplicada.
    this.paging.update((p) => ({ ...p, page: 1 }));
  }
}
