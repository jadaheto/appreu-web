import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  formatCop,
  UiAlert,
  UiBadge,
  UiBarChart,
  UiButton,
  UiDonutChart,
  UiEmptyState,
  UiIcon,
  UiInput,
  UiStatCard,
  CopCurrencyPipe,
} from '../../../../shared/ui';
import {
  categoryLabel,
  currentMonth,
  errorMessage,
  formatDay,
  monthLabel,
} from '../../data-access/finance-labels';
import { FinanceService } from '../../data-access/finance.service';
import { resourceValue } from '../../../../core/resource/resource-value';

const INVOICE_STATUS: Record<
  string,
  { label: string; tone: 'success' | 'danger' | 'warning' | 'info' | 'neutral' }
> = {
  accepted: { label: 'Aceptada', tone: 'success' },
  accepted_with_notices: { label: 'Aceptada c/ notas', tone: 'success' },
  rejected: { label: 'Rechazada', tone: 'danger' },
  send_error: { label: 'Error de envío', tone: 'danger' },
  submitted: { label: 'Enviada', tone: 'info' },
  signed: { label: 'Firmada', tone: 'warning' },
  draft: { label: 'Borrador', tone: 'neutral' },
};

/** `/admin/finanzas` — KPIs del mes, cargos por categoría, gastos y últimas facturas. */
@Component({
  selector: 'app-finance-dashboard-page',
  imports: [
    FormsModule,
    RouterLink,
    UiAlert,
    UiBadge,
    UiBarChart,
    UiButton,
    UiDonutChart,
    UiEmptyState,
    UiIcon,
    UiInput,
    UiStatCard,
    CopCurrencyPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './finance-dashboard-page.html',
  styles: `
    .mb {
      margin-bottom: var(--space-6);
    }
    .month {
      width: 11rem;
    }
    .tiles {
      display: grid;
      gap: var(--space-3);
      grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
    }
    .tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 0.5rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-soft);
      background: var(--color-surface);
      color: var(--color-text);
      text-decoration: none;
      font-weight: 600;
      font-size: var(--text-sm);
      text-align: center;
    }
    .tile:hover,
    .tile:focus-visible {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
    .invoices {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .invoices li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 0.6rem 0;
      border-bottom: 1px solid var(--color-border-soft);
    }
    .invoices li:last-child {
      border-bottom: 0;
    }
    .right {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.25rem;
    }
  `,
})
export class FinanceDashboardPage {
  private readonly finance = inject(FinanceService);

  protected readonly month = signal(currentMonth());
  protected readonly data = rxResource({
    params: () => this.month() || currentMonth(),
    stream: ({ params }) => this.finance.dashboard(params),
  });
  protected readonly d = computed(() => resourceValue(this.data, null));
  protected readonly error = computed(() =>
    this.data.error() ? errorMessage(this.data.error()) : null,
  );

  protected readonly cop = formatCop;
  protected readonly copFormatter = (v: number) => formatCop(v);
  protected readonly fmtDay = formatDay;
  protected readonly monthName = computed(() => monthLabel(this.d()?.month ?? this.month()));

  protected readonly categoryLabels = computed(() =>
    (this.d()?.chargesByCategory ?? []).map((c) => categoryLabel(c.category)),
  );
  protected readonly categorySeries = computed(() => [
    { name: 'Cargos', values: (this.d()?.chargesByCategory ?? []).map((c) => c.total) },
  ]);
  protected readonly expenseData = computed(() =>
    (this.d()?.topExpenseCategories ?? []).map((c) => ({ label: c.category, value: c.total })),
  );

  protected readonly tiles = [
    { label: 'Caja', icon: 'banknotes', link: 'caja' },
    { label: 'Estado de cuenta', icon: 'user', link: 'estado-cuenta' },
    { label: 'Generar cobros', icon: 'document-text', link: 'cobros' },
    { label: 'Control de cartera', icon: 'exclamation-triangle', link: 'cartera' },
    { label: 'Conciliación', icon: 'check-circle', link: 'conciliacion' },
    { label: 'Archivos bancarios', icon: 'download', link: 'archivos-bancarios' },
    { label: 'Facturación DIAN', icon: 'document-check', link: '/admin/facturacion' },
  ];

  protected invoiceStatus(status: string) {
    return INVOICE_STATUS[status] ?? { label: status, tone: 'neutral' as const };
  }

  protected setMonth(value: string | number | null): void {
    if (typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)) this.month.set(value);
  }
}
