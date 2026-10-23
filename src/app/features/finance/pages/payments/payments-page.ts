import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, ConfirmService, ToastService } from '../../../../core';
import {
  CopCurrencyPipe,
  DateRange,
  formatCop,
  formatDateEs,
  PageChange,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiDateRange,
  UiFilterBar,
  UiFormField,
  UiInput,
  UiModal,
  UiPagination,
  UiSearchBox,
  UiSelect,
  UiTextarea,
} from '../../../../shared/ui';
import {
  errorMessage,
  methodLabel,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_OPTIONS,
  PAYMENT_STATUS_TONES,
} from '../../data-access/finance-labels';
import type {
  PaymentFilters,
  PaymentListItem,
  PaymentMethod,
  PaymentStatus,
} from '../../data-access/finance.models';
import { FinanceService } from '../../data-access/finance.service';
import { resourceValue } from '../../../../core/resource/resource-value';

type ModalKind = 'void' | 'reconcile';

/** `/admin/finanzas/pagos` — listado de pagos, anulación con motivo y conciliación. */
@Component({
  selector: 'app-payments-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CopCurrencyPipe,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiDateRange,
    UiFilterBar,
    UiFormField,
    UiInput,
    UiModal,
    UiPagination,
    UiSearchBox,
    UiSelect,
    UiTextarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payments-page.html',
  styles: `
    .mb {
      display: block;
      margin-bottom: var(--space-5);
    }
    small {
      display: block;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
    }
  `,
})
export class PaymentsPage {
  /** Valor del recurso o `undefined` si carga o falló (ver `resourceValue`). */
  protected readonly val = resourceValue;
  private readonly finance = inject(FinanceService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder).nonNullable;

  /** Anular pagos está reservado al rol administrador (la API también lo valida). */
  protected readonly canVoid = computed(
    () => this.auth.role() !== null && this.auth.hasRole('admin'),
  );

  protected readonly filters = signal<PaymentFilters>({ page: 1, pageSize: 20 });
  protected readonly draft = {
    search: signal(''),
    range: signal<DateRange>({ from: null, to: null }),
    method: signal<PaymentMethod | null>(null),
    status: signal<PaymentStatus | null>(null),
  };
  protected readonly methodOptions = PAYMENT_METHOD_OPTIONS;
  protected readonly statusOptions = PAYMENT_STATUS_OPTIONS;

  protected readonly list = rxResource({
    params: () => this.filters(),
    stream: ({ params }) => this.finance.payments(params),
  });
  protected readonly rows = computed(() => resourceValue(this.list)?.items ?? []);
  protected readonly hasFilters = computed(() => {
    const f = this.filters();
    return !!(f.search || f.from || f.to || f.method || f.status);
  });

  protected readonly columns: TableColumn<PaymentListItem>[] = [
    { key: 'receiptNumber', header: 'Recibo', mono: true },
    { key: 'studentName', header: 'Estudiante' },
    { key: 'paidAt', header: 'Fecha', hideBelow: 'md', format: (v) => formatDateEs(v as string) },
    { key: 'method', header: 'Método', hideBelow: 'lg', format: (v) => methodLabel(v as string) },
    {
      key: 'amount',
      header: 'Monto',
      align: 'end',
      mono: true,
      format: (v) => formatCop(v as number),
    },
    { key: 'status', header: 'Estado' },
    { key: 'reconciled', header: 'Conciliación', hideBelow: 'md' },
  ];
  protected readonly actions = computed<TableAction<PaymentListItem>[]>(() => [
    { id: 'receipt', label: 'Ver recibo', icon: 'printer' },
    {
      id: 'reconcile',
      label: 'Conciliar',
      icon: 'check-circle',
      hidden: (r) => r.reconciled || r.status === 'reversed',
    },
    {
      id: 'unreconcile',
      label: 'Revertir conciliación',
      icon: 'arrow-left',
      hidden: (r) => !r.reconciled,
    },
    {
      id: 'void',
      label: 'Anular pago',
      icon: 'x-mark',
      tone: 'danger',
      hidden: (r) => !this.canVoid() || r.status === 'reversed',
    },
  ]);
  protected readonly statusLabel = (s: PaymentStatus) => PAYMENT_STATUS_LABELS[s];
  protected readonly statusTone = (s: PaymentStatus) => PAYMENT_STATUS_TONES[s];

