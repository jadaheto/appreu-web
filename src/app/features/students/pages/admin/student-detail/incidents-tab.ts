import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DateEsPipe, UiBadge, UiButton, UiEmptyState } from '../../../../../shared/ui';
import { IncidentFormModal } from '../../../components/incident-form-modal';
import { PickedStudent } from '../../../components/student-picker';
import {
  INCIDENT_PRIORITY_LABELS,
  INCIDENT_PRIORITY_TONES,
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_TONES,
  INCIDENT_TYPE_LABELS,
  IncidentDetailView,
  labelOf,
  StudentView,
  toneOf,
} from '../../../data-access/students.models';

/** Pestaña "Incidencias": últimas 10 del estudiante y creación con el alumno precargado. */
@Component({
  selector: 'app-student-incidents-tab',
  imports: [DateEsPipe, IncidentFormModal, RouterLink, UiBadge, UiButton, UiEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bar">
      <h2 class="ui-card__title">Registro de incidencias / seguimiento</h2>
      <div class="cluster">
        <a ui-button size="sm" variant="ghost" routerLink="/admin/incidencias">Ver bandeja</a>
        <button
          ui-button
          type="button"
          size="sm"
          variant="primary"
          icon="plus"
          (click)="modalOpen.set(true)"
        >
          Nueva solicitud
        </button>
      </div>
    </div>
    <ul class="list">
      @for (i of incidents(); track i.id) {
        <li>
          <div class="row">
            <strong>{{ i.title }}</strong>
            <ui-badge [tone]="statusTone(i.status)">{{ statusLabel(i.status) }}</ui-badge>
          </div>
          <p class="meta">
            {{ typeLabel(i.type) }} ·
            <ui-badge [tone]="priorityTone(i.priority)">{{ priorityLabel(i.priority) }}</ui-badge>
            · {{ i.createdAt | dateEs: 'datetime' }}
            @if (i.requestedByName) {
              · Solicitó: {{ i.requestedByName }}
            }
            @if (i.reviewedByName) {
              · Rev.: {{ i.reviewedByName }}
            }
          </p>
          @if (i.description) {
            <p class="desc">{{ i.description }}</p>
          }
          @if (i.reviewNotes) {
            <p class="desc notes">Notas de revisión: {{ i.reviewNotes }}</p>
          }
        </li>
      } @empty {
        <li class="plain">
          <ui-empty-state icon="check-circle" title="Sin incidencias registradas" />
        </li>
      }
    </ul>
    <app-incident-form-modal [(open)]="modalOpen" [student]="picked()" (created)="changed.emit()" />
  `,
  styles: `
    .bar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.5rem 1rem;
    }
    .bar h2 {
      flex: 1;
    }
    .list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.75rem;
    }
    li {
      border: 1px solid var(--color-border-soft);
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
    }
    li.plain {
      border: 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .meta {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      margin-top: 0.25rem;
    }
    .desc {
      font-size: var(--text-sm);
      margin-top: 0.4rem;
      white-space: pre-line;
    }
    .notes {
      color: var(--color-text-muted);
      font-style: italic;
    }
  `,
})
export class IncidentsTab {
  readonly student = input.required<StudentView>();
  readonly incidents = input<readonly IncidentDetailView[]>([]);
  readonly changed = output<void>();

  protected readonly modalOpen = signal(false);
  protected readonly picked = computed<PickedStudent>(() => ({
    id: this.student().id,
    fullName: this.student().fullName,
    code: this.student().code,
  }));

  protected typeLabel(v: string): string {
    return labelOf(INCIDENT_TYPE_LABELS, v);
  }
  protected statusLabel(v: string): string {
    return labelOf(INCIDENT_STATUS_LABELS, v);
  }
  protected statusTone(v: string) {
    return toneOf(INCIDENT_STATUS_TONES, v);
  }
  protected priorityLabel(v: string): string {
    return labelOf(INCIDENT_PRIORITY_LABELS, v);
  }
  protected priorityTone(v: string) {
    return toneOf(INCIDENT_PRIORITY_TONES, v);
  }
}
