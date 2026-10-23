import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConfirmService, ToastService } from '../../../../core';
import {
  CopCurrencyPipe,
  UiAlert,
  UiBadge,
  UiButton,
  UiCheckbox,
  UiChip,
  UiEmptyState,
  UiFormField,
  UiInput,
  UiSelect,
  UiSpinner,
  UiTextarea,
} from '../../../../shared/ui';
import { StudentSearch } from '../../components/student-search';
import { StudentSummaryCard } from '../../components/student-summary-card';
import {
  categoryLabel,
  CHARGE_STATUS_LABELS,
  CHARGE_STATUS_TONES,
  errorMessage,
  formatDay,
  PAYMENT_METHOD_OPTIONS,
  todayIso,
} from '../../data-access/finance-labels';
import type {
  BillingStudent,
  Charge,
  PaymentMethod,
  RegisteredPayment,
} from '../../data-access/finance.models';
import { FinanceService } from '../../data-access/finance.service';
import { resourceValue } from '../../../../core/resource/resource-value';

type ApplyMode = 'auto' | 'select';

/** Fecha no futura (la API rechaza pagos con fecha posterior a hoy). */
const notFuture = (c: { value: string | null }) =>
  c.value && c.value > todayIso() ? { future: true } : null;

/**
 * `/admin/finanzas/caja?studentId=` — registra pagos. El reparto entre cobros
 * (más antiguos primero o los seleccionados) y el saldo a favor los calcula la API.
 */