  // Modal (anulación / conciliación)
  protected readonly modal = signal<ModalKind | null>(null);
  protected readonly target = signal<PaymentListItem | null>(null);
  protected readonly modalOpen = computed(() => this.modal() !== null);
  protected readonly busy = signal(false);
  protected readonly modalError = signal<string | null>(null);
  protected readonly voidForm = this.fb.group({
    reason: ['', [Validators.required, Validators.maxLength(255)]],
  });
  protected readonly reconcileForm = this.fb.group({
    bankRef: ['', [Validators.required, Validators.maxLength(100)]],
  });

  protected applyFilters(): void {
    const range = this.draft.range();
    this.filters.set({
      page: 1,
      pageSize: this.filters().pageSize,
      search: this.draft.search().trim() || undefined,
      from: range.from,
      to: range.to,
      method: this.draft.method(),
      status: this.draft.status(),
    });
  }

  protected clearFilters(): void {
    this.draft.search.set('');
    this.draft.range.set({ from: null, to: null });
    this.draft.method.set(null);
    this.draft.status.set(null);
    this.applyFilters();
  }

  protected onPage(e: PageChange): void {
    this.filters.update((f) => ({ ...f, page: e.page, pageSize: e.pageSize }));
  }

  protected async onAction(e: TableActionEvent<PaymentListItem>): Promise<void> {
    const row = e.row;
    switch (e.action) {
      case 'receipt':
        void this.router.navigate(['/admin/finanzas/recibos', row.receiptNumber]);
        break;
      case 'void':
        this.voidForm.reset();
        this.openModal('void', row);
        break;
      case 'reconcile':
        this.reconcileForm.reset({ bankRef: row.reference ?? '' });
        this.openModal('reconcile', row);
        break;
      case 'unreconcile': {
        const ok = await this.confirm.ask({
          title: '¿Revertir la conciliación?',
          message: `El pago ${row.receiptNumber} volverá a quedar pendiente de conciliar.`,
          confirmLabel: 'Revertir',
          tone: 'danger',
        });
        if (!ok) return;
        this.finance.unreconcilePayment(row.id).subscribe({
          next: () => {
            this.toast.success('Conciliación revertida.');
            this.list.reload();
          },
          error: (err) => this.toast.error(errorMessage(err)),
        });
      }
    }
  }

  protected async submitVoid(): Promise<void> {
    const row = this.target();
    if (!row) return;
    if (this.voidForm.invalid) {
      this.voidForm.markAllAsTouched();
      return;
    }
    const ok = await this.confirm.ask({
      title: `¿Anular el pago ${row.receiptNumber}?`,
      message: `Se revertirán sus aplicaciones (${formatCop(row.amount)}) y los cobros volverán a quedar pendientes. Esta acción no se puede deshacer.`,
      confirmLabel: 'Anular pago',
      tone: 'danger',
    });
    if (!ok) return;
    this.busy.set(true);
    this.finance.voidPayment(row.id, this.voidForm.getRawValue().reason.trim()).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.closeModal();
        this.toast.success(`Pago ${res.receiptNumber} anulado.`);
        this.list.reload();
      },
      error: (err) => {
        this.busy.set(false);
        this.modalError.set(errorMessage(err));
      },
    });
  }

  protected submitReconcile(): void {
    const row = this.target();
    if (!row) return;
    if (this.reconcileForm.invalid) {
      this.reconcileForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.finance
      .reconcilePayment(row.id, this.reconcileForm.getRawValue().bankRef.trim())
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.closeModal();
          this.toast.success(`Pago ${row.receiptNumber} conciliado.`);
          this.list.reload();
        },
        error: (err) => {
          this.busy.set(false);
          this.modalError.set(errorMessage(err));
        },
      });
  }

  protected closeModal(): void {
    this.modal.set(null);
    this.target.set(null);
    this.modalError.set(null);
  }

  private openModal(kind: ModalKind, row: PaymentListItem): void {
    this.modalError.set(null);
    this.target.set(row);
    this.modal.set(kind);
  }
}
