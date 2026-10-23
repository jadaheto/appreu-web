import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmService, ToastService } from '../../../../../core';
import {
  UiAlert,
  UiBadge,
  UiButton,
  UiFormField,
  UiSelect,
  UiTextarea,
} from '../../../../../shared/ui';
import {
  labelOf,
  STUDENT_STATUS_LABELS,
  STUDENT_STATUS_TONES,
  STUDENT_STATUSES,
  StudentStatus,
  StudentView,
  toneOf,
} from '../../../data-access/students.models';
import { StudentsService } from '../../../data-access/students.service';

/** Pestaña "Estado": retiro, graduación, suspensión o reactivación con motivo. */
@Component({
  selector: 'app-student-status-tab',
  imports: [ReactiveFormsModule, UiAlert, UiBadge, UiButton, UiFormField, UiSelect, UiTextarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="ui-card__title">Cambio de estado</h2>
    <p class="current">
      Estado actual:
      <ui-badge [tone]="tone(student().status)" dot>{{ label(student().status) }}</ui-badge>
    </p>
    <form class="stack" [formGroup]="form" (submit)="$event.preventDefault(); submit()">
      <div class="grid grid--2">
        <ui-form-field label="Nuevo estado" required>
          <ui-select formControlName="status" [options]="options()" placeholder="Seleccione…" />
        </ui-form-field>
      </div>
      <ui-form-field label="Motivo" hint="Ej.: traslado a otra institución, graduación 2026…">
        <ui-textarea formControlName="reason" [rows]="3" [maxlength]="500" />
      </ui-form-field>
      <ui-alert tone="info">
        El cambio de estado se notifica a los demás módulos (por ejemplo, finanzas). Los acudientes
        solo ven en el portal a sus hijos activos.
      </ui-alert>
      <div>
        <button ui-button type="submit" variant="primary" icon="check" [loading]="saving()">
          Cambiar estado
        </button>
      </div>
    </form>
  `,
  styles: `
    .current {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
  `,
})
export class StatusTab {
  private readonly students = inject(StudentsService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly student = input.required<StudentView>();
  readonly changed = output<void>();

  protected readonly saving = signal(false);
  protected readonly form = this.fb.group({
    status: this.fb.control<StudentStatus | null>(null, Validators.required),
    reason: ['', Validators.maxLength(500)],
  });
  protected readonly options = computed(() =>
    STUDENT_STATUSES.filter((s) => s !== this.student().status).map((value) => ({
      value,
      label: STUDENT_STATUS_LABELS[value],
    })),
  );

  protected label(v: string): string {
    return labelOf(STUDENT_STATUS_LABELS, v);
  }
  protected tone(v: string) {
    return toneOf(STUDENT_STATUS_TONES, v);
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { status, reason } = this.form.getRawValue();
    if (!status) return;
    const destructive = status !== 'active';
    const ok = await this.confirm.ask({
      title: `¿Cambiar el estado a "${this.label(status)}"?`,
      message: `${this.student().fullName} pasará de ${this.label(this.student().status)} a ${this.label(status)}.`,
      confirmLabel: 'Cambiar estado',
      tone: destructive ? 'danger' : 'primary',
    });
    if (!ok) return;
    this.saving.set(true);
    this.students.changeStatus(this.student().id, status, reason).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset();
        this.toast.success('Estado actualizado.');
        this.changed.emit();
      },
      error: () => this.saving.set(false),
    });
  }
}
