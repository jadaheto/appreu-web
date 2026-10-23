import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  type TabItem,
  type TableColumn,
  UiAlert,
  UiBadge,
  UiCellDef,
  UiDataTable,
  UiEmptyState,
  UiTabs,
} from '../../../../shared/ui';
import { GradeValue } from '../../components/grade-value';
import { PerformanceBadge } from '../../components/performance-badge';
import { PortalStudentBar } from '../../components/portal-student-bar';
import {
  formatScore,
  PERFORMANCE_SCALE,
  PERFORMANCE_TONES,
} from '../../data-access/academic.labels';
import type { GradeLine } from '../../data-access/academic.models';
import { AssessmentService } from '../../data-access/assessment.service';
import { PortalContextService } from '../../data-access/portal-context.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** Mis notas (legacy `student/mis_notas.php`): notas por período con desempeño y promedio. */
@Component({
  selector: 'app-my-grades-page',
  imports: [
    UiAlert,
    UiBadge,
    UiCellDef,
    UiDataTable,
    UiEmptyState,
    UiTabs,
    GradeValue,
    PerformanceBadge,
    PortalStudentBar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Notas</h1>
        <p class="page-header__subtitle">
          Calificaciones por período
          {{ grades()?.academicYear ? '· Año ' + grades()!.academicYear : '' }}
        </p>
      </div>
    </div>

    <app-portal-student-bar />

    @if (ctx.selectedId()) {
      @if (data.error()) {
        <ui-alert tone="error" title="No se pudieron cargar las notas">{{
          data.error()?.message
        }}</ui-alert>
      } @else if (!data.isLoading() && grades() && !grades()!.periods.length) {
        <section class="ui-card">
          <ui-empty-state
            icon="academic-cap"
            title="Aún no hay notas"
            message="Las calificaciones aparecerán aquí cuando los docentes las registren."
          />
        </section>
      } @else {
        <ui-tabs
          [tabs]="periodTabs()"
          [active]="activeTab()"
          (activeChange)="selectPeriod($event)"
          variant="pill"
          ariaLabel="Períodos"
        >
          <ui-data-table
            caption="Notas por asignatura"
            [columns]="columns"
            [rows]="grades()?.lines ?? []"
            [trackBy]="trackLine"
            [loading]="data.isLoading()"
            emptyTitle="Sin notas en este período"
            emptyIcon="academic-cap"
          >
            <ng-template uiCell="subjectName" let-row>
              <span class="strong">{{ row.subjectName }}</span>
              @if (row.teacherName) {
                <span class="sub">Prof. {{ row.teacherName }}</span>
              }
            </ng-template>
            <ng-template uiCell="area" let-value="value">
              <ui-badge tone="neutral">{{ value }}</ui-badge>
            </ng-template>
            <ng-template uiCell="finalScore" let-row>
              <app-grade-value [value]="row.finalScore" [passing]="row.passing" [strong]="true" />
            </ng-template>
            <ng-template uiCell="performance" let-row>
              <app-performance-badge [performance]="row.performance" />
            </ng-template>
            <ng-template uiCell="observations" let-value="value">
              <span class="obs">{{ value || '—' }}</span>
            </ng-template>
          </ui-data-table>

          @if (grades()?.average !== null && grades()?.average !== undefined) {
            <div class="avg ui-card" role="status">
              <span>Promedio general</span>
              <app-grade-value
                [value]="grades()!.average"
                [passing]="grades()!.passing"
                [strong]="true"
              />
              <app-performance-badge [performance]="grades()!.averagePerformance" />
            </div>
          }
        </ui-tabs>

        <section class="scale" aria-label="Escala de valoración">
          <h2>Escala de valoración</h2>
          <ul>
            @for (s of scale; track s.level) {
              <li>
                <ui-badge [tone]="tones[s.level]">{{ s.label }}</ui-badge>
                <span class="font-mono">{{ s.range }}</span>
              </li>
            }
          </ul>
        </section>
      }
    }
  `,
  styles: `
    .strong {
      display: block;
      font-weight: 600;
    }
    .sub {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
    .obs {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }
    .avg {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: var(--space-3);
      margin-top: var(--space-4);
      font-weight: 600;
    }
    .scale {
      margin-top: var(--space-6);
    }
    .scale h2 {
      font-size: var(--text-sm);
      text-transform: uppercase;
      color: var(--color-text-muted);
      margin-bottom: var(--space-2);
    }
    .scale ul {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: var(--text-sm);
    }
  `,
})
export class MyGradesPage {
  protected readonly ctx = inject(PortalContextService);
  private readonly assessment = inject(AssessmentService);

  protected readonly periodId = signal<number | null>(null);
  protected readonly data = rxResource({
    params: () => {
      const studentId = this.ctx.selectedId();
      return studentId ? { studentId, periodId: this.periodId() } : undefined;
    },
    stream: ({ params }) => this.assessment.studentGrades(params.studentId, params.periodId),
  });
  protected readonly grades = computed(() => resourceValue(this.data, null));
  protected readonly periodTabs = computed<TabItem[]>(() =>
    (this.grades()?.periods ?? []).map((p) => ({ id: String(p.id), label: p.name })),
  );
  protected readonly activeTab = computed(() => {
    const id = this.grades()?.selectedPeriodId;
    return id ? String(id) : null;
  });

  protected readonly scale = PERFORMANCE_SCALE;
  protected readonly tones = PERFORMANCE_TONES;
  protected readonly trackLine = (l: GradeLine) => l.subjectId;
  protected readonly columns: TableColumn<GradeLine>[] = [
    { key: 'subjectName', header: 'Asignatura', sortable: true },
    { key: 'area', header: 'Área', hideBelow: 'md' },
    {
      key: 'cognitive',
      header: 'Cogn. 60%',
      align: 'center',
      mono: true,
      format: (v) => formatScore(v as number),
      hideBelow: 'sm',
    },
    {
      key: 'procedural',
      header: 'Proc. 30%',
      align: 'center',
      mono: true,
      format: (v) => formatScore(v as number),
      hideBelow: 'sm',
    },
    {
      key: 'attitudinal',
      header: 'Acti. 10%',
      align: 'center',
      mono: true,
      format: (v) => formatScore(v as number),
      hideBelow: 'sm',
    },
    { key: 'finalScore', header: 'Nota final', align: 'center', sortable: true },
    { key: 'performance', header: 'Valoración' },
    { key: 'observations', header: 'Observaciones', hideBelow: 'lg' },
  ];

  constructor() {
    // Al cambiar de estudiante se vuelve al período por defecto de la API.
    effect(() => {
      this.ctx.selectedId();
      this.periodId.set(null);
    });
  }

  protected selectPeriod(id: string | null): void {
    this.periodId.set(id ? Number(id) : null);
  }
}
