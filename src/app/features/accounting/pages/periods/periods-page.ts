import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService, ConfirmService, toApiError, ToastService } from '../../../../core';
import {
  DateEsPipe,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiFormField,
  UiInput,
  UiModal,
  UiTextarea,
} from '../../../../shared/ui';
import { DayPipe } from '../../components/day.pipe';
import { notifyError } from '../../components/notify-error';
import { AccountingPeriod } from '../../data-access/accounting.models';
import { monthRange } from '../../data-access/accounting.labels';
import { AccountingService } from '../../data-access/accounting.service';
import { resourceValue } from '../../../../core/resource/resource-value';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function rangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value as string;
  const end = group.get('endDate')?.value as string;
  return start && end && start > end ? { range: true } : null;
}

/** Periodos contables: crear, cerrar y reabrir (con motivo, solo administrador). */
@Component({
  selector: 'app-periods-page',
  imports: [
    ReactiveFormsModule,
    DateEsPipe,
    DayPipe,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiFormField,
    UiInput,
    UiModal,
    UiTextarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './periods-page.html',
  styleUrls: ['../accounting-page.scss'],
})
export class PeriodsPage {
  private readonly accounting = inject(AccountingService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected readonly periods = rxResource({ stream: () => this.accounting.periods() });
  protected readonly rows = computed(() => resourceValue(this.periods, []));
  private readonly canReopen = computed(() => this.auth.hasRole('admin'));

  protected readonly columns: TableColumn<AccountingPeriod>[] = [
    { key: 'name', header: 'Nombre' },
    { key: 'startDate', header: 'Inicio' },
    { key: 'endDate', header: 'Fin' },
    { key: 'status', header: 'Estado' },
    { key: 'history', header: 'Historial', hideBelow: 'md' },
  ];
  protected readonly actions = computed<TableAction<AccountingPeriod>[]>(() => [
    {
      id: 'close',
      label: 'Cerrar periodo',
      icon: 'lock-closed',
      hidden: (p) => p.status !== 'open',
    },
    {
      id: 'reopen',
      label: 'Reabrir periodo',
      icon: 'key',
      hidden: (p) => p.status !== 'closed' || !this.canReopen(),
    },
  ]);

  // ---- Crear ----
  protected readonly createOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.maxLength(100)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
    },
    { validators: rangeValidator },
  );

  // ---- Reabrir ----
  protected readonly reopenTarget = signal<AccountingPeriod | null>(null);
  protected readonly reopenOpen = signal(false);
  protected readonly reasonCtrl = this.fb.nonNullable.control('', [
    Validators.required,
    Validators.maxLength(255),
  ]);
  protected readonly reopening = signal(false);

  protected openCreate(): void {
    const now = new Date();
    const { from, to } = monthRange(now);
    this.serverError.set(null);
    this.form.reset({
      name: `${MONTHS[now.getMonth()]} ${now.getFullYear()}`,
      startDate: from,
      endDate: to,
    });
    this.createOpen.set(true);
  }

  protected async create(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.serverError.set(null);
    try {
      const v = this.form.getRawValue();
      await firstValueFrom(this.accounting.createPeriod({ ...v, name: v.name.trim() }));
      this.toast.success('Periodo creado.');
      this.createOpen.set(false);
      this.periods.reload();
    } catch (e) {
      this.serverError.set(toApiError(e).message);
    } finally {
      this.saving.set(false);
    }
  }

  protected onAction(event: TableActionEvent<AccountingPeriod>): void {
    if (event.action === 'close') void this.close(event.row);
    if (event.action === 'reopen') {
      this.reopenTarget.set(event.row);
      this.reasonCtrl.reset('');
      this.reopenOpen.set(true);
    }
  }

  private async close(period: AccountingPeriod): Promise<void> {
    const ok = await this.confirm.ask({
      title: `¿Cerrar el periodo ${period.name}?`,
      message:
        'No se podrán registrar, anular ni editar asientos con fecha dentro del periodo hasta que un administrador lo reabra.',
      confirmLabel: 'Cerrar periodo',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.accounting.closePeriod(period.id));
      this.toast.success(`Periodo ${period.name} cerrado.`);
      this.periods.reload();
    } catch (e) {
      notifyError(this.toast, e);
    }
  }

  protected async reopen(): Promise<void> {
    const period = this.reopenTarget();
    if (!period) return;
    if (this.reasonCtrl.invalid) {
      this.reasonCtrl.markAsTouched();
      return;
    }
    this.reopening.set(true);
    try {
      await firstValueFrom(this.accounting.reopenPeriod(period.id, this.reasonCtrl.value.trim()));
      this.toast.success(`Periodo ${period.name} reabierto.`);
      this.reopenOpen.set(false);
      this.periods.reload();
    } catch (e) {
      notifyError(this.toast, e);
    } finally {
      this.reopening.set(false);
    }
  }
}
