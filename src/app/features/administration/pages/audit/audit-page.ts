import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { roleLabel } from '../../../../core';
import {
  DateEsPipe,
  DateRange,
  isRangeValid,
  PageChange,
  SelectOption,
  TableColumn,
  UiBadge,
  UiCellDef,
  UiDataTable,
  UiDateRange,
  UiFilterBar,
  UiFormField,
  UiInput,
  UiPagination,
  UiSearchBox,
  UiSelect,
} from '../../../../shared/ui';
import { AccessLogQuery, AccessLogRecord } from '../../data-access/administration.models';
import { UsersService } from '../../data-access/users.service';
import { resourceValue } from '../../../../core/resource/resource-value';

type AllowedFilter = 'all' | 'allowed' | 'denied';

/** `/admin/auditoria`: registro de accesos con filtros por texto, módulo, resultado, usuario y fechas. */
@Component({
  selector: 'app-audit-page',
  imports: [
    FormsModule,
    DateEsPipe,
    UiBadge,
    UiCellDef,
    UiDataTable,
    UiDateRange,
    UiFilterBar,
    UiFormField,
    UiInput,
    UiPagination,
    UiSearchBox,
    UiSelect,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './audit-page.html',
  styleUrl: '../admin.scss',
})
export class AuditPage {
  /** Lectura segura de los resources en la plantilla (no lanza en estado de error). */
  protected readonly val = resourceValue;
  private readonly users = inject(UsersService);

  protected readonly query = signal<AccessLogQuery>({ page: 1, pageSize: 50 });
  protected readonly result = rxResource({
    params: () => this.query(),
    stream: ({ params }) => this.users.accessLog(params),
  });

  protected search = '';
  protected module = '';
  protected userId: number | null = null;
  protected allowed: AllowedFilter = 'all';
  protected range: DateRange = { from: null, to: null };
  protected readonly rangeError = signal(false);
  protected readonly allowedOptions: SelectOption<AllowedFilter>[] = [
    { value: 'all', label: 'Todos' },
    { value: 'allowed', label: 'Permitidos' },
    { value: 'denied', label: 'Denegados' },
  ];
  protected readonly hasFilters = computed(() => {
    const q = this.query();
    return !!(
      q.search ||
      q.module ||
      q.userId ||
      q.from ||
      q.to ||
      (q.allowed !== null && q.allowed !== undefined)
    );
  });

  protected readonly columns: TableColumn<AccessLogRecord>[] = [
    { key: 'createdAt', header: 'Fecha y hora', width: '10rem' },
    { key: 'userName', header: 'Usuario' },
    { key: 'role', header: 'Rol', hideBelow: 'md', width: '8rem' },
    { key: 'module', header: 'Módulo', width: '8rem' },
    { key: 'path', header: 'Ruta', hideBelow: 'lg' },
    { key: 'allowed', header: 'Resultado', width: '8rem' },
    { key: 'ipAddress', header: 'IP', mono: true, hideBelow: 'lg', width: '8rem' },
  ];
  protected readonly roleLabel = roleLabel;
  protected readonly rowClass = (r: AccessLogRecord) => (r.allowed ? null : 'is-denied');

  protected apply(): void {
    if (!isRangeValid(this.range)) {
      this.rangeError.set(true);
      return;
    }
    this.rangeError.set(false);
    this.query.set({
      page: 1,
      pageSize: this.query().pageSize,
      search: this.search.trim() || null,
      module: this.module.trim() || null,
      userId: this.userId && this.userId > 0 ? this.userId : null,
      allowed: this.allowed === 'all' ? null : this.allowed === 'allowed',
      from: this.range.from,
      to: this.range.to,
    });
  }

  protected clear(): void {
    this.search = '';
    this.module = '';
    this.userId = null;
    this.allowed = 'all';
    this.range = { from: null, to: null };
    this.apply();
  }

  protected changePage(change: PageChange): void {
    this.query.update((q) => ({ ...q, page: change.page, pageSize: change.pageSize }));
  }

  /** Filtra rápidamente por el usuario de una fila. */
  protected filterByUser(row: AccessLogRecord): void {
    this.userId = row.userId;
    this.apply();
  }
}
