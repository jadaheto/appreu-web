import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CopCurrencyPipe,
  formatCop,
  formatDateEs,
  TableColumn,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiStatCard,
} from '../../../shared/ui';
import {
  CHARGE_STATUS_LABELS,
  CHARGE_STATUS_TONES,
  formatDay,
  methodLabel,
  monthLabel,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
} from '../data-access/finance-labels';
import type {
  AccountStatement,
  Charge,
  ChargeStatus,
  PaymentListItem,
  PaymentStatus,
} from '../data-access/finance.models';

/**
 * Estado de cuenta (KPIs, cobros y pagos) usado por el portal administrativo y
 * el portal del estudiante. `printBase` es la ruta bajo la que cuelgan
 * `recibos/:n` y `cobros/:id/documento`.
 */
@Component({
  selector: 'app-account-statement-view',
  imports: [RouterLink, CopCurrencyPipe, UiBadge, UiButton, UiCellDef, UiDataTable, UiStatCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let s = statement();
    <section class="kpis" aria-label="Resumen de la cuenta">
      <ui-stat-card
        label="Total cobrado"
        icon="document-text"
        tone="primary"
        [value]="cop(s.summary.totalCharged)"
        [hint]="s.summary.pendingCount + ' cobros pendientes'"
      />
      <ui-stat-card
        label="Total pagado"
        icon="check-circle"
        tone="success"
        [value]="cop(s.summary.totalPaid)"
        [hint]="s.summary.paidCount + ' cobros pagados'"
      />
      <ui-stat-card
        label="Saldo pendiente"
        icon="exclamation-triangle"
        [tone]="s.summary.balance > 0 ? 'danger' : 'success'"
        [value]="cop(s.summary.balance)"
        [hint]="'Vencido: ' + cop(s.summary.overdueBalance)"
      />
      <ui-stat-card
        label="Saldo a favor"
        icon="wallet"
        tone="info"
        [value]="cop(s.summary.creditBalance)"
        [hint]="'Saldo neto: ' + cop(s.summary.netBalance)"
      />
    </section>

    @if (showCharges()) {
      <section class="ui-card block" aria-labelledby="st-charges">
        <h2 class="ui-card__title" id="st-charges">Conceptos de cobro</h2>
        <ui-data-table
          [columns]="chargeColumns"
          [rows]="charges()"
          caption="Cobros del estudiante"
          emptyTitle="Sin cobros registrados"
        >
          <ng-template uiCell="description" let-row>
            {{ row.description }}
            <small class="text-muted">{{ month(row.period) }}</small>
          </ng-template>
          <ng-template uiCell="dueDate" let-row>
            <span [class.overdue]="row.isOverdue && row.pendingAmount > 0">{{
              day(row.dueDate)
            }}</span>
          </ng-template>
          <ng-template uiCell="pendingAmount" let-row>
            <span [class.overdue]="row.pendingAmount > 0">{{ row.pendingAmount | cop }}</span>
          </ng-template>
          <ng-template uiCell="status" let-row>
            <ui-badge [tone]="chargeTone(row)">{{ chargeLabel(row) }}</ui-badge>
          </ng-template>
          <ng-template uiCell="doc" let-row>
            <a
              ui-button
              size="sm"
              variant="ghost"
              iconOnly
              icon="printer"
              [routerLink]="[printBase(), 'cobros', row.id, 'documento']"
              [attr.aria-label]="'Cuenta de cobro de ' + row.description"
              title="Cuenta de cobro"
            ></a>
          </ng-template>
        </ui-data-table>
      </section>
    }

    @if (showPayments()) {
      <section class="ui-card block" aria-labelledby="st-payments">
        <h2 class="ui-card__title" id="st-payments">Historial de pagos</h2>
        <ui-data-table
          [columns]="paymentColumns"
          [rows]="s.payments"
          caption="Pagos del estudiante"
          emptyTitle="Sin pagos registrados"
        >
          <ng-template uiCell="concepts" let-row>
            {{ row.concepts.join(', ') || '—' }}
          </ng-template>
          <ng-template uiCell="status" let-row>
            <ui-badge [tone]="paymentTone(row.status)">{{ paymentLabel(row.status) }}</ui-badge>
          </ng-template>
          <ng-template uiCell="receipt" let-row>
            <a
              ui-button
              size="sm"
              variant="ghost"
              icon="printer"
              [routerLink]="[printBase(), 'recibos', row.receiptNumber]"
              [attr.aria-label]="'Ver recibo ' + row.receiptNumber"
              >Recibo</a
            >
          </ng-template>
        </ui-data-table>
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .kpis {
      display: grid;
      gap: var(--space-4);
      grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
      margin-bottom: var(--space-5);
    }
    .block {
      display: block;
      margin-bottom: var(--space-5);
    }
    small {
      display: block;
    }
    .overdue {
      color: var(--color-danger);
      font-weight: 700;
    }
  `,
})
export class AccountStatementView {
  readonly statement = input.required<AccountStatement>();
  readonly printBase = input.required<string>();
  readonly showCharges = input(true);
  readonly showPayments = input(true);

  protected readonly charges = computed(() =>
    [...this.statement().charges].sort((a, b) => b.dueDate.localeCompare(a.dueDate)),
  );
  protected readonly cop = formatCop;
  protected readonly day = formatDay;
  protected readonly month = monthLabel;

  protected readonly chargeColumns: TableColumn<Charge>[] = [
    { key: 'description', header: 'Concepto' },
    { key: 'dueDate', header: 'Vencimiento' },
    {
      key: 'amount',
      header: 'Valor',
      align: 'end',
      mono: true,
      hideBelow: 'lg',
      format: (v) => formatCop(v as number),
    },
    {
      key: 'discountAmount',
      header: 'Descuento',
      align: 'end',
      mono: true,
      hideBelow: 'lg',
      format: (v) => formatCop(v as number),
    },
    {
      key: 'netAmount',
      header: 'Neto',
      align: 'end',
      mono: true,
      format: (v) => formatCop(v as number),
    },
    {
      key: 'paidAmount',
      header: 'Pagado',
      align: 'end',
      mono: true,
      hideBelow: 'md',
      format: (v) => formatCop(v as number),
    },
    { key: 'pendingAmount', header: 'Pendiente', align: 'end', mono: true },
    { key: 'status', header: 'Estado' },
    { key: 'doc', header: 'Documento', align: 'end' },
  ];
  protected readonly paymentColumns: TableColumn<PaymentListItem>[] = [
    { key: 'receiptNumber', header: 'Recibo', mono: true },
    { key: 'paidAt', header: 'Fecha', format: (v) => formatDateEs(v as string) },
    { key: 'concepts', header: 'Conceptos', hideBelow: 'lg' },
    { key: 'method', header: 'Método', hideBelow: 'md', format: (v) => methodLabel(v as string) },
    {
      key: 'amount',
      header: 'Monto',
      align: 'end',
      mono: true,
      format: (v) => formatCop(v as number),
    },
    { key: 'status', header: 'Estado' },
    { key: 'receipt', header: 'Recibo', align: 'end' },
  ];

  protected chargeTone(c: Charge) {
    return c.isOverdue && c.pendingAmount > 0 ? 'danger' : CHARGE_STATUS_TONES[c.status];
  }
  protected chargeLabel(c: Charge): string {
    return c.isOverdue && c.pendingAmount > 0
      ? 'Vencido'
      : CHARGE_STATUS_LABELS[c.status as ChargeStatus];
  }
  protected paymentTone(s: PaymentStatus) {
    return PAYMENT_STATUS_TONES[s];
  }
  protected paymentLabel(s: PaymentStatus): string {
    return PAYMENT_STATUS_LABELS[s];
  }
}
