import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  DateRange,
  formatCop,
  formatDateEs,
  PageChange,
  SelectOption,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiAlert,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiDateRange,
  UiFilterBar,
  UiPagination,
  UiSearchBox,
  UiSelect,
  UiStatCard,
} from '../../../../shared/ui';
import { CufeChip, DocumentStatusBadge } from '../../components/e-invoicing-ui';
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
  DocumentCounts,
  DocumentFilters,
  DocumentStatus,
  DocumentSummary,
  DocumentType,
} from '../../data-access/e-invoicing.models';
import { EInvoicingService } from '../../data-access/e-invoicing.service';
import { resourceValue } from '../../../../core/resource/resource-value';

const sumStatuses = (
  counts: DocumentCounts | undefined,
  statuses: DocumentStatus[],
  types = DOCUMENT_TYPES,
) =>
  types.reduce(
    (total, t) => total + statuses.reduce((s, st) => s + (counts?.[t]?.[st] ?? 0), 0),
    0,
  );

/** Dashboard de facturación: KPIs (`/documents/stats`) y listado filtrable de documentos. */
@Component({
  selector: 'app-e-invoicing-documents-page',
  imports: [
    FormsModule,
    RouterLink,
    UiAlert,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiDateRange,
    UiFilterBar,
    UiPagination,
    UiSearchBox,
    UiSelect,
    UiStatCard,
    CufeChip,
    DocumentStatusBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './documents-page.html',
  styles: `
    .mb {
      margin-bottom: var(--space-6);
    }
    .customer small {
      display: block;
      color: var(--color-text-muted);
    }
  `,
})
export class DocumentsPage {
  /** Valor del recurso o `undefined` si carga o falló (ver `resourceValue`). */
  protected readonly val = resourceValue;
  private readonly service = inject(EInvoicingService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Borrador de filtros (se aplican con "Filtrar").
  protected readonly search = signal('');
  protected readonly type = signal<DocumentType | null>(null);
  protected readonly status = signal<DocumentStatus | null>(null);
  protected readonly range = signal<DateRange>({ from: null, to: null });

  protected readonly filters = signal<DocumentFilters>({ page: 1, pageSize: 20 });
  protected readonly hasFilters = computed(() => {
    const f = this.filters();
    return !!(f.search || f.type || f.status || f.from || f.to);
  });

  protected readonly documents = rxResource({
    params: () => this.filters(),
    stream: ({ params }) => this.service.list(params),
  });
  /** Rango aplicado; solo cambia (y recarga los KPIs) si cambian las fechas. */
  private readonly statsRange = computed(
    () => ({ from: this.filters().from ?? null, to: this.filters().to ?? null }),
    { equal: (a, b) => a.from === b.from && a.to === b.to },
  );
  protected readonly stats = rxResource({
    params: () => this.statsRange(),
    stream: ({ params }) => this.service.stats(params),
  });

  protected readonly kpis = computed(() => {
    const s = resourceValue(this.stats);
    if (!s) return null;
    const c = s.counts;
    const invoices = sumStatuses(c, [...DOCUMENT_STATUSES], ['fv']);
    return {
      acceptedTotal: formatCop(s.acceptedInvoicesTotal),
      invoices,
      accepted: sumStatuses(c, ['accepted', 'accepted_with_notices'], ['fv']),
      notes:
        sumStatuses(c, [...DOCUMENT_STATUSES], ['nc']) +
        ' NC · ' +
        sumStatuses(c, [...DOCUMENT_STATUSES], ['nd']) +
        ' ND',
      inProcess: sumStatuses(c, ['draft', 'signed', 'submitted']),
      problems: sumStatuses(c, ['rejected', 'send_error']),
    };
  });

  protected readonly typeOptions: SelectOption<DocumentType>[] = DOCUMENT_TYPES.map((t) => ({
    value: t,
    label: DOCUMENT_TYPE_LABELS[t],
  }));
  protected readonly statusOptions: SelectOption<DocumentStatus>[] = DOCUMENT_STATUSES.map((s) => ({
    value: s,
    label: DOCUMENT_STATUS_LABELS[s],
  }));

  protected readonly columns: TableColumn<DocumentSummary>[] = [
    { key: 'number', header: 'Número', mono: true },
    {
      key: 'type',
      header: 'Tipo',
      hideBelow: 'md',
      format: (v) => DOCUMENT_TYPE_LABELS[v as DocumentType] ?? String(v),
    },
    { key: 'issueDate', header: 'Fecha', format: (v) => formatDateEs(v as string) },
    { key: 'customerName', header: 'Adquiriente' },
    { key: 'cufe', header: 'CUFE / CUDE', hideBelow: 'lg' },
    {
      key: 'subtotal',
      header: 'Subtotal',
      align: 'end',
      mono: true,
      hideBelow: 'lg',
      format: (v) => formatCop(v as number),
    },
    {
      key: 'tax',
      header: 'IVA',
      align: 'end',
      mono: true,
      hideBelow: 'lg',
      format: (v) => formatCop(v as number),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'end',
      mono: true,
      format: (v) => formatCop(v as number),
    },
    { key: 'status', header: 'Estado DIAN' },
  ];
  protected readonly actions: TableAction<DocumentSummary>[] = [
    { id: 'view', label: 'Ver detalle', icon: 'eye' },
  ];

  protected applyFilters(): void {
    const range = this.range();
    this.filters.update((f) => ({
      ...f,
      page: 1,
      search: this.search().trim() || null,
      type: this.type(),
      status: this.status(),
      from: range.from,
      to: range.to,
    }));
  }

  protected clearFilters(): void {
    this.search.set('');
    this.type.set(null);
    this.status.set(null);
    this.range.set({ from: null, to: null });
    this.filters.set({ page: 1, pageSize: this.filters().pageSize });
  }

  protected onSearch(term: string): void {
    this.search.set(term);
    this.applyFilters();
  }

  protected onPage(change: PageChange): void {
    this.filters.update((f) => ({ ...f, page: change.page, pageSize: change.pageSize }));
  }

  protected open(row: DocumentSummary): void {
    void this.router.navigate(['documentos', row.id], { relativeTo: this.route });
  }

  protected onAction(event: TableActionEvent<DocumentSummary>): void {
    if (event.action === 'view') this.open(event.row);
  }
}
