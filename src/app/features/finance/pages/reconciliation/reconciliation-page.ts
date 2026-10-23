import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmService, ToastService } from '../../../../core';
import {
  formatCop,
  formatDateEs,
  TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiInput,
  UiStatCard,
} from '../../../../shared/ui';
import {
  currentMonth,
  errorMessage,
  methodLabel,
  monthLabel,
} from '../../data-access/finance-labels';
import type { PaymentListItem } from '../../data-access/finance.models';
import { FinanceService } from '../../data-access/finance.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** `/admin/finanzas/conciliacion` — conciliación bancaria manual de los pagos del mes. */
@Component({
  selector: 'app-reconciliation-page',
  imports: [
    FormsModule,
    RouterLink,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiInput,
    UiStatCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Conciliación bancaria</h1>
        <p class="page-header__subtitle">Pagos de {{ monthName() }} frente al extracto bancario.</p>
      </div>
      <ui-input
        class="month"
        type="month"
        ariaLabel="Mes a conciliar"
        [ngModel]="month()"
        (ngModelChange)="setMonth($event)"
      />
    </div>

    @if (data.error()) {
      <ui-alert tone="error" class="mb">{{ error() }}</ui-alert>
    }

    <section class="grid grid--4 mb" aria-label="Resumen de conciliación">
      <ui-stat-card
        label="Total recaudos"
        icon="banknotes"
        tone="primary"
        [loading]="data.isLoading()"
        [value]="r() ? cop(r()!.total.amount) : null"
        [hint]="r() ? r()!.total.count + ' pagos' : ''"
      />
      <ui-stat-card
        label="Conciliados"
        icon="check-circle"
        tone="success"
        [loading]="data.isLoading()"
        [value]="r() ? cop(r()!.reconciled.amount) : null"
        [hint]="r() ? r()!.reconciled.count + ' pagos' : ''"
      />
      <ui-stat-card
        label="Pendientes"
        icon="clock"
        tone="warning"
        [loading]="data.isLoading()"
        [value]="r() ? cop(r()!.pending.amount) : null"
        [hint]="r() ? r()!.pending.count + ' pagos' : ''"
      />
      <ui-stat-card
        label="Por canal"
        icon="wallet"
        tone="info"
        [loading]="data.isLoading()"
        [value]="topMethod()"
        [hint]="methodsHint()"
      />
    </section>

    <ui-data-table
      [columns]="columns"
      [rows]="r()?.payments ?? []"
      [loading]="data.isLoading()"
      caption="Pagos del mes"
      emptyTitle="Sin pagos en el mes"
    >
      <ng-template uiCell="studentName" let-row>
        <strong>{{ row.studentName }}</strong>
        <small class="text-muted font-mono">{{ row.studentCode }}</small>
      </ng-template>
      <ng-template uiCell="receiptNumber" let-row>
        <a class="font-mono" [routerLink]="['../recibos', row.receiptNumber]">{{
          row.receiptNumber
        }}</a>
      </ng-template>
      <ng-template uiCell="reconciled" let-row>
        @if (row.reconciled) {
          <ui-badge tone="success">Conciliado</ui-badge>
        } @else {
          <ui-badge tone="warning">Pendiente</ui-badge>
        }
      </ng-template>
      <ng-template uiCell="bankRef" let-row>
        @if (row.reconciled) {
          <span class="ref">
            <span class="font-mono">{{ row.bankRef }}</span>
            <button
              ui-button
              size="xs"
              variant="ghost"
              icon="x-mark"
              [attr.aria-label]="'Revertir conciliación de ' + row.receiptNumber"
              (click)="unreconcile(row)"
            >
              Revertir
            </button>
          </span>
        } @else if (row.status !== 'reversed') {
          <form class="ref" (submit)="$event.preventDefault(); reconcile(row)">
            <ui-input
              [ariaLabel]="'Referencia bancaria de ' + row.receiptNumber"
              placeholder="Ref. banco"
              mono
              [maxlength]="100"
              [ngModel]="refOf(row.id)"
              (ngModelChange)="setRef(row.id, $event)"
              [ngModelOptions]="{ standalone: true }"
            />
            <button
              ui-button
              type="submit"
              size="sm"
              variant="success"
              iconOnly
              icon="check"
              [disabled]="!refOf(row.id).trim()"
              [loading]="busyId() === row.id"
              [attr.aria-label]="'Conciliar ' + row.receiptNumber"
            ></button>
          </form>
        } @else {
          <span class="text-muted">Anulado</span>
        }
      </ng-template>
    </ui-data-table>
  `,
  styles: `
    .mb {
      display: block;
      margin-bottom: var(--space-5);
    }
    .month {
      width: 11rem;
    }
    small {
      display: block;
    }
    .ref {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      min-width: 12rem;
    }
    .ref ui-input {
      flex: 1;
    }
  `,
})
export class ReconciliationPage {
  private readonly finance = inject(FinanceService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly month = signal(currentMonth());
  protected readonly data = rxResource({
    params: () => this.month(),
    stream: ({ params }) => this.finance.reconciliation(params),
  });
  protected readonly r = computed(() => resourceValue(this.data, null));
  protected readonly monthName = computed(() => monthLabel(this.month()));
  protected readonly refs = signal<Record<number, string>>({});
  protected readonly busyId = signal<number | null>(null);
  protected readonly cop = formatCop;

  protected readonly topMethod = computed(() => {
    const m = this.r()?.byMethod?.[0];
    return m ? m.label : '—';
  });
  protected readonly methodsHint = computed(() =>
    (this.r()?.byMethod ?? []).map((m) => `${m.label}: ${m.count}`).join(' · '),
  );

  protected readonly columns: TableColumn<PaymentListItem>[] = [
    { key: 'receiptNumber', header: 'Recibo' },
    { key: 'studentName', header: 'Estudiante' },
    { key: 'method', header: 'Método', hideBelow: 'md', format: (v) => methodLabel(v as string) },
    { key: 'paidAt', header: 'Fecha', hideBelow: 'md', format: (v) => formatDateEs(v as string) },
    {
      key: 'amount',
      header: 'Monto',
      align: 'end',
      mono: true,
      format: (v) => formatCop(v as number),
    },
    { key: 'reconciled', header: 'Estado' },
    { key: 'bankRef', header: 'Ref. bancaria' },
  ];

  protected error(): string {
    return errorMessage(this.data.error());
  }

  protected setMonth(value: string | number | null): void {
    if (typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)) this.month.set(value);
  }

  protected refOf(id: number): string {
    return this.refs()[id] ?? '';
  }

  protected setRef(id: number, value: string | number | null): void {
    this.refs.update((r) => ({ ...r, [id]: String(value ?? '') }));
  }

  protected reconcile(row: PaymentListItem): void {
    const ref = (this.refs()[row.id] ?? '').trim();
    if (!ref) return;
    this.busyId.set(row.id);
    this.finance.reconcilePayment(row.id, ref).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success(`Pago ${row.receiptNumber} conciliado.`);
        this.data.reload();
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.error(errorMessage(err));
      },
    });
  }

  protected async unreconcile(row: PaymentListItem): Promise<void> {
    const ok = await this.confirm.ask({
      title: '¿Revertir la conciliación?',
      message: `El pago ${row.receiptNumber} (${formatCop(row.amount)}) volverá a quedar pendiente.`,
      confirmLabel: 'Revertir',
      tone: 'danger',
    });
    if (!ok) return;
    this.finance.unreconcilePayment(row.id).subscribe({
      next: () => {
        this.toast.success('Conciliación revertida.');
        this.data.reload();
      },
      error: (err) => this.toast.error(errorMessage(err)),
    });
  }
}
