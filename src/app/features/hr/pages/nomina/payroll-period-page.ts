import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService, ConfirmService, ToastService } from '../../../../core';
import {
  CopCurrencyPipe,
  DateEsPipe,
  formatCop,
  TabItem,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiAlert,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiFormField,
  UiInput,
  UiModal,
  UiSelect,
  UiSpinner,
  UiStatCard,
  UiTabs,
  UiTextarea,
} from '../../../../shared/ui';
import { HrStatusBadge } from '../../components/hr-status-badge';
import { EmployeesService } from '../../data-access/employees.service';
import {
  CalculatePayrollResult,
  DEDUCTION_NOVELTIES,
  NOVELTY_TYPE_LABELS,
  NOVELTY_TYPES,
  NoveltyType,
  optionsOf,
  PAY_FREQUENCY_LABELS,
  PayrollNovelty,
  PayrollPayment,
} from '../../data-access/hr.models';
import { apiMessage, shortDate } from '../../data-access/hr-ui';
import { PayrollService } from '../../data-access/payroll.service';
import { PAYROLL_BASE } from '../rrhh/hr-links';
import { resourceValue } from '../../../../core/resource/resource-value';

/**
 * Detalle de un período: liquidación por empleado, novedades, costo del
 * empleador y acciones de la máquina de estados (liquidar, aprobar, pagar,
 * anular). Las reglas (segregación de funciones, estados editables) las
 * aplica la API; la página muestra sus mensajes.
 */
