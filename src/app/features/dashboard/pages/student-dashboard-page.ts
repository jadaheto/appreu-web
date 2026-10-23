import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  BadgeTone,
  DateEsPipe,
  formatCop,
  UiAlert,
  UiAvatar,
  UiBadge,
  UiButton,
  UiChip,
  UiIcon,
  UiStatCard,
} from '../../../shared/ui';
import { DashboardService } from '../data-access/dashboard.service';
import { DashboardCard, PortalDashboardBase } from './portal-dashboard.base';
import { resourceValue } from '../../../core/resource/resource-value';

const INCIDENT_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pendiente', tone: 'warning' },
  in_review: { label: 'En revisión', tone: 'info' },
  approved: { label: 'Aprobada', tone: 'success' },
  rejected: { label: 'Rechazada', tone: 'danger' },
  closed: { label: 'Cerrada', tone: 'neutral' },
};

/**
 * Inicio del portal del estudiante/acudiente. No existe un endpoint único: se
 * compone con `GET /api/portal/context` (estudiantes visibles) y
 * `GET /api/portal/students/:id/dashboard` (saldo, rendimiento, incidencias).
 */
@Component({
  selector: 'app-student-dashboard-page',
  imports: [
    RouterLink,
    DateEsPipe,
    UiAlert,
    UiAvatar,
    UiBadge,
    UiButton,
    UiChip,
    UiIcon,
    UiStatCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Hola, {{ firstName() }} 👋</h1>
        <p class="page-header__subtitle">Notas, pagos y documentos del estudiante.</p>
      </div>
    </div>

    @if (contextError(); as e) {
      <ui-alert tone="error" title="No se pudo cargar tu portal" class="mb">
        {{ e.message }}
        <button ui-button size="sm" variant="ghost" (click)="context.reload()">Reintentar</button>
      </ui-alert>
    } @else if (context.hasValue() && !students().length) {
      <ui-alert tone="info" title="Cuenta sin estudiantes vinculados" class="mb">
        Tu usuario no está vinculado a ningún estudiante activo. Comunícate con la institución.
      </ui-alert>
    }

    @if (students().length > 1) {
      <div class="cluster mb" role="group" aria-label="Seleccionar estudiante">
        @for (s of students(); track s.id) {
          <button ui-chip [active]="s.id === selectedId()" (click)="selectedId.set(s.id)">
            {{ s.fullName }}
          </button>
        }
      </div>
    }

    @if (selected(); as s) {
      <section class="student ui-card mb" aria-label="Estudiante">
        <ui-avatar [name]="s.fullName" size="lg" />
        <div>
          <strong>{{ s.fullName }}</strong>
          <p class="text-muted">
            <span class="font-mono">{{ s.code }}</span>
            @if (s.placement; as p) {
              · {{ p.gradeName }} · {{ p.classroomName }} · {{ p.academicYear }}
            }
          </p>
        </div>
      </section>

      @if (dashboardError(); as e) {
        <ui-alert tone="error" title="No se pudieron cargar los indicadores" class="mb">
          {{ e.message }}
          <button ui-button size="sm" variant="ghost" (click)="summary.reload()">Reintentar</button>
        </ui-alert>
      } @else {
        <section class="grid grid--4 mb" aria-label="Indicadores">
          @for (card of cards(); track card.label) {
            <ui-stat-card
              variant="border"
              [label]="card.label"
              [icon]="card.icon"
              [tone]="card.tone"
              [value]="card.value"
              [hint]="card.hint ?? ''"
              [loading]="summary.isLoading()"
            />
          }
        </section>

        @if (data()?.recentIncidents?.length) {
          <section class="ui-card mb" aria-labelledby="incidents-title">
            <h2 id="incidents-title" class="ui-card__title">Incidencias recientes</h2>
            <ul class="incidents">
              @for (i of data()!.recentIncidents; track i.id) {
                <li>
                  <div>
                    <strong>{{ i.title }}</strong>
                    <span class="text-muted"> · {{ i.createdAt | dateEs }}</span>
                  </div>
                  <ui-badge [tone]="incidentTone(i.status)">{{
                    incidentStatus(i.status)
                  }}</ui-badge>
                </li>
              }
            </ul>
          </section>
        }
      }
    }

    <section aria-labelledby="shortcuts-title">
      <h2 id="shortcuts-title" class="section-title">Accesos rápidos</h2>
      <div class="grid grid--3">
        @for (item of shortcuts(); track item.key) {
          <a class="shortcut ui-card" [routerLink]="item.route">
            <span class="icon"><ui-icon [name]="item.icon" [size]="22" /></span>
            <span class="label">{{ item.label }}</span>
            <ui-icon name="chevron-right" [size]="18" class="chev" />
          </a>
        }
      </div>
    </section>
  `,
  styleUrl: './portal-dashboard.scss',
})
export class StudentDashboardPage extends PortalDashboardBase {
  private readonly dashboard = inject(DashboardService);

  protected readonly context = rxResource({ stream: () => this.dashboard.portalContext() });
  protected readonly students = computed(() => resourceValue(this.context)?.students ?? []);
  protected readonly selectedId = linkedSignal<number | null>(() => this.students()[0]?.id ?? null);
  protected readonly selected = computed(
    () => this.students().find((s) => s.id === this.selectedId()) ?? null,
  );
  protected readonly contextError = computed(() => this.describeError(this.context.error()));

  protected readonly summary = rxResource({
    params: () => this.selectedId() ?? undefined,
    stream: ({ params }) => this.dashboard.student(params),
  });
  protected readonly data = computed(() => resourceValue(this.summary, null));
  protected readonly dashboardError = computed(() => this.describeError(this.summary.error()));

  protected readonly cards = computed<DashboardCard[]>(() => {
    const d = this.data();
    const balance = d?.finance.balance ?? 0;
    return [
      {
        label: 'Saldo pendiente',
        icon: 'banknotes',
        tone: balance > 0 ? 'danger' : 'success',
        value: d ? formatCop(balance) : null,
        hint: d
          ? d.finance.overdueCount
            ? `${d.finance.overdueCount} cargo(s) vencido(s)`
            : 'Al día'
          : '',
      },
      {
        label: 'Promedio general',
        icon: 'chart-bar',
        tone: 'primary',
        value: d
          ? d.performance.average != null
            ? d.performance.average.toFixed(1)
            : 'Sin notas'
          : null,
        hint:
          d && d.performance.percentage != null
            ? `${d.performance.percentage} % · año ${d.performance.academicYear}`
            : '',
      },
      {
        label: 'Grado',
        icon: 'academic-cap',
        tone: 'info',
        value: d ? (d.student.placement?.gradeName ?? 'Sin matrícula') : null,
        hint: d?.student.placement?.classroomName ?? '',
      },
      {
        label: 'Incidencias recientes',
        icon: 'exclamation-triangle',
        tone: 'warning',
        value: d?.recentIncidents.length ?? null,
        hint: d
          ? `${d.recentIncidents.filter((i) => i.status === 'pending').length} pendiente(s)`
          : '',
      },
    ];
  });

  protected incidentStatus(status: string): string {
    return INCIDENT_STATUS[status]?.label ?? status;
  }
  protected incidentTone(status: string): BadgeTone {
    return INCIDENT_STATUS[status]?.tone ?? 'neutral';
  }
}
