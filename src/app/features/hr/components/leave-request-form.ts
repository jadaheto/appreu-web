import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  SelectOption,
  UiButton,
  UiFormField,
  UiInput,
  UiSelect,
  UiTextarea,
} from '../../../shared/ui';
import {
  LEAVE_TYPE_LABELS,
  LEAVE_TYPES,
  LeaveType,
  optionsOf,
  RequestLeaveRequest,
} from '../data-access/hr.models';
import { isoDate } from '../data-access/hr-ui';

export interface LeaveFormValue extends RequestLeaveRequest {
  employeeId: number | null;
}

function endAfterStart(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value as string;
  const end = group.get('endDate')?.value as string;
  return start && end && end < start ? { dateRange: true } : null;
}

/**
 * Formulario de solicitud de permiso. Con `employeeOptions` (RR. HH.) pide el
 * empleado; en el portal se omite porque la API usa el empleado del token.
 * Los días y el tratamiento en nómina los calcula la API.
 */
@Component({
  selector: 'app-leave-request-form',
  imports: [ReactiveFormsModule, UiButton, UiFormField, UiInput, UiSelect, UiTextarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="stack" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      @if (employeeOptions(); as options) {
        <ui-form-field label="Empleado" required>
          <ui-select formControlName="employeeId" [options]="options" />
        </ui-form-field>
      }
      <ui-form-field label="Tipo de permiso" required>
        <ui-select formControlName="leaveType" [options]="types" />
      </ui-form-field>
      <div class="grid grid--2">
        <ui-form-field label="Fecha de inicio" required>
          <ui-input type="date" formControlName="startDate" />
        </ui-form-field>
        <ui-form-field
          label="Fecha de fin"
          required
          [error]="
            form.hasError('dateRange') ? 'La fecha de fin no puede ser anterior al inicio.' : null
          "
        >
          <ui-input type="date" formControlName="endDate" />
        </ui-form-field>
      </div>
      <ui-form-field label="Motivo" required>
        <ui-textarea formControlName="reason" [maxlength]="2000" [rows]="3" />
      </ui-form-field>
      <div class="cluster" style="justify-content: flex-end">
        <ng-content />
        <button ui-button type="submit" variant="primary" icon="check" [loading]="busy()">
          {{ submitLabel() }}
        </button>
      </div>
    </form>
  `,
})
export class LeaveRequestForm {
  private readonly fb = inject(NonNullableFormBuilder);

  /** Opciones de empleado (solo RR. HH.); `null` para el portal del empleado. */
  readonly employeeOptions = input<readonly SelectOption<number>[] | null>(null);
  readonly busy = input(false, { transform: booleanAttribute });
  readonly submitLabel = input('Enviar solicitud');
  readonly submitted = output<LeaveFormValue>();

  protected readonly types = optionsOf(LEAVE_TYPES, LEAVE_TYPE_LABELS);

  readonly form = this.fb.group(
    {
      employeeId: this.fb.control<number | null>(null),
      leaveType: this.fb.control<LeaveType | null>(null, Validators.required),
      startDate: this.fb.control(isoDate(), Validators.required),
      endDate: this.fb.control(isoDate(), Validators.required),
      reason: this.fb.control('', [Validators.required, Validators.maxLength(2000)]),
    },
    { validators: endAfterStart },
  );

  protected submit(): void {
    const needsEmployee = this.employeeOptions() !== null;
    const employee = this.form.controls.employeeId;
    employee.setValidators(needsEmployee ? Validators.required : null);
    employee.updateValueAndValidity({ emitEvent: false });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.submitted.emit({
      employeeId: v.employeeId,
      leaveType: v.leaveType as LeaveType,
      startDate: v.startDate,
      endDate: v.endDate,
      reason: v.reason.trim(),
    });
  }

  reset(): void {
    this.form.reset();
  }
}
