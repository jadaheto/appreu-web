import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import {
  formatCop,
  TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiIcon,
  UiInput,
  UiStatCard,
  BadgeTone,
} from '../../../../shared/ui';
import { FormsModule } from '@angular/forms';
import { DayPipe } from '../../components/day.pipe';
import { JournalEntry } from '../../data-access/accounting.models';
import {
  ACCOUNTING_BASE,
  currentMonth,
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_TONES,
  entryDocument,
} from '../../data-access/accounting.labels';
import { AccountingService } from '../../data-access/accounting.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** Dashboard contable: KPIs del mes, últimos asientos, periodo actual y accesos rápidos. */
@Component({
  selector: 'app-accounting-dashboard-page',
  imports: [
    FormsModule,
    RouterLink,
    DayPipe,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiIcon,
    UiInput,
    UiStatCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './accounting-dashboard-page.html',
  styleUrls: ['../accounting-page.scss', './accounting-dashboard-page.scss'],
})
export class AccountingDashboardPage {
  private readonly accounting = inject(AccountingService);
  private readonly router = inject(Router);

  protected readonly base = ACCOUNTING_BASE;
  protected readonly month = signal(currentMonth());
  protected readonly dashboard = rxResource({
    params: () => this.month(),
    stream: ({ params }) => this.accounting.dashboard(params),
  });
  protected readonly data = computed(() => resourceValue(this.dashboard, null));
  protected readonly cop = formatCop;
  protected readonly statusLabels: Readonly<Record<string, string>> = ENTRY_STATUS_LABELS;
  protected readonly statusTones: Readonly<Record<string, BadgeTone>> = ENTRY_STATUS_TONES;

  protected readonly columns: TableColumn<JournalEntry>[] = [
    { key: 'date', header: 'Fecha', width: '7.5rem' },
    { key: 'doc', header: 'Documento', mono: true, value: (e) => entryDocument(e) },
    { key: 'description', header: 'Descripción', hideBelow: 'md' },
    {
      key: 'totalDebit',
      header: 'Débito',
      align: 'end',
      mono: true,
      format: (v) => formatCop(v as number),
    },
    { key: 'status', header: 'Estado' },
  ];

  protected readonly shortcuts = [
    {
      label: 'Recibo de caja',
      icon: 'banknotes',
      link: `${ACCOUNTING_BASE}/asientos/nuevo`,
      query: { tipo: 'RC' },
    },
    {
      label: 'Comprobante de egreso',
      icon: 'wallet',
      link: `${ACCOUNTING_BASE}/asientos/nuevo`,
      query: { tipo: 'CE' },
    },
    {
      label: 'Factura de compra',
      icon: 'document-text',
      link: `${ACCOUNTING_BASE}/asientos/nuevo`,
      query: { tipo: 'FC' },
    },
    {
      label: 'Balance de prueba',
      icon: 'calculator',
      link: `${ACCOUNTING_BASE}/reportes/balance-prueba`,
      query: {},
    },
    {
      label: 'Estado de resultados',
      icon: 'chart-bar',
      link: `${ACCOUNTING_BASE}/reportes/resultados`,
      query: {},
    },
  ];

  protected readonly rowClass = (e: JournalEntry) => (e.status === 'voided' ? 'is-voided' : null);

  protected onMonth(value: string | number | null): void {
    if (typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)) this.month.set(value);
  }

  protected open(entry: JournalEntry): void {
    void this.router.navigate([ACCOUNTING_BASE, 'asientos', entry.id]);
  }
}
