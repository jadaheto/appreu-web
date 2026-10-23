import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../../core';
import {
  UiAlert,
  UiButton,
  UiFormField,
  UiInput,
  UiModal,
  UiSelect,
  UiTextarea,
} from '../../../shared/ui';
import { EmployeesService } from '../data-access/employees.service';
import {
  Employee,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYEE_STATUS_TRANSITIONS,
  EmployeeStatus,
  EmployeeSummary,
} from '../data-access/hr.models';
import { apiMessage, isoDate } from '../data-access/hr-ui';

/**
 * Diálogos de estado de un empleado: `mode="status"` cambia el estado según
 * las transiciones permitidas (sincroniza el acceso al portal en la API) y
 * `mode="retire"` registra el retiro lógico con fecha y motivo.
 */
@Component({
  selector: 'app-employee-status-modal',
  imports: [
    ReactiveFormsModule,
    UiAlert,
    UiButton,
    UiFormField,
    UiInput,
    UiModal,
    UiSelect,
    UiTextarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal
      [(open)]="open"
      [title]="mode() === 'retire' ? 'Retirar empleado' : 'Cambiar estado'"
      [description]="employee()?.fullName ?? ''"
      size="sm"
    >
      @if (error()) {
        <ui-alert tone="error" class="mb">{{ error() }}</ui-alert>
      }
      @if (mode() === 'status') {
        @if (options().length) {
          <form [formGroup]="statusForm" (ngSubmit)="save()" id="status-form">
            <ui-form-field label="Nuevo estado" required>
              <ui-select formControlName="status" [options]="options()" />
            </ui-form-field>
            <p class="text-muted hint">
              Activo y En licencia conservan el acceso al portal; los demás estados lo bloquean.
            </p>
          </form>
        } @else {
          <ui-alert tone="info">Este empleado no admite cambios de estado.</ui-alert>
        }
      } @else {
        <form class="stack" [formGroup]="retireForm" (ngSubmit)="save()" id="status-form">
          <ui-alert tone="warning">
            El retiro conserva el historial laboral y bloquea el acceso al portal. No se puede
            deshacer desde aquí.
          </ui-alert>
          <ui-form-field label="Fecha de retiro" required>
            <ui-input type="date" formControlName="retirementDate" />
          </ui-form-field>
          <ui-form-field label="Motivo" required>
            <ui-textarea formControlName="reason" [maxlength]="255" [rows]="3" />
          </ui-form-field>
        </form>
      }
      <ng-container uiModalFooter>
        <button ui-button type="button" (click)="open.set(false)">Cancelar</button>
        <button
          ui-button
          type="submit"
          form="status-form"
          [variant]="mode() === 'retire' ? 'danger' : 'primary'"
          [loading]="busy()"
          [disabled]="mode() === 'status' && !options().length"
        >
          {{ mode() === 'retire' ? 'Registrar retiro' : 'Guardar estado' }}
        </button>
      </ng-container>
    </ui-modal>
  `,
  styles: `
    .mb {
      display: block;
      margin-bottom: var(--space-4);
    }
    .hint {
      font-size: var(--text-xs);
      margin-top: var(--space-2);
    }
  `,
})
export class EmployeeStatusModal {
  private readonly employees = inject(EmployeesService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly open = model(false);
  readonly employee = input<EmployeeSummary | null>(null);
  readonly mode = input<'status' | 'retire'>('status');
  readonly saved = output<Employee>();

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly options = computed(() => {
    const current = this.employee()?.status;
    return current
      ? EMPLOYEE_STATUS_TRANSITIONS[current].map((s) => ({
          value: s,
          label: EMPLOYEE_STATUS_LABELS[s],
        }))
      : [];
  });

  protected readonly statusForm = this.fb.group({
    status: this.fb.control<EmployeeStatus | null>(null, Validators.required),
  });
  protected readonly retireForm = this.fb.group({
    retirementDate: this.fb.control(isoDate(), Validators.required),
    reason: this.fb.control('', [Validators.required, Validators.maxLength(255)]),
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.error.set(null);
      this.statusForm.reset({ status: this.options()[0]?.value ?? null });
      this.retireForm.reset({ retirementDate: isoDate(), reason: '' });
    });
  }

  protected save(): void {
    const employee = this.employee();
    if (!employee) return;
    const form = this.mode() === 'retire' ? this.retireForm : this.statusForm;
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    const request =
      this.mode() === 'retire'
        ? this.employees.retire(employee.id, {
            retirementDate: this.retireForm.controls.retirementDate.value,
            reason: this.retireForm.controls.reason.value.trim(),
          })
        : this.employees.changeStatus(employee.id, this.statusForm.controls.status.value!);
    this.busy.set(true);
    this.error.set(null);
    request.subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.toast.success(
          this.mode() === 'retire' ? 'Retiro registrado.' : 'Estado del empleado actualizado.',
        );
        this.open.set(false);
        this.saved.emit(updated);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(apiMessage(err));
      },
    });
  }
}
