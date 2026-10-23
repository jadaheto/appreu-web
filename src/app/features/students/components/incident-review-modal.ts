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
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError, ToastService } from '../../../core';
import { UiAlert, UiButton, UiFormField, UiModal, UiTextarea } from '../../../shared/ui';
import { IncidentsService } from '../data-access/incidents.service';
import {
  IncidentDetailView,
  REVIEW_ACTION_LABELS,
  ReviewAction,
} from '../data-access/students.models';
import { incidentNumber } from './catalog-label.pipe';

const SUCCESS: Record<ReviewAction, string> = {
  in_review: 'Incidencia marcada en revisión.',
  approved: 'Incidencia aprobada.',
  rejected: 'Incidencia rechazada.',
  closed: 'Incidencia cerrada.',
};

/**
 * Diálogo de revisión (análisis 03 §4.12, regla 37): confirma la acción y
 * registra las notas. Rechazar exige un motivo; las transiciones las valida la API.
 */
@Component({
  selector: 'app-incident-review-modal',
  imports: [ReactiveFormsModule, UiAlert, UiButton, UiFormField, UiModal, UiTextarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal [(open)]="open" [title]="title()" [description]="incident()?.title ?? ''">
      <form id="incident-review-form" class="stack" (submit)="$event.preventDefault(); submit()">
        @if (error(); as err) {
          <ui-alert tone="error">{{ err }}</ui-alert>
        }
        <ui-form-field
          [label]="action() === 'rejected' ? 'Motivo del rechazo' : 'Notas de revisión (opcional)'"
          [required]="action() === 'rejected'"
        >
          <ui-textarea [formControl]="notes" [rows]="4" [maxlength]="5000" />
        </ui-form-field>
      </form>
      <ng-container uiModalFooter>
        <button ui-button type="button" (click)="open.set(false)">Cancelar</button>
        <button
          ui-button
          type="submit"
          form="incident-review-form"
          [variant]="action() === 'rejected' ? 'danger' : 'primary'"
          [loading]="saving()"
        >
          {{ confirmLabel() }}
        </button>
      </ng-container>
    </ui-modal>
  `,
})
export class IncidentReviewModal {
  private readonly incidents = inject(IncidentsService);
  private readonly toast = inject(ToastService);

  readonly open = model(false);
  readonly incident = input<IncidentDetailView | null>(null);
  readonly action = input<ReviewAction | null>(null);
  readonly reviewed = output<IncidentDetailView>();

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notes = new FormControl('', {
    nonNullable: true,
    validators: Validators.maxLength(5000),
  });

  protected readonly confirmLabel = computed(() => {
    const a = this.action();
    return a ? REVIEW_ACTION_LABELS[a] : 'Confirmar';
  });
  protected readonly title = computed(() => {
    const i = this.incident();
    return i ? `${this.confirmLabel()} ${incidentNumber(i.id)}` : this.confirmLabel();
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const rejecting = this.action() === 'rejected';
      this.notes.reset(this.incident()?.reviewNotes ?? '');
      this.notes.setValidators(
        rejecting ? [Validators.required, Validators.maxLength(5000)] : Validators.maxLength(5000),
      );
      this.notes.updateValueAndValidity();
      this.error.set(null);
    });
  }

  protected submit(): void {
    const incident = this.incident();
    const action = this.action();
    if (!incident || !action || this.saving()) return;
    if (this.notes.invalid || (action === 'rejected' && !this.notes.value.trim())) {
      this.notes.setErrors({ required: true });
      this.notes.markAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.incidents.review(incident.id, action, this.notes.value).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.toast.success(SUCCESS[action]);
        this.open.set(false);
        this.reviewed.emit(updated);
      },
      error: (err: ApiError) => {
        this.saving.set(false);
        this.error.set(err.message);
      },
    });
  }
}
