import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService, toApiError } from '../../../core';
import {
  BadgeTone,
  DateEsPipe,
  formatCop,
  TableColumn,
  UiAlert,
  UiBadge,
  UiBarChart,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiDonutChart,
  UiEmptyState,
  UiIcon,
  UiStatCard,
} from '../../../shared/ui';
import type { DebtorRow, DebtRisk, RecentPaymentRow } from '../data-access/dashboard.models';
import { DashboardService } from '../data-access/dashboard.service';
import { resourceValue } from '../../../core/resource/resource-value';

const RISK: Record<DebtRisk, { label: string; tone: BadgeTone }> = {
  low: { label: 'Bajo', tone: 'success' },
  medium: { label: 'Medio', tone: 'warning' },
  high: { label: 'Alto', tone: 'warning' },
  critical: { label: 'Crítico', tone: 'danger' },
};

const METHODS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  tarjeta: 'Tarjeta',
  datafono: 'Datáfono',
  pse: 'PSE',
  breb: 'Bre-B',
};

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/**
 * Inicio del portal administrativo (`GET /api/dashboard/admin`). La API decide
 * los widgets por rol: finanzas ve los financieros, RR. HH. personal e
 * incidencias, y admin/superadmin todos.
 */
@Component({
  selector: 'app-admin-dashboard-page',
  imports: [
    RouterLink,
    DateEsPipe,
    UiAlert,
    UiBadge,
    UiBarChart,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiDonutChart,
    UiEmptyState,
    UiIcon,
    UiStatCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-dashboard-page.html',
  styleUrl: './admin-dashboard-page.scss',
})
export class AdminDashboardPage {
  private readonly dashboard = inject(DashboardService);
  protected readonly auth = inject(AuthService);

  protected readonly summary = rxResource({ stream: () => this.dashboard.admin() });
  protected readonly data = computed(() => resourceValue(this.summary, null));
  protected readonly finance = computed(() => this.data()?.finance ?? null);
  protected readonly errorMessage = computed(() => {
    const err = this.summary.error();
    return err ? toApiError(err).message : null;
  });
  protected readonly firstName = computed(() => this.auth.user()?.name.split(' ')[0] ?? '');
  protected readonly cop = formatCop;
  protected readonly copFormatter = (v: number) => formatCop(v);

  protected readonly monthLabels = computed(() =>
    (this.finance()?.monthlyRevenue ?? []).map(
      (m) => m.label.charAt(0).toUpperCase() + m.label.slice(1),
    ),
  );
  protected readonly incomeSeries = computed(() => [
    { name: 'Ingresos', values: (this.finance()?.monthlyRevenue ?? []).map((m) => m.amount) },
  ]);
  protected readonly levels = computed(() =>
    (this.data()?.students.byLevel ?? []).map((l) => ({
      label: l.level.charAt(0).toUpperCase() + l.level.slice(1),
      value: l.total,
    })),
  );
  protected readonly ticketHint = computed(() => {
    const month = this.finance()?.averageTicket.month;
    if (!month) return 'Promedio del mes';
    const m = Number(month.slice(5, 7));
    return `Promedio de ${MONTHS[m - 1] ?? month} ${month.slice(0, 4)}`;
  });

  protected readonly paymentColumns: TableColumn<RecentPaymentRow>[] = [
    { key: 'receiptNumber', header: 'Recibo' },
    { key: 'studentName', header: 'Alumno' },
    { key: 'method', header: 'Método', hideBelow: 'md' },
    { key: 'amount', header: 'Monto', align: 'end' },
  ];
  protected readonly debtorColumns: TableColumn<DebtorRow>[] = [
    { key: 'studentName', header: 'Alumno' },
    { key: 'gradeName', header: 'Grado', hideBelow: 'md' },
    { key: 'risk', header: 'Riesgo' },
    { key: 'balance', header: 'Saldo', align: 'end' },
  ];

  protected riskLabel(risk: DebtRisk): string {
    return RISK[risk]?.label ?? risk;
  }
  protected riskTone(risk: DebtRisk): BadgeTone {
    return RISK[risk]?.tone ?? 'neutral';
  }
  protected methodLabel(method: string | null): string {
    if (!method) return '—';
    return METHODS[method] ?? method.charAt(0).toUpperCase() + method.slice(1);
  }
  /** Día `YYYY-MM-DD` del colegio a mediodía local (evita el corrimiento por zona horaria). */
  protected day(value: string): string {
    return `${value}T12:00:00`;
  }
  /** `YYYY-MM-DD HH:mm:ss` local → fecha legible. */
  protected paidDate(paidAt: string | null): string | null {
    return paidAt ? paidAt.replace(' ', 'T') : null;
  }
}