@Component({
  selector: 'app-cashier-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CopCurrencyPipe,
    UiAlert,
    UiBadge,
    UiButton,
    UiCheckbox,
    UiChip,
    UiEmptyState,
    UiFormField,
    UiInput,
    UiSelect,
    UiSpinner,
    UiTextarea,
    StudentSearch,
    StudentSummaryCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cashier-page.html',
  styleUrl: './cashier-page.scss',
})
export class CashierPage {
  private readonly finance = inject(FinanceService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;

  /** Query param `?studentId=`. */
  readonly studentId = input<string | undefined>();
  protected readonly currentId = linkedSignal(() => {
    const id = Number(this.studentId());
    return Number.isInteger(id) && id > 0 ? id : null;
  });

  protected readonly statement = rxResource({
    params: () => this.currentId() ?? undefined,
    stream: ({ params }) => this.finance.accountStatement(params),
  });
  protected readonly st = computed(() => resourceValue(this.statement, null));
  protected readonly loadError = computed(() =>
    this.statement.error() ? errorMessage(this.statement.error()) : null,
  );

  protected readonly openCharges = computed(() =>
    (this.st()?.charges ?? [])
      .filter((c) => c.status !== 'cancelled' && c.status !== 'paid' && c.pendingAmount > 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id - b.id),
  );
  protected readonly totalPending = computed(() =>
    this.openCharges().reduce((t, c) => t + c.pendingAmount, 0),
  );

  protected readonly mode = signal<ApplyMode>('auto');
  protected readonly selected = signal<ReadonlySet<number>>(new Set());
  protected readonly selectedTotal = computed(() =>
    this.openCharges()
      .filter((c) => this.selected().has(c.id))
      .reduce((t, c) => t + c.pendingAmount, 0),
  );

  protected readonly methodOptions = PAYMENT_METHOD_OPTIONS;
  protected readonly form = this.fb.group({
    paymentDate: [todayIso(), [Validators.required, notFuture]],
    method: this.fb.control<PaymentMethod | null>('efectivo', Validators.required),
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    reference: ['', Validators.maxLength(100)],
    notes: ['', Validators.maxLength(1000)],
  });
  protected readonly dateMessages = { future: 'La fecha del pago no puede ser futura.' };
  protected readonly amountMessages = { min: 'El monto debe ser mayor a cero.' };

  protected readonly saving = signal(false);
  protected readonly applyingCredit = signal(false);
  protected readonly result = signal<RegisteredPayment | null>(null);
  protected readonly formError = signal<string | null>(null);

  protected readonly today = todayIso();
  protected readonly fmtDay = formatDay;
  protected readonly category = categoryLabel;
  protected readonly statusLabel = (c: Charge) => CHARGE_STATUS_LABELS[c.status];
  protected readonly statusTone = (c: Charge) =>
    c.isOverdue && c.status !== 'paid' ? 'danger' : CHARGE_STATUS_TONES[c.status];

  /** Monto ingresado mayor al pendiente: el excedente queda como saldo a favor. */
  protected readonly excess = signal(0);

  protected selectStudent(student: BillingStudent): void {
    this.result.set(null);
    this.resetSelection();
    this.currentId.set(student.id);
    void this.router.navigate([], {
      queryParams: { studentId: student.id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected setMode(mode: ApplyMode): void {
    this.mode.set(mode);
    if (mode === 'auto') this.selected.set(new Set());
    this.formError.set(null);
  }

  protected toggle(charge: Charge, checked: boolean): void {
    const next = new Set(this.selected());
    if (checked) next.add(charge.id);
    else next.delete(charge.id);
    this.selected.set(next);
    this.syncAmount();
  }

  protected toggleAll(): void {
    const all = this.openCharges();
    this.selected.set(
      this.selected().size === all.length ? new Set() : new Set(all.map((c) => c.id)),
    );
    this.syncAmount();
  }

  protected useTotal(amount: number): void {
    this.form.controls.amount.setValue(amount);
    this.updateExcess();
  }

  protected updateExcess(): void {
    const amount = this.form.controls.amount.value ?? 0;
    const cap = this.mode() === 'select' ? this.selectedTotal() : this.totalPending();
    this.excess.set(amount > cap ? Math.round((amount - cap) * 100) / 100 : 0);
  }

  protected submit(): void {
    this.formError.set(null);
    const id = this.currentId();
    if (!id) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.mode() === 'select' && this.selected().size === 0) {
      this.formError.set('Selecciona al menos un cobro o usa la aplicación automática.');
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.finance
      .registerPayment({
        studentId: id,
        amount: Number(v.amount),
        method: v.method!,
        paymentDate: v.paymentDate || undefined,
        reference: v.reference.trim() || undefined,
        notes: v.notes.trim() || undefined,
        chargeIds: this.mode() === 'select' ? [...this.selected()] : undefined,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.result.set(res);
          this.toast.success(`Pago registrado. Recibo ${res.receiptNumber}.`);
          this.form.reset({
            paymentDate: todayIso(),
            method: v.method,
            amount: null,
            reference: '',
            notes: '',
          });
          this.resetSelection();
          this.statement.reload();
        },
        error: (err) => {
          this.saving.set(false);
          this.formError.set(errorMessage(err));
        },
      });
  }

  protected async applyCredit(): Promise<void> {
    const st = this.st();
    if (!st) return;
    const ok = await this.confirm.ask({
      title: 'Aplicar saldo a favor',
      message: `Se aplicarán hasta ${st.summary.creditBalance.toLocaleString('es-CO')} pesos de saldo a favor a los cobros pendientes más antiguos.`,
      confirmLabel: 'Aplicar',
    });
    if (!ok) return;
    this.applyingCredit.set(true);
    this.finance.applyCredit(st.student.id).subscribe({
      next: (res) => {
        this.applyingCredit.set(false);
        this.toast.success(
          res.appliedAmount > 0
            ? `Se aplicaron ${res.appliedAmount.toLocaleString('es-CO')} pesos de saldo a favor.`
            : 'No había cobros pendientes para aplicar el saldo a favor.',
        );
        this.statement.reload();
      },
      error: (err) => {
        this.applyingCredit.set(false);
        this.toast.error(errorMessage(err));
      },
    });
  }

  private syncAmount(): void {
    if (this.mode() === 'select') this.form.controls.amount.setValue(this.selectedTotal() || null);
    this.updateExcess();
  }

  private resetSelection(): void {
    this.selected.set(new Set());
    this.excess.set(0);
  }
}