@Component({
  selector: 'app-payroll-period-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CopCurrencyPipe,
    DateEsPipe,
    UiAlert,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiFormField,
    UiInput,
    UiModal,
    UiSelect,
    UiSpinner,
    UiStatCard,
    UiTabs,
    UiTextarea,
    HrStatusBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payroll-period-page.html',
  styleUrl: './payroll-period-page.scss',
})
export class PayrollPeriodPage {
  private readonly payroll = inject(PayrollService);
  private readonly employees = inject(EmployeesService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly id = input(0, { transform: numberAttribute });
  protected readonly base = PAYROLL_BASE;
  protected readonly shortDate = shortDate;
  protected readonly apiMessage = apiMessage;
  protected readonly frequencyLabels: Readonly<Record<string, string>> = PAY_FREQUENCY_LABELS;
  protected readonly noveltyLabels: Readonly<Record<string, string>> = NOVELTY_TYPE_LABELS;

  protected readonly detail = rxResource({
    params: () => this.id() || undefined,
    stream: ({ params }) => this.payroll.period(params),
  });
  protected readonly data = computed(() => resourceValue(this.detail, null));
  protected readonly period = computed(() => this.data()?.period ?? null);
  protected readonly status = computed(() => this.period()?.status ?? null);
  protected readonly editable = computed(
    () => this.status() === 'draft' || this.status() === 'calculated',
  );

  // Permisos por rol (la API los vuelve a validar).
  protected readonly isHrManager = computed(() => this.auth.hasRole('admin', 'hr'));
  protected readonly canCalculate = computed(() => this.isHrManager() && this.editable());
  protected readonly canApprove = computed(
    () => this.isHrManager() && this.status() === 'calculated',
  );
  protected readonly canPay = computed(
    () => this.auth.hasRole('admin', 'finance') && this.status() === 'approved',
  );
  protected readonly canCancel = computed(() => this.isHrManager() && this.editable());
  protected readonly canEditNovelties = computed(() => this.isHrManager() && this.editable());

  protected readonly busy = signal<'calculate' | 'approve' | 'pay' | null>(null);
  protected readonly actionError = signal<{ title: string; message: string } | null>(null);
  protected readonly warnings = signal<CalculatePayrollResult['warnings']>([]);

  protected readonly tabs = computed<TabItem[]>(() => [
    {
      id: 'payments',
      label: 'Liquidación',
      icon: 'users',
      badge: this.data()?.payments.length ?? null,
    },
    {
      id: 'novelties',
      label: 'Novedades',
      icon: 'clipboard',
      badge: this.data()?.novelties.length ?? null,
    },
  ]);
  protected readonly tab = signal<string | null>('payments');

  protected readonly paymentColumns: TableColumn<PayrollPayment>[] = [
    { key: 'employeeName', header: 'Empleado', sortable: true },
    { key: 'workedDays', header: 'Días', align: 'end', mono: true, hideBelow: 'md' },
    {
      key: 'basic',
      header: 'Básico',
      align: 'end',
      mono: true,
      value: (r) => r.earnings.basicSalary,
      format: (v) => formatCop(v as number),
      hideBelow: 'lg',
    },
    {
      key: 'gross',
      header: 'Devengado',
      align: 'end',
      mono: true,
      sortable: true,
      value: (r) => r.earnings.gross,
      format: (v) => formatCop(v as number),
    },
    {
      key: 'deductions',
      header: 'Deducciones',
      align: 'end',
      mono: true,
      value: (r) => r.deductions.total,
      format: (v) => formatCop(v as number),
      hideBelow: 'md',
    },
    {
      key: 'net',
      header: 'Neto',
      align: 'end',
      mono: true,
      sortable: true,
      format: (v) => formatCop(v as number),
    },
  ];
  protected readonly paymentActions: TableAction<PayrollPayment>[] = [
    { id: 'detail', label: 'Ver detalle de liquidación', icon: 'eye' },
    { id: 'payslip', label: 'Desprendible imprimible', icon: 'printer' },
  ];
  protected readonly selectedPayment = signal<PayrollPayment | null>(null);
  protected readonly paymentOpen = signal(false);

  protected readonly noveltyColumns: TableColumn<PayrollNovelty>[] = [
    { key: 'employeeName', header: 'Empleado' },
    { key: 'type', header: 'Tipo' },
    { key: 'description', header: 'Descripción', hideBelow: 'md' },
    { key: 'amount', header: 'Valor', align: 'end', mono: true },
  ];
  protected readonly noveltyActions = computed<TableAction<PayrollNovelty>[]>(() =>
    this.canEditNovelties()
      ? [{ id: 'delete', label: 'Eliminar novedad', icon: 'trash', tone: 'danger' }]
      : [],
  );

  // Formulario de novedad
  protected readonly noveltyTypes = optionsOf(NOVELTY_TYPES, NOVELTY_TYPE_LABELS);
  protected readonly employeeOptions = rxResource({
    params: () => (this.canEditNovelties() ? true : undefined),
    stream: () => this.employees.activeOptions(),
  });
  protected readonly employeeList = computed(() => resourceValue(this.employeeOptions, []));
  protected readonly noveltyOpen = signal(false);
  protected readonly savingNovelty = signal(false);
  protected readonly noveltyError = signal<string | null>(null);
  protected readonly noveltyForm = this.fb.group({
    employeeId: this.fb.control<number | null>(null, Validators.required),
    type: this.fb.control<NoveltyType | null>(null, Validators.required),
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    description: this.fb.control('', Validators.maxLength(255)),
  });

  // Anulación
  protected readonly cancelOpen = signal(false);
  protected readonly cancelling = signal(false);
  protected readonly cancelError = signal<string | null>(null);
  protected readonly cancelForm = this.fb.group({
    reason: this.fb.control('', [Validators.required, Validators.maxLength(255)]),
  });

  protected isDeduction(type: string): boolean {
    return DEDUCTION_NOVELTIES.includes(type as NoveltyType);
  }

  // ─── Acciones de estado ───

  protected async calculate(): Promise<void> {
    const recalc = this.status() === 'calculated';
    if (recalc) {
      const ok = await this.confirm.ask({
        title: '¿Reliquidar el período?',
        message: 'Se recalcularán todos los desprendibles con las novedades y permisos vigentes.',
        confirmLabel: 'Reliquidar',
      });
      if (!ok) return;
    }
    this.act('calculate', this.payroll.calculate(this.id()), 'No se pudo liquidar', (res) => {
      const r = res as CalculatePayrollResult;
      this.warnings.set(r.warnings ?? []);
      this.toast.success(`Período liquidado: ${r.payslips} desprendibles.`);
    });
  }

  protected async approve(): Promise<void> {
    const ok = await this.confirm.ask({
      title: '¿Aprobar la nómina?',
      message:
        'Los desprendibles quedan congelados y visibles para los empleados. Quien liquidó no puede aprobar.',
      confirmLabel: 'Aprobar',
    });
    if (!ok) return;
    this.act('approve', this.payroll.approve(this.id()), 'No se pudo aprobar', () =>
      this.toast.success('Nómina aprobada.'),
    );
  }

  protected async pay(): Promise<void> {
    const net = formatCop(this.period()?.netTotal ?? 0);
    const ok = await this.confirm.ask({
      title: '¿Registrar el pago?',
      message: `Se registrará el pago de la nómina por un neto de ${net} y se contabilizará.`,
      confirmLabel: 'Registrar pago',
    });
    if (!ok) return;
    this.act('pay', this.payroll.pay(this.id()), 'No se pudo registrar el pago', () =>
      this.toast.success('Pago de nómina registrado.'),
    );
  }

  private act(
    kind: 'calculate' | 'approve' | 'pay',
    request: Observable<unknown>,
    errorTitle: string,
    done: (res: unknown) => void,
  ): void {
    this.busy.set(kind);
    this.actionError.set(null);
    request.subscribe({
      next: (res) => {
        this.busy.set(null);
        done(res);
        this.detail.reload();
      },
      error: (err: unknown) => {
        this.busy.set(null);
        const message = apiMessage(err);
        this.actionError.set({ title: errorTitle, message });
        this.toast.error(message);
      },
    });
  }

  protected openCancel(): void {
    this.cancelForm.reset({ reason: '' });
    this.cancelError.set(null);
    this.cancelOpen.set(true);
  }

  protected cancelPeriod(): void {
    if (this.cancelForm.invalid) {
      this.cancelForm.markAllAsTouched();
      return;
    }
    this.cancelling.set(true);
    this.payroll.cancel(this.id(), this.cancelForm.controls.reason.value.trim()).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.cancelOpen.set(false);
        this.toast.success('Período anulado.');
        this.detail.reload();
      },
      error: (err: unknown) => {
        this.cancelling.set(false);
        this.cancelError.set(apiMessage(err));
      },
    });
  }

  // ─── Liquidación por empleado ───

  protected onPaymentAction({ action, row }: TableActionEvent<PayrollPayment>): void {
    if (action === 'payslip') {
      void this.router.navigate([PAYROLL_BASE, 'desprendibles', row.id]);
      return;
    }
    this.showPayment(row);
  }

  protected showPayment(row: PayrollPayment): void {
    this.selectedPayment.set(row);
    this.paymentOpen.set(true);
  }

  // ─── Novedades ───

  protected openNovelty(): void {
    this.noveltyForm.reset({ employeeId: null, type: null, amount: null, description: '' });
    this.noveltyError.set(null);
    this.noveltyOpen.set(true);
  }

  protected saveNovelty(): void {
    if (this.noveltyForm.invalid) {
      this.noveltyForm.markAllAsTouched();
      return;
    }
    const v = this.noveltyForm.getRawValue();
    this.savingNovelty.set(true);
    this.noveltyError.set(null);
    this.payroll
      .addNovelty(this.id(), {
        employeeId: v.employeeId!,
        type: v.type!,
        amount: Number(v.amount),
        description: v.description.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.savingNovelty.set(false);
          this.noveltyOpen.set(false);
          this.toast.success(
            this.status() === 'calculated'
              ? 'Novedad registrada. Reliquide el período para aplicarla.'
              : 'Novedad registrada.',
          );
          this.detail.reload();
        },
        error: (err: unknown) => {
          this.savingNovelty.set(false);
          this.noveltyError.set(apiMessage(err));
        },
      });
  }

  protected async onNoveltyAction({ row }: TableActionEvent<PayrollNovelty>): Promise<void> {
    const ok = await this.confirm.ask({
      title: '¿Eliminar la novedad?',
      message: `${row.employeeName ?? 'Empleado'} · ${NOVELTY_TYPE_LABELS[row.type]} por ${formatCop(row.amount)}`,
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    this.payroll.removeNovelty(this.id(), row.id).subscribe({
      next: () => {
        this.toast.success('Novedad eliminada.');
        this.detail.reload();
      },
      error: (err: unknown) => this.toast.error(apiMessage(err)),
    });
  }

  protected employeeName(employeeId: number): string {
    return (
      this.data()?.payments.find((p) => p.employeeId === employeeId)?.employeeName ??
      `#${employeeId}`
    );
  }
}
