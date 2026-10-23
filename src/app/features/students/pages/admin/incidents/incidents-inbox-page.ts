import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  DateEsPipe,
  PageChange,
  StatTone,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiFilterBar,
  UiPagination,
  UiSelect,
  UiStatCard,
} from '../../../../../shared/ui';
import {
  CatalogLabelPipe,
  CatalogTonePipe,
  excerpt,
  incidentNumber,
} from '../../../components/catalog-label.pipe';
import { IncidentFormModal } from '../../../components/incident-form-modal';
import { IncidentReviewModal } from '../../../components/incident-review-modal';
import { IncidentsService } from '../../../data-access/incidents.service';
import {
  INCIDENT_PRIORITY_LABELS,
  INCIDENT_PRIORITY_TONES,
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_TONES,
  INCIDENT_STATUSES,
  INCIDENT_TYPE_LABELS,
  INCIDENT_TYPES,
  IncidentDetailView,
  IncidentFilters,
  IncidentStatus,
  IncidentType,
  optionsOf,
  REVIEW_ACTION_LABELS,
  REVIEW_TRANSITIONS,
  ReviewAction,
} from '../../../data-access/students.models';
import { resourceValue } from '../../../../../core/resource/resource-value';

const DEFAULT_FILTERS: IncidentFilters = { status: 'pending', type: null, page: 1, pageSize: 20 };

interface KpiCard {
  status: IncidentStatus;
  label: string;
  icon: string;
  tone: StatTone;
}

const KPI_CARDS: readonly KpiCard[] = [
  { status: 'pending', label: 'Pendientes', icon: 'clock', tone: 'warning' },
  { status: 'in_review', label: 'En revisión', icon: 'magnifying-glass', tone: 'info' },
  { status: 'approved', label: 'Aprobadas', icon: 'check-circle', tone: 'success' },
  { status: 'rejected', label: 'Rechazadas', icon: 'exclamation-circle', tone: 'danger' },
  { status: 'closed', label: 'Cerradas', icon: 'inbox', tone: 'neutral' },
];

const ACTION_ICONS: Record<ReviewAction, string> = {
  in_review: 'magnifying-glass',
  approved: 'check',
  rejected: 'x-mark',
  closed: 'inbox',
};

