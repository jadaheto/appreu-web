import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { ConfirmService, ToastService } from '../../../../core';
import {
  DateRange,
  PageChange,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiAlert,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiDateRange,
  UiFilterBar,
  UiFormField,
  UiModal,
  UiPagination,
  UiSelect,
  UiTextarea,
} from '../../../../shared/ui';
import { HrStatusBadge } from '../../components/hr-status-badge';
import { LeaveFormValue, LeaveRequestForm } from '../../components/leave-request-form';
import { SectionNav } from '../../components/section-nav';
import { EmployeesService } from '../../data-access/employees.service';
import {
  Leave,
  LEAVE_STATUS_LABELS,
  LEAVE_STATUSES,
  LEAVE_TYPE_LABELS,
  LeaveFilters,
  LeaveStatus,
  optionsOf,
  PAY_TREATMENT_LABELS,
} from '../../data-access/hr.models';
import { apiMessage, shortDate } from '../../data-access/hr-ui';
import { LeavesService } from '../../data-access/leaves.service';
import { HR_LINKS } from './hr-links';
import { resourceValue } from '../../../../core/resource/resource-value';

type Decision = 'approve' | 'reject';

/** Bandeja de permisos y licencias de RR. HH. con el flujo aprobar/rechazar/cancelar. */
@Component({
  selector: 'app-leaves-page',
  imports: [
    ReactiveFormsModule,
    UiAlert,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiDateRange,
    UiFilterBar,
    UiFormField,
    UiModal,
    UiPagination,
    UiSelect,
    UiTextarea,
    HrStatusBadge,
    LeaveRequestForm,
    SectionNav,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './leaves-page.html',
})
export class LeavesPage {
  private readonly leaves = inject(LeavesService);
  private readonly employees = inject(EmployeesService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly links = HR_LINKS;
  protected readonly typeLabels: Readonly<Record<string, string>> = LEAVE_TYPE_LABELS;
  protected readonly treatmentLabels: Readonly<Record<string, string>> = PAY_TREATMENT_LABELS;
  protected readonly statusOptions = optionsOf(LEAVE_STATUSES, LEAVE_STATUS_LABELS);
  protected readonly apiMessage = apiMessage;

  protected readonly employeeOptions = rxResource({ stream: () => this.employees.activeOptions() });
  protected readonly employeeList = computed(() => resourceValue(this.employeeOptions, []));

  protected readonly filterForm = this.fb.group({
    status: this.fb.control<LeaveStatus | null>('pending'),
    employeeId: this.fb.control<number | null>(null),
    range: this.fb.control<DateRange>({ from: null, to: null }),
  });
  protected readonly filters = signal<LeaveFilters>({ status: 'pending', page: 1, pageSize: 20 });
  protected readonly result = rxResource({
    params: () => this.filters(),
    stream: ({ params }) => this.leaves.list(params),
  });
  protected readonly rows = computed(() => resourceValue(this.result)?.items ?? []);
  protected readonly total = computed(() => resourceValue(this.result)?.total ?? 0);
  protected readonly hasFilters = computed(() => {
    const f = this.filters();
    return f.status !== 'pending' || !!f.employeeId || !!f.from || !!f.to;
  });

  protected readonly columns: TableColumn<Leave>[] = [
    { key: 'employeeName', header: 'Empleado', sortable: true },
    { key: 'leaveType', header: 'Tipo' },
    { key: 'startDate', header: 'Desde', sortable: true, format: (v) => shortDate(v as string) },
    { key: 'endDate', header: 'Hasta', format: (v) => shortDate(v as string), hideBelow: 'md' },
    { key: 'days', header: 'Días', align: 'end', mono: true },
    { key: 'reason', header: 'Motivo', hideBelow: 'lg' },
    { key: 'displayStatus', header: 'Estado' },
  ];

  protected readonly actions: TableAction<Leave>[] = [
    {
      id: 'approve',
      label: 'Aprobar',
      icon: 'check-circle',
      hidden: (r) => r.status !== 'pending',
    },
    {
      id: 'reject',
      label: 'Rechazar',
      icon: 'x-mark',
      tone: 'danger',
      hidden: (r) => r.status !== 'pending',
    },
    {
      id: 'cancel',
      label: 'Cancelar',
      icon: 'trash',
      tone: 'danger',
      hidden: (r) =>
        !(r.status === 'pending' || (r.status === 'approved' && r.displayStatus !== 'taken')),
    },
  ];

  // Registro en nombre de un empleado
  protected readonly createOpen = signal(false);
  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  private readonly createForm = viewChild(LeaveRequestForm);

  // Decisión
  protected readonly decision = signal<{ kind: Decision; leave: Leave } | null>(null);
  protected readonly decisionOpen = signal(false);
  protected readonly deciding = signal(false);
  protected readonly decisionError = signal<string | null>(null);
  protected readonly decisionForm = this.fb.group({
    text: this.fb.control('', Validators.maxLength(255)),
  });

  protected applyFilters(): void {
    const v = this.filterForm.getRawValue();
    this.filters.update((f) => ({
      ...f,
      status: v.status,
      employeeId: v.employeeId,
      from: v.range?.from ?? null,
      to: v.range?.to ?? null,
      page: 1,
    }));
  }

  protected clearFilters(): void {
    this.filterForm.reset({ status: 'pending', employeeId: null, range: { from: null, to: null } });
    this.applyFilters();
  }

  protected changePage(change: PageChange): void {
    this.filters.update((f) => ({ ...f, page: change.page, pageSize: change.pageSize }));
  }

  protected openCreate(): void {
    this.createError.set(null);
    this.createForm()?.reset();
    this.createOpen.set(true);
  }

  protected create(value: LeaveFormValue): void {
    if (value.employeeId === null) return;
    this.creating.set(true);
    this.createError.set(null);
    this.leaves
      .create({
        employeeId: value.employeeId,
        leaveType: value.leaveType,
        startDate: value.startDate,
        endDate: value.endDate,
        reason: value.reason,
      })
      .subscribe({
        next: () => {
          this.creating.set(false);
          this.createOpen.set(false);
          this.toast.success('Permiso registrado como pendiente.');
          this.result.reload();
        },
        error: (err: unknown) => {
          this.creating.set(false);
          this.createError.set(apiMessage(err));
        },
      });
  }

  protected async onAction({ action, row }: TableActionEvent<Leave>): Promise<void> {
    if (action === 'approve' || action === 'reject') {
      this.decision.set({ kind: action, leave: row });
      this.decisionError.set(null);
      const text = this.decisionForm.controls.text;
      text.reset('');
      text.setValidators(
        action === 'reject'
          ? [Validators.required, Validators.maxLength(255)]
          : Validators.maxLength(255),
      );
      text.updateValueAndValidity();
      this.decisionOpen.set(true);
      return;
    }
    const ok = await this.confirm.ask({
      title: '¿Cancelar el permiso?',
      message: `${row.employeeName ?? 'Empleado'} · ${LEAVE_TYPE_LABELS[row.leaveType]} (${shortDate(row.startDate)} – ${shortDate(row.endDate)})`,
      confirmLabel: 'Cancelar permiso',
      cancelLabel: 'Volver',
      tone: 'danger',
    });
    if (!ok) return;
    this.run(this.leaves.cancel(row.id), 'Permiso cancelado.');
  }

  protected decide(): void {
    const d = this.decision();
    if (!d) return;
    if (this.decisionForm.invalid) {
      this.decisionForm.markAllAsTouched();
      return;
    }
    const text = this.decisionForm.controls.text.value.trim();
    const request =
      d.kind === 'approve'
        ? this.leaves.approve(d.leave.id, text || undefined)
        : this.leaves.reject(d.leave.id, text);
    this.deciding.set(true);
    this.decisionError.set(null);
    request.subscribe({
      next: () => {
        this.deciding.set(false);
        this.decisionOpen.set(false);
        this.toast.success(d.kind === 'approve' ? 'Permiso aprobado.' : 'Permiso rechazado.');
        this.result.reload();
      },
      error: (err: unknown) => {
        this.deciding.set(false);
        this.decisionError.set(apiMessage(err));
      },
    });
  }

  private run(request: Observable<unknown>, success: string): void {
    request.subscribe({
      next: () => {
        this.toast.success(success);
        this.result.reload();
      },
      error: (err: unknown) => this.toast.error(apiMessage(err)),
    });
  }
}
