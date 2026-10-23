import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  input,
  model,
  output,
  TemplateRef,
} from '@angular/core';
import { UiButton } from '../../atoms/button/button';
import { UiCheckbox } from '../../atoms/checkbox/checkbox';
import { UiIcon } from '../../atoms/icon/icon';
import { UiSpinner } from '../../atoms/spinner/spinner';
import { UiEmptyState } from '../../molecules/empty-state/empty-state';
import { CellContext, UiCellDef } from './cell-def.directive';
import { SortState, TableAction, TableActionEvent, TableColumn } from './data-table.models';

export function readCell<T>(row: T, column: TableColumn<T>): unknown {
  return column.value ? column.value(row) : (row as Record<string, unknown>)[column.key];
}

export function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined || a === '') return 1;
  if (b === null || b === undefined || b === '') return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' });
}

/**
 * Tabla de datos genérica (`.apreu-table`): columnas configurables, celdas
 * personalizadas (`uiCell`), ordenamiento (cliente o servidor), selección
 * múltiple, acciones por fila, estado de carga y vacío. La paginación se
 * proyecta en el pie con `<ui-pagination uiTableFooter />`.
 */
@Component({
  selector: 'ui-data-table',
  imports: [NgTemplateOutlet, UiButton, UiCheckbox, UiIcon, UiSpinner, UiEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
})
export class UiDataTable<T = any> {
  readonly columns = input.required<readonly TableColumn<T>[]>();
  readonly rows = input<readonly T[]>([]);
  /** Propiedad o función que identifica cada fila (selección y `track`). */
  readonly trackBy = input<string | ((row: T) => unknown)>('id');
  readonly loading = input(false, { transform: booleanAttribute });
  readonly selectable = input(false, { transform: booleanAttribute });
  readonly actions = input<readonly TableAction<T>[]>([]);
  /** `client`: la tabla ordena `rows`; `server`: solo emite `sort`. */
  readonly sortMode = input<'client' | 'server'>('client');
  readonly sort = model<SortState | null>(null);
  readonly selection = model<readonly T[]>([]);
  readonly caption = input('');
  readonly emptyTitle = input('No hay registros');
  readonly emptyMessage = input('');
  readonly emptyIcon = input('inbox');
  readonly rowClickable = input(false, { transform: booleanAttribute });
  /** Clase CSS adicional por fila (p. ej. `is-muted` para inactivos). */
  readonly rowClass = input<((row: T) => string | null) | null>(null);

  readonly action = output<TableActionEvent<T>>();
  readonly rowClick = output<T>();

  private readonly cellDefs = contentChildren(UiCellDef);
  protected readonly templates = computed(() => {
    const map = new Map<string, TemplateRef<CellContext<T>>>();
    for (const def of this.cellDefs())
      map.set(def.key(), def.template as TemplateRef<CellContext<T>>);
    return map;
  });

  protected readonly displayRows = computed(() => {
    const rows = this.rows();
    const sort = this.sort();
    if (!sort || this.sortMode() === 'server') return rows;
    const column = this.columns().find((c) => c.key === sort.key);
    if (!column) return rows;
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort(
      (a, b) => factor * compareValues(readCell(a, column), readCell(b, column)),
    );
  });

  protected readonly selectedKeys = computed(
    () => new Set(this.selection().map((r) => this.keyOf(r))),
  );
  protected readonly allSelected = computed(
    () =>
      this.rows().length > 0 && this.rows().every((r) => this.selectedKeys().has(this.keyOf(r))),
  );
  protected readonly someSelected = computed(
    () => this.selection().length > 0 && !this.allSelected(),
  );
  protected readonly colspan = computed(
    () => this.columns().length + (this.selectable() ? 1 : 0) + (this.actions().length ? 1 : 0),
  );

  keyOf(row: T): unknown {
    const track = this.trackBy();
    return typeof track === 'function' ? track(row) : (row as Record<string, unknown>)[track];
  }

  protected cellValue(row: T, column: TableColumn<T>): unknown {
    return readCell(row, column);
  }

  protected cellText(row: T, column: TableColumn<T>): string {
    const value = readCell(row, column);
    if (column.format) return column.format(value, row);
    return value === null || value === undefined || value === '' ? '—' : String(value);
  }

  protected ariaSort(column: TableColumn<T>): string | null {
    if (!column.sortable) return null;
    const sort = this.sort();
    if (sort?.key !== column.key) return 'none';
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }

  protected toggleSort(column: TableColumn<T>): void {
    if (!column.sortable) return;
    const current = this.sort();
    if (current?.key !== column.key) this.sort.set({ key: column.key, direction: 'asc' });
    else if (current.direction === 'asc') this.sort.set({ key: column.key, direction: 'desc' });
    else this.sort.set(null);
  }

  protected isSelected(row: T): boolean {
    return this.selectedKeys().has(this.keyOf(row));
  }

  protected toggleRow(row: T, checked: boolean): void {
    const key = this.keyOf(row);
    const rest = this.selection().filter((r) => this.keyOf(r) !== key);
    this.selection.set(checked ? [...rest, row] : rest);
  }

  protected toggleAll(checked: boolean): void {
    this.selection.set(checked ? [...this.rows()] : []);
  }

  protected visibleActions(row: T): TableAction<T>[] {
    return this.actions().filter((a) => !a.hidden?.(row));
  }

  protected onRowClick(row: T, event: Event): void {
    if (!this.rowClickable()) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, label, select')) return;
    this.rowClick.emit(row);
  }
}