/** Bandeja de incidencias y solicitudes del personal (análisis 03 §4.12). */
@Component({
  selector: 'app-incidents-inbox-page',
  imports: [
    CatalogLabelPipe,
    CatalogTonePipe,
    DateEsPipe,
    IncidentFormModal,
    IncidentReviewModal,
    ReactiveFormsModule,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiFilterBar,
    UiPagination,
    UiSelect,
    UiStatCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Incidencias y solicitudes</h1>
        <p class="page-header__subtitle">
          Flujos de aprobación para bajas, ajustes y cierres de caja
        </p>
      </div>
      <button ui-button variant="primary" icon="plus" type="button" (click)="formOpen.set(true)">
        Nueva solicitud
      </button>
    </div>

    <div class="kpis" role="group" aria-label="Incidencias por estado">
      @for (k of kpiCards; track k.status) {
        <button
          type="button"
          class="kpi"
          [class.kpi--active]="filters().status === k.status"
          [attr.aria-pressed]="filters().status === k.status"
          [attr.aria-label]="'Filtrar ' + k.label + ': ' + (val(kpis)?.[k.status] ?? 0)"
          (click)="filterByStatus(k.status)"
        >
          <ui-stat-card
            [label]="k.label"
            [value]="val(kpis)?.[k.status] ?? null"
            [icon]="k.icon"
            [tone]="k.tone"
            [loading]="kpis.isLoading()"
          />
        </button>
      }
    </div>

    <section class="ui-card stack">
      <ui-filter-bar [showClear]="hasFilters()" (apply)="apply()" (clear)="clear()">
        <div class="cluster" [formGroup]="filterForm">
          <ui-select
            class="filter"
            formControlName="status"
            [options]="statusOptions"
            placeholder="Todos los estados"
            ariaLabel="Estado"
          />
          <ui-select
            class="filter"
            formControlName="type"
            [options]="typeOptions"
            placeholder="Todos los tipos"
            ariaLabel="Tipo de incidencia"
          />
        </div>
      </ui-filter-bar>

      @if (result.error(); as err) {
        <ui-alert tone="error" title="No se pudo cargar la bandeja">{{ err.message }}</ui-alert>
      }
      <ui-data-table
        caption="Incidencias y solicitudes"
        [columns]="columns"
        [rows]="page()?.items ?? []"
        [loading]="result.isLoading()"
        [actions]="actions"
        rowClickable
        emptyIcon="check-circle"
        [emptyTitle]="emptyTitle()"
        emptyMessage="Cambia los filtros o registra una nueva solicitud."
        (action)="onAction($event)"
        (rowClick)="openDetail($event)"
      >
        <ng-template uiCell="type" let-row>{{ row.type | catalogLabel: typeLabels }}</ng-template>
        <ng-template uiCell="title" let-row>
          <strong>{{ row.title }}</strong>
          @if (row.description) {
            <span class="sub">{{ short(row.description) }}</span>
          }
        </ng-template>
        <ng-template uiCell="priority" let-row>
          <ui-badge [tone]="row.priority | catalogTone: priorityTones">
            {{ row.priority | catalogLabel: priorityLabels }}
          </ui-badge>
        </ng-template>
        <ng-template uiCell="createdAt" let-row>{{
          row.createdAt | dateEs: 'datetime'
        }}</ng-template>
        <ng-template uiCell="status" let-row>
          <ui-badge [tone]="row.status | catalogTone: statusTones">
            {{ row.status | catalogLabel: statusLabels }}
          </ui-badge>
        </ng-template>
        <ui-pagination
          uiTableFooter
          [page]="filters().page"
          [pageSize]="filters().pageSize"
          [total]="page()?.total ?? 0"
          (pageChange)="onPage($event)"
        />
      </ui-data-table>
    </section>

    <app-incident-form-modal [(open)]="formOpen" (created)="refresh()" />
    <app-incident-review-modal
      [(open)]="reviewOpen"
      [incident]="reviewTarget()"
      [action]="reviewAction()"
      (reviewed)="refresh()"
    />
  `,
  styles: `
    .kpis {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      margin-bottom: 1.25rem;
    }
    .kpi {
      all: unset;
      display: block;
      cursor: pointer;
      border-radius: var(--radius-lg);
    }
    .kpi:focus-visible {
      box-shadow: 0 0 0 3px var(--color-primary-ring);
    }
    .kpi--active ui-stat-card {
      outline: 2px solid var(--color-primary);
      outline-offset: -2px;
      border-radius: var(--radius-lg);
    }
    .filter {
      min-width: 12rem;
    }
    .sub {
      display: block;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
  `,
})
export class IncidentsInboxPage {
  /** Valor del recurso o `undefined` si carga o falló (ver `resourceValue`). */
  protected readonly val = resourceValue;
  private readonly incidents = inject(IncidentsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly kpiCards = KPI_CARDS;
  protected readonly typeLabels = INCIDENT_TYPE_LABELS;
  protected readonly statusLabels = INCIDENT_STATUS_LABELS;
  protected readonly statusTones = INCIDENT_STATUS_TONES;
  protected readonly priorityLabels = INCIDENT_PRIORITY_LABELS;
  protected readonly priorityTones = INCIDENT_PRIORITY_TONES;
  protected readonly statusOptions = optionsOf(INCIDENT_STATUSES, INCIDENT_STATUS_LABELS);
  protected readonly typeOptions = optionsOf(INCIDENT_TYPES, INCIDENT_TYPE_LABELS);

  protected readonly filters = signal<IncidentFilters>({ ...DEFAULT_FILTERS });
  protected readonly filterForm = this.fb.group({
    status: this.fb.control<IncidentStatus | null>(DEFAULT_FILTERS.status ?? null),
    type: this.fb.control<IncidentType | null>(null),
  });

  protected readonly result = rxResource({
    params: () => this.filters(),
    stream: ({ params }) => this.incidents.list(params),
  });
  protected readonly page = computed(() => resourceValue(this.result, null));
  protected readonly kpis = rxResource({ stream: () => this.incidents.kpis() });

  protected readonly formOpen = signal(false);
  protected readonly reviewOpen = signal(false);
  protected readonly reviewTarget = signal<IncidentDetailView | null>(null);
  protected readonly reviewAction = signal<ReviewAction | null>(null);

  protected readonly hasFilters = computed(() => {
    const f = this.filters();
    return f.status !== DEFAULT_FILTERS.status || f.type !== null;
  });
  protected readonly emptyTitle = computed(() => {
    const status = this.filters().status;
    return status
      ? `Sin incidencias en estado «${INCIDENT_STATUS_LABELS[status].toLowerCase()}»`
      : 'Sin incidencias registradas';
  });

  protected readonly columns: TableColumn<IncidentDetailView>[] = [
    { key: 'id', header: 'N.º', mono: true, format: (v) => incidentNumber(v as number) },
    { key: 'type', header: 'Tipo', hideBelow: 'md' },
    { key: 'title', header: 'Título' },
    { key: 'studentName', header: 'Alumno', hideBelow: 'md', format: (v) => (v as string) || '—' },
    {
      key: 'requestedByName',
      header: 'Solicitado por',
      hideBelow: 'lg',
      format: (v) => (v as string) || '—',
    },
    { key: 'priority', header: 'Prioridad', hideBelow: 'lg' },
    { key: 'createdAt', header: 'Fecha', hideBelow: 'lg' },
    { key: 'status', header: 'Estado' },
  ];

  protected readonly actions: TableAction<IncidentDetailView>[] = [
    { id: 'view', label: 'Ver detalle', icon: 'eye' },
    ...(Object.keys(REVIEW_ACTION_LABELS) as ReviewAction[]).map((action) => ({
      id: action,
      label: REVIEW_ACTION_LABELS[action],
      icon: ACTION_ICONS[action],
      tone: action === 'rejected' ? ('danger' as const) : ('default' as const),
      hidden: (row: IncidentDetailView) => !this.allowed(row).includes(action),
    })),
  ];

  protected short(text: string): string {
    return excerpt(text, 80);
  }

  protected filterByStatus(status: IncidentStatus): void {
    const next = this.filters().status === status ? null : status;
    this.filterForm.setValue({ status: next, type: this.filterForm.controls.type.value });
    this.filters.update((f) => ({ ...f, status: next, page: 1 }));
  }

  protected apply(): void {
    const v = this.filterForm.getRawValue();
    this.filters.update((f) => ({ ...f, ...v, page: 1 }));
  }

  protected clear(): void {
    this.filterForm.reset();
    this.filters.set({ ...DEFAULT_FILTERS });
  }

  protected onPage(change: PageChange): void {
    this.filters.update((f) => ({ ...f, page: change.page, pageSize: change.pageSize }));
  }

  protected onAction(event: TableActionEvent<IncidentDetailView>): void {
    if (event.action === 'view') {
      this.openDetail(event.row);
      return;
    }
    this.reviewTarget.set(event.row);
    this.reviewAction.set(event.action as ReviewAction);
    this.reviewOpen.set(true);
  }

  protected openDetail(row: IncidentDetailView): void {
    void this.router.navigate([row.id], { relativeTo: this.route });
  }

  protected refresh(): void {
    this.result.reload();
    this.kpis.reload();
  }

  private allowed(row: IncidentDetailView): readonly ReviewAction[] {
    return REVIEW_TRANSITIONS[row.status as IncidentStatus] ?? [];
  }
}
