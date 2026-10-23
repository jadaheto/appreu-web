import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  DateEsPipe,
  formatCop,
  formatDateEs,
  TableColumn,
  UiAlert,
  UiBadge,
  UiCellDef,
  UiDataTable,
  UiMoneyText,
  UiStatCard,
} from '../../../../../shared/ui';
import {
  FinancialSummary,
  PaymentRecord,
  PendingCharge,
} from '../../../data-access/students.models';
import { StudentsService } from '../../../data-access/students.service';
import { resourceValue } from '../../../../../core/resource/resource-value';

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  applied: 'Confirmado',
  pending: 'En validación',
  reversed: 'Reversado',
};

/** Pestaña "Finanzas": totales, conceptos pendientes e historial de pagos (lectura). */
@Component({
  selector: 'app-student-finance-tab',
  imports: [DateEsPipe, UiAlert, UiBadge, UiCellDef, UiDataTable, UiMoneyText, UiStatCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let s = totals();
    <div class="grid grid--3">
      <ui-stat-card
        label="Total cargado"
        [value]="cop(s.charged)"
        icon="document-text"
        tone="primary"
      />
      <ui-stat-card label="Total pagado" [value]="cop(s.paid)" icon="check-circle" tone="success" />
      <ui-stat-card
        label="Saldo pendiente"
        [value]="cop(s.balance)"
        icon="banknotes"
        [tone]="s.balance > 0 ? 'danger' : 'success'"
        [hint]="s.overdueCount ? s.overdueCount + ' cargo(s) vencido(s)' : 'Al día'"
      />
    </div>
    @if (statement.error(); as err) {
      <ui-alert tone="error" class="gap">{{ err.message }}</ui-alert>
    }
    <h3 class="ui-card__title gap">Conceptos pendientes de pago</h3>
    <ui-data-table
      caption="Conceptos pendientes de pago"
      [columns]="chargeColumns"
      [rows]="detail()?.pendingCharges ?? []"
      [loading]="statement.isLoading()"
      trackBy="chargeId"
      emptyIcon="check-circle"
      emptyTitle="Sin conceptos pendientes"
    >
      <ng-template uiCell="dueDate" let-row>
        <span [class.overdue]="row.isOverdue">{{ row.dueDate + 'T12:00:00' | dateEs }}</span>
      </ng-template>
      <ng-template uiCell="pending" let-row>
        <ui-money-text [amount]="row.pending" />
      </ng-template>
      <ng-template uiCell="status" let-row>
        <ui-badge [status]="row.isOverdue ? 'overdue' : row.status" />
      </ng-template>
    </ui-data-table>
    <h3 class="ui-card__title gap">Historial de pagos</h3>
    <ui-data-table
      caption="Historial de pagos"
      [columns]="paymentColumns"
      [rows]="detail()?.payments ?? []"
      [loading]="statement.isLoading()"
      trackBy="paymentId"
      emptyIcon="banknotes"
      emptyTitle="Sin pagos registrados"
    >
      <ng-template uiCell="amount" let-row>
        <ui-money-text [amount]="row.amount" />
      </ng-template>
      <ng-template uiCell="status" let-row>
        <ui-badge [tone]="row.status === 'applied' ? 'success' : 'warning'">{{
          paymentStatus(row.status)
        }}</ui-badge>
      </ng-template>
    </ui-data-table>
  `,
  styles: `
    .gap {
      display: block;
      margin-top: 1.5rem;
    }
    .overdue {
      color: var(--color-danger);
      font-weight: 700;
    }
  `,
})
export class FinanceTab {
  private readonly students = inject(StudentsService);

  readonly studentId = input.required<number>();
  /** Totales ya cargados con la ficha (se reemplazan por los del estado de cuenta). */
  readonly summary = input<FinancialSummary | null>(null);

  protected readonly statement = rxResource({
    params: () => this.studentId(),
    stream: ({ params }) => this.students.financialSummary(params),
  });
  protected readonly detail = computed(() => resourceValue(this.statement, null));
  protected readonly totals = computed<FinancialSummary>(
    () =>
      this.detail()?.summary ??
      this.summary() ?? { charged: 0, paid: 0, balance: 0, overdueCount: 0 },
  );

  protected readonly chargeColumns: TableColumn<PendingCharge>[] = [
    {
      key: 'concept',
      header: 'Concepto',
      value: (r) => r.concept,
      format: (_, r) => (r.description ? `${r.concept} — ${r.description}` : r.concept),
    },
    { key: 'dueDate', header: 'Vencimiento' },
    {
      key: 'netAmount',
      header: 'Valor',
      align: 'end',
      mono: true,
      hideBelow: 'md',
      format: (v) => formatCop(v as number),
    },
    { key: 'pending', header: 'Pendiente', align: 'end' },
    { key: 'status', header: 'Estado' },
  ];
  protected readonly paymentColumns: TableColumn<PaymentRecord>[] = [
    { key: 'receiptNumber', header: 'Recibo', mono: true },
    { key: 'paidAt', header: 'Fecha', format: (v) => formatDateEs(v as string) },
    { key: 'method', header: 'Método', hideBelow: 'md' },
    {
      key: 'concepts',
      header: 'Conceptos',
      hideBelow: 'lg',
      format: (v) => (v as string[]).join(', ') || '—',
    },
    { key: 'amount', header: 'Monto', align: 'end' },
    { key: 'status', header: 'Estado' },
  ];

  protected paymentStatus(status: string): string {
    return PAYMENT_STATUS_LABELS[status] ?? status;
  }

  protected cop(value: number): string {
    return formatCop(value);
  }
}
