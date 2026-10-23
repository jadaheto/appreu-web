import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError, ToastService } from '../../../core';
import {
  UiAlert,
  UiButton,
  UiFormField,
  UiInput,
  UiLabel,
  UiModal,
  UiSelect,
  UiTextarea,
} from '../../../shared/ui';
import { IncidentsService } from '../data-access/incidents.service';
import {
  INCIDENT_PRIORITIES,
  INCIDENT_PRIORITY_LABELS,
  INCIDENT_TYPE_LABELS,
  INCIDENT_TYPES,
  IncidentDetailView,
  IncidentPriority,
  IncidentType,
  optionsOf,
} from '../data-access/students.models';
import { PickedStudent, StudentPicker } from './student-picker';

/**
 * Modal "Nueva solicitud / incidencia" del personal (análisis 03 §4.12).
 * Con `student` fijo se usa desde la ficha 360 (alumno precargado).
 */
@Component({
  selector: 'app-incident-form-modal',
  imports: [
    ReactiveFormsModule,
    StudentPicker,
    UiAlert,
    UiButton,
    UiFormField,
    UiInput,
    UiLabel,
    UiModal,
    UiSelect,
    UiTextarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal [(open)]="open" title="Nueva solicitud / incidencia" size="lg" (closed)="reset()">
      <form id="incident-form" class="stack" [formGroup]="form" (ngSubmit)="submit()">
        @if (serverError(); as err) {
          <ui-alert tone="error">{{ err }}</ui-alert>
        }
        <div class="grid grid--2">
          <ui-form-field label="Tipo de incidencia" required>
            <ui-select formControlName="type" [options]="types" [placeholder]="null" />
          </ui-form-field>
          <ui-form-field label="Prioridad" required>
            <ui-select formControlName="priority" [options]="priorities" [placeholder]="null" />
          </ui-form-field>
        </div>
        <div>
          <ui-label>Estudiante relacionado (opcional)</ui-label>
          <app-student-picker [(value)]="pickedStudent" [locked]="!!student()" />
        </div>
        <ui-form-field label="Título / asunto" required>
          <ui-input
            formControlName="title"
            [maxlength]="255"
            placeholder="Ej.: Solicitud de baja, incapacidad médica…"
          />
        </ui-form-field>
        <ui-form-field label="Descripción / motivo">
          <ui-textarea formControlName="description" [rows]="4" [maxlength]="5000" />
        </ui-form-field>
      </form>
      <ng-container uiModalFooter>
        <button ui-button type="button" (click)="open.set(false)">Cancelar</button>
        <button
          ui-button
          variant="primary"
          type="submit"
          form="incident-form"
          icon="check"
          [loading]="saving()"
        >
          Enviar solicitud
        </button>
      </ng-container>
    </ui-modal>
  `,
})
export class IncidentFormModal {
  private readonly incidents = inject(IncidentsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly open = model(false);
  /** Estudiante precargado (desde la ficha 360). */
  readonly student = input<PickedStudent | null>(null);
  readonly created = output<IncidentDetailView>();

  protected readonly types = optionsOf(INCIDENT_TYPES, INCIDENT_TYPE_LABELS);
  protected readonly priorities = optionsOf(INCIDENT_PRIORITIES, INCIDENT_PRIORITY_LABELS);
  protected readonly pickedStudent = signal<PickedStudent | null>(null);
  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    type: this.fb.control<IncidentType>('otra', Validators.required),
    priority: this.fb.control<IncidentPriority>('medium', Validators.required),
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', Validators.maxLength(5000)],
  });

  constructor() {
    effect(() => {
      if (this.open()) this.pickedStudent.set(this.student());
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.serverError.set(null);
    this.incidents
      .create({
        type: v.type,
        priority: v.priority,
        title: v.title,
        description: v.description,
        studentId: this.pickedStudent()?.id,
      })
      .subscribe({
        next: (incident) => {
          this.saving.set(false);
          this.toast.success('Solicitud registrada.');
          this.created.emit(incident);
          this.open.set(false);
          this.reset();
        },
        error: (err: ApiError) => {
          this.saving.set(false);
          this.serverError.set(err.message);
        },
      });
  }

  protected reset(): void {
    this.form.reset();
    this.serverError.set(null);
  }
}
