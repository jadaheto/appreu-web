import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError, ToastService } from '../../../../core';
import {
  DateEsPipe,
  PageChange,
  TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiFormField,
  UiInput,
  UiPagination,
  UiSelect,
  UiTextarea,
} from '../../../../shared/ui';
import { CatalogLabelPipe, CatalogTonePipe, excerpt } from '../../components/catalog-label.pipe';
import { PortalStudentGate } from '../../components/portal-student-gate';
import { IncidentsService } from '../../data-access/incidents.service';
import { PortalContextStore } from '../../data-access/portal-context.store';
import {
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_TONES,
  INCIDENT_TYPE_LABELS,
  IncidentType,
  IncidentView,
  optionsOf,
  PORTAL_INCIDENT_TYPES,
} from '../../data-access/students.models';
import { resourceValue } from '../../../../core/resource/resource-value';

/** Mis incidencias (análisis 03 §4.9): historial del estudiante y reporte de una nueva. */
@Component({
  selector: 'app-my-incidents-page',
  imports: [
    CatalogLabelPipe,
    CatalogTonePipe,
    DateEsPipe,
    PortalStudentGate,
    ReactiveFormsModule,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiFormField,
    UiInput,
    UiPagination,
    UiSelect,
    UiTextarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Mis incidencias</h1>
        <p class="page-header__subtitle">
          Reporta incapacidades, salidas y otras novedades a la institución.
        </p>
      </div>
      @if (store.selectedId() && !formOpen()) {
        <button ui-button type="button" variant="primary" icon="plus" (click)="formOpen.set(true)">
          Nueva incidencia
        </button>
      }
    </div>
    <app-portal-student-gate>
      @if (formOpen()) {
        <section class="ui-card stack" aria-labelledby="report-title">
          <h2 class="ui-card__title" id="report-title">Reportar incidencia</h2>
          <form id="report-form" class="stack" [formGroup]="form" (ngSubmit)="submit()">
            @if (serverError(); as err) {
              <ui-alert tone="error">{{ err }}</ui-alert>
            }
            <div class="grid grid--2">
              <ui-form-field label="Título" required>
                <ui-input
                  formControlName="title"
                  [maxlength]="255"
                  placeholder="Ej.: Incapacidad médica"
                />
              </ui-form-field>
              <ui-form-field label="Tipo" required>
                <ui-select formControlName="type" [options]="typeOptions" [placeholder]="null" />
              </ui-form-field>
            </div>
            <ui-form-field label="Descripción">
              <ui-textarea formControlName="description" [rows]="3" [maxlength]="5000" />
            </ui-form-field>
            <div class="cluster">
              <button ui-button type="button" (click)="cancel()">Cancelar</button>
              <button ui-button type="submit" variant="primary" icon="check" [loading]="saving()">
                Enviar
              </button>
            </div>
          </form>
        </section>
      }

      <section class="ui-card stack">
        @if (result.error(); as err) {
          <ui-alert tone="error" title="No se pudieron cargar las incidencias">{{
            err.message
          }}</ui-alert>
        }
        <ui-data-table
          caption="Incidencias del estudiante"
          [columns]="columns"
          [rows]="page()?.items ?? []"
          [loading]="result.isLoading()"
          emptyIcon="check-circle"
          emptyTitle="No hay incidencias reportadas"
        >
          <ng-template uiCell="createdAt" let-row>{{
            row.createdAt | dateEs: 'datetime'
          }}</ng-template>
          <ng-template uiCell="title" let-row>
            <strong>{{ row.title }}</strong>
            @if (row.description) {
              <span class="sub">{{ short(row.description) }}</span>
            }
            @if (row.reviewNotes) {
              <span class="sub notes">Respuesta: {{ row.reviewNotes }}</span>
            }
          </ng-template>
          <ng-template uiCell="type" let-row>{{ row.type | catalogLabel: typeLabels }}</ng-template>
          <ng-template uiCell="status" let-row>
            <ui-badge [tone]="row.status | catalogTone: statusTones">
              {{ row.status | catalogLabel: statusLabels }}
            </ui-badge>
          </ng-template>
          <ui-pagination
            uiTableFooter
            [page]="paging().page"
            [pageSize]="paging().pageSize"
            [total]="page()?.total ?? 0"
            (pageChange)="onPage($event)"
          />
        </ui-data-table>
      </section>
    </app-portal-student-gate>
  `,
  styles: `
    section + section {
      margin-top: 1.25rem;
    }
    .sub {
      display: block;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
    .notes {
      font-style: italic;
    }
  `,
})
export class MyIncidentsPage {
  private readonly incidents = inject(IncidentsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly store = inject(PortalContextStore);

  protected readonly typeLabels = INCIDENT_TYPE_LABELS;
  protected readonly statusLabels = INCIDENT_STATUS_LABELS;
  protected readonly statusTones = INCIDENT_STATUS_TONES;
  protected readonly typeOptions = optionsOf(PORTAL_INCIDENT_TYPES, INCIDENT_TYPE_LABELS);

  protected readonly paging = signal({ page: 1, pageSize: 20 });
  protected readonly result = rxResource({
    params: () => {
      const id = this.store.selectedId();
      return id ? { id, ...this.paging() } : undefined;
    },
    stream: ({ params }) => this.incidents.forStudent(params.id, params.page, params.pageSize),
  });
  protected readonly page = computed(() => resourceValue(this.result, null));

  protected readonly columns: TableColumn<IncidentView>[] = [
    { key: 'createdAt', header: 'Fecha', hideBelow: 'md' },
    { key: 'title', header: 'Título' },
    { key: 'type', header: 'Tipo', hideBelow: 'md' },
    { key: 'status', header: 'Estado' },
  ];

  protected readonly formOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    type: this.fb.control<IncidentType>('otra', Validators.required),
    description: ['', Validators.maxLength(5000)],
  });

  protected short(text: string): string {
    return excerpt(text, 100);
  }

  protected onPage(change: PageChange): void {
    this.paging.set({ page: change.page, pageSize: change.pageSize });
  }

  protected cancel(): void {
    this.form.reset();
    this.serverError.set(null);
    this.formOpen.set(false);
  }

  protected submit(): void {
    const id = this.store.selectedId();
    if (!id || this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.serverError.set(null);
    this.incidents.report(id, this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Incidencia reportada. La institución la revisará.');
        this.cancel();
        this.paging.update((p) => ({ ...p, page: 1 }));
        this.result.reload();
      },
      error: (err: ApiError) => {
        this.saving.set(false);
        this.serverError.set(err.message);
      },
    });
  }
}
