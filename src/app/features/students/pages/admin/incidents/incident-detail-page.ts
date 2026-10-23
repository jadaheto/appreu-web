import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { formatDateEs, UiAlert, UiBadge, UiButton, UiSpinner } from '../../../../../shared/ui';
import {
  CatalogLabelPipe,
  CatalogTonePipe,
  incidentNumber,
} from '../../../components/catalog-label.pipe';
import { IncidentReviewModal } from '../../../components/incident-review-modal';
import { InfoGrid, InfoItem } from '../../../components/info-grid';
import { IncidentsService } from '../../../data-access/incidents.service';
import {
  INCIDENT_PRIORITY_LABELS,
  INCIDENT_PRIORITY_TONES,
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_TONES,
  INCIDENT_TYPE_LABELS,
  IncidentDetailView,
  IncidentStatus,
  labelOf,
  REVIEW_ACTION_LABELS,
  REVIEW_TRANSITIONS,
  ReviewAction,
} from '../../../data-access/students.models';
import { resourceValue } from '../../../../../core/resource/resource-value';

/** Detalle de una incidencia con el panel de revisión (`GET /api/incidents/:id`). */
@Component({
  selector: 'app-incident-detail-page',
  imports: [
    CatalogLabelPipe,
    CatalogTonePipe,
    IncidentReviewModal,
    InfoGrid,
    RouterLink,
    UiAlert,
    UiBadge,
    UiButton,
    UiSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <a ui-button variant="ghost" icon="arrow-left" routerLink="..">Bandeja de incidencias</a>
    </div>

    @if (incident.isLoading() && !data()) {
      <div class="center"><ui-spinner size="lg" /></div>
    } @else if (incident.error(); as err) {
      <ui-alert tone="error" title="No se pudo cargar la incidencia">{{ err.message }}</ui-alert>
    } @else if (data(); as i) {
      <section class="ui-card stack">
        <header class="head">
          <div>
            <p class="number font-mono">{{ number(i.id) }}</p>
            <h1>{{ i.title }}</h1>
          </div>
          <div class="cluster">
            <ui-badge [tone]="i.priority | catalogTone: priorityTones">
              Prioridad {{ (i.priority | catalogLabel: priorityLabels).toLowerCase() }}
            </ui-badge>
            <ui-badge [tone]="i.status | catalogTone: statusTones" dot>
              {{ i.status | catalogLabel: statusLabels }}
            </ui-badge>
          </div>
        </header>
        <app-info-grid [items]="items()" [columns]="3" />
        <div>
          <h2 class="ui-card__title">Descripción / motivo</h2>
          <p class="text">{{ i.description || 'Sin descripción.' }}</p>
        </div>
        @if (i.reviewNotes) {
          <div>
            <h2 class="ui-card__title">Notas de revisión</h2>
            <p class="text">{{ i.reviewNotes }}</p>
          </div>
        }
      </section>

      <section class="ui-card stack" aria-labelledby="review-title">
        <h2 class="ui-card__title" id="review-title">Revisión</h2>
        @if (allowed().length) {
          <p class="text-muted">Elige la acción. Las notas quedan registradas con tu usuario.</p>
          <div class="cluster">
            @for (a of allowed(); track a) {
              <button
                ui-button
                type="button"
                [variant]="a === 'rejected' ? 'danger' : a === 'approved' ? 'primary' : 'secondary'"
                (click)="startReview(a)"
              >
                {{ actionLabels[a] }}
              </button>
            }
          </div>
        } @else {
          <p class="text-muted">La incidencia está cerrada; no admite más acciones.</p>
        }
      </section>

      <app-incident-review-modal
        [(open)]="reviewOpen"
        [incident]="i"
        [action]="reviewAction()"
        (reviewed)="incident.reload()"
      />
    }
  `,
  styles: `
    .center {
      display: flex;
      justify-content: center;
      padding: 3rem 0;
    }
    .head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .number {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
    .text {
      white-space: pre-line;
      overflow-wrap: anywhere;
    }
    section + section {
      margin-top: 1.25rem;
    }
  `,
})
export class IncidentDetailPage {
  private readonly incidents = inject(IncidentsService);

  /** Parámetro de ruta `:id`. */
  readonly id = input<string>();

  protected readonly statusLabels = INCIDENT_STATUS_LABELS;
  protected readonly statusTones = INCIDENT_STATUS_TONES;
  protected readonly priorityLabels = INCIDENT_PRIORITY_LABELS;
  protected readonly priorityTones = INCIDENT_PRIORITY_TONES;
  protected readonly actionLabels = REVIEW_ACTION_LABELS;

  protected readonly incident = rxResource({
    params: () => Number(this.id()),
    stream: ({ params }) =>
      Number.isInteger(params) && params > 0 ? this.incidents.get(params) : of(null),
  });
  protected readonly data = computed<IncidentDetailView | null>(() =>
    resourceValue(this.incident, null),
  );
  protected readonly allowed = computed<readonly ReviewAction[]>(() => {
    const i = this.data();
    return i ? (REVIEW_TRANSITIONS[i.status as IncidentStatus] ?? []) : [];
  });
  protected readonly items = computed<InfoItem[]>(() => {
    const i = this.data();
    if (!i) return [];
    return [
      { label: 'Tipo', value: labelOf(INCIDENT_TYPE_LABELS, i.type) },
      { label: 'Alumno', value: i.studentName },
      { label: 'Solicitado por', value: i.requestedByName },
      { label: 'Fecha de registro', value: formatDateEs(i.createdAt, 'datetime') },
      { label: 'Revisado por', value: i.reviewedByName },
      { label: 'Última actualización', value: formatDateEs(i.updatedAt, 'datetime') },
    ];
  });

  protected readonly reviewOpen = signal(false);
  protected readonly reviewAction = signal<ReviewAction | null>(null);

  protected number(id: number): string {
    return incidentNumber(id);
  }

  protected startReview(action: ReviewAction): void {
    this.reviewAction.set(action);
    this.reviewOpen.set(true);
  }
}
