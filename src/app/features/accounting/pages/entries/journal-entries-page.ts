import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  formatCop,
  PageChange,
  SelectOption,
  TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiFilterBar,
  UiFormField,
  UiInput,
  UiPagination,
  UiSelect,
  BadgeTone,
} from '../../../../shared/ui';
import { DayPipe } from '../../components/day.pipe';
import {
  JournalEntry,
  JournalEntryFilters,
  JournalEntryStatus,
  VoucherType,
} from '../../data-access/accounting.models';
import {
  ACCOUNTING_BASE,
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_OPTIONS,
  ENTRY_STATUS_TONES,
  entryDocument,
  monthRange,
  VOUCHER_TYPE_OPTIONS,
} from '../../data-access/accounting.labels';
import { AccountingService } from '../../data-access/accounting.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** Listado de comprobantes con filtros por rango, tipo y estado. */
@Component({
  selector: 'app-journal-entries-page',
  imports: [
    FormsModule,
    RouterLink,
    DayPipe,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiFilterBar,
    UiFormField,
    UiInput,
    UiPagination,
    UiSelect,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journal-entries-page.html',
  styleUrls: ['../accounting-page.scss'],
})
export class JournalEntriesPage {
  private readonly accounting = inject(AccountingService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly base = ACCOUNTING_BASE;
  private readonly defaults = monthRange();

  // Borrador de filtros (lo que el usuario edita) y filtros aplicados.
  protected readonly from = signal<string>(
    this.route.snapshot.queryParamMap.get('desde') ?? this.defaults.from,
  );
  protected readonly to = signal<string>(
    this.route.snapshot.queryParamMap.get('hasta') ?? this.defaults.to,
  );
  protected readonly type = signal<VoucherType | null>(null);
  protected readonly status = signal<JournalEntryStatus | null>(null);

  protected readonly filters = signal<JournalEntryFilters>({
    from: this.from(),
    to: this.to(),
    page: 1,
    pageSize: 20,
  });
  protected readonly result = rxResource({
    params: () => this.filters(),
    stream: ({ params }) => this.accounting.journalEntries(params),
  });
  protected readonly page = computed(() => resourceValue(this.result, null));
  protected readonly rangeInvalid = computed(
    () => !!this.from() && !!this.to() && this.from() > this.to(),
  );

  protected readonly typeOptions: SelectOption<VoucherType>[] = VOUCHER_TYPE_OPTIONS;
  protected readonly statusOptions = ENTRY_STATUS_OPTIONS;
  protected readonly statusLabels: Readonly<Record<string, string>> = ENTRY_STATUS_LABELS;
  protected readonly statusTones: Readonly<Record<string, BadgeTone>> = ENTRY_STATUS_TONES;

  protected readonly columns: TableColumn<JournalEntry>[] = [
    { key: 'date', header: 'Fecha', width: '7.5rem' },
    { key: 'doc', header: 'Documento', mono: true, value: (e) => entryDocument(e) },
    { key: 'description', header: 'Descripción', hideBelow: 'sm' },
    {
      key: 'totalDebit',
      header: 'Débito',
      align: 'end',
      mono: true,
      hideBelow: 'md',
      format: (v) => formatCop(v as number),
    },
    {
      key: 'totalCredit',
      header: 'Crédito',
      align: 'end',
      mono: true,
      hideBelow: 'md',
      format: (v) => formatCop(v as number),
    },
    { key: 'status', header: 'Estado' },
  ];
  protected readonly rowClass = (e: JournalEntry) => (e.status === 'voided' ? 'is-voided' : null);

  protected apply(): void {
    if (this.rangeInvalid()) return;
    this.filters.update((f) => ({
      ...f,
      page: 1,
      from: this.from() || null,
      to: this.to() || null,
      type: this.type(),
      status: this.status(),
    }));
  }

  protected clear(): void {
    this.from.set(this.defaults.from);
    this.to.set(this.defaults.to);
    this.type.set(null);
    this.status.set(null);
    this.apply();
  }

  protected onPage(change: PageChange): void {
    this.filters.update((f) => ({ ...f, page: change.page, pageSize: change.pageSize }));
  }

  protected open(entry: JournalEntry): void {
    void this.router.navigate([ACCOUNTING_BASE, 'asientos', entry.id]);
  }

  protected str(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }
}
