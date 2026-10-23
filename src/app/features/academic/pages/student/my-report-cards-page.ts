import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { toApiError, ToastService } from '../../../../core';
import { formatDateEs, UiAlert, UiButton, UiEmptyState, UiSpinner } from '../../../../shared/ui';
import { GradeValue } from '../../components/grade-value';
import { PerformanceBadge } from '../../components/performance-badge';
import { PortalStudentBar } from '../../components/portal-student-bar';
import {
  formatIsoDate,
  isAutoToasted,
  safeFileName,
  saveBlob,
} from '../../data-access/academic.labels';
import type { ReportCardSummary } from '../../data-access/academic.models';
import { AssessmentService } from '../../data-access/assessment.service';
import { PortalContextService } from '../../data-access/portal-context.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** Mis boletines (legacy `student/boletines.php`, ahora también para acudientes). */
@Component({
  selector: 'app-my-report-cards-page',
  imports: [
    RouterLink,
    UiAlert,
    UiButton,
    UiEmptyState,
    UiSpinner,
    GradeValue,
    PerformanceBadge,
    PortalStudentBar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Boletines</h1>
        <p class="page-header__subtitle">Informes académicos generados por período.</p>
      </div>
    </div>

    <app-portal-student-bar />

    @if (ctx.selectedId(); as studentId) {
      @if (data.isLoading()) {
        <div class="center"><ui-spinner size="lg" label="Cargando boletines…" /></div>
      } @else if (data.error()) {
        <ui-alert tone="error" title="No se pudieron cargar los boletines">{{
          data.error()?.message
        }}</ui-alert>
      } @else if (!cards().length) {
        <section class="ui-card">
          <ui-empty-state
            icon="document-check"
            title="Aún no hay boletines"
            message="Los boletines estarán disponibles cuando la institución cierre cada período y los genere."
          />
        </section>
      } @else {
        <div class="cards">
          @for (c of cards(); track c.periodId) {
            <article class="card ui-card">
              <header>
                <p class="year font-mono">{{ c.academicYear }}</p>
                <h2>{{ c.periodName }}</h2>
                <p class="text-muted range">{{ fmt(c.startDate) }} – {{ fmt(c.endDate) }}</p>
              </header>
              <div class="score">
                <app-grade-value [value]="c.averageScore" [passing]="c.passing" [strong]="true" />
                <app-performance-badge [performance]="c.performance" />
              </div>
              <p class="text-muted meta">
                Generado {{ date(c.generatedAt) }} · Consultado {{ c.viewCount }}
                {{ c.viewCount === 1 ? 'vez' : 'veces' }}
              </p>
              <footer>
                <a
                  ui-button
                  variant="primary"
                  size="sm"
                  icon="eye"
                  [routerLink]="[studentId, c.periodId]"
                  >Ver boletín</a
                >
                <button
                  ui-button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon="download"
                  [loading]="downloading() === c.periodId"
                  [attr.aria-label]="'Descargar PDF de ' + c.periodName"
                  (click)="download(studentId, c)"
                >
                  PDF
                </button>
              </footer>
            </article>
          }
        </div>
        <ui-alert tone="info" title="¿Sabías que?" class="tip">
          Puedes imprimir el boletín desde la vista del boletín o descargar el PDF oficial para
          guardarlo.
        </ui-alert>
      }
    }
  `,
  styles: `
    .center {
      display: grid;
      place-items: center;
      padding: var(--space-8);
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
      gap: var(--space-4);
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .year {
      font-size: var(--text-xs);
      color: var(--color-primary);
      font-weight: 700;
    }
    h2 {
      font-size: var(--text-lg);
      color: var(--color-text-strong);
    }
    .range,
    .meta {
      font-size: var(--text-sm);
    }
    .score {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      font-size: var(--text-2xl);
    }
    footer {
      display: flex;
      gap: var(--space-2);
      margin-top: auto;
    }
    .tip {
      display: block;
      margin-top: var(--space-6);
    }
  `,
})
export class MyReportCardsPage {
  protected readonly ctx = inject(PortalContextService);
  private readonly assessment = inject(AssessmentService);
  private readonly toast = inject(ToastService);

  protected readonly data = rxResource({
    params: () => this.ctx.selectedId() ?? undefined,
    stream: ({ params }) => this.assessment.reportCardHistory(params),
  });
  protected readonly cards = computed(() => resourceValue(this.data, []));
  protected readonly downloading = signal<number | null>(null);
  protected readonly fmt = formatIsoDate;
  protected readonly date = (v: string) => formatDateEs(v);

  protected download(studentId: number, card: ReportCardSummary): void {
    this.downloading.set(card.periodId);
    this.assessment.reportCardPdf(studentId, card.periodId).subscribe({
      next: (blob) => {
        this.downloading.set(null);
        const student = this.ctx.selected()?.fullName ?? 'estudiante';
        saveBlob(blob, `${safeFileName(`boletin-${student}-${card.periodName}`)}.pdf`);
      },
      error: (err: unknown) => {
        this.downloading.set(null);
        const e = toApiError(err);
        if (!isAutoToasted(e.status)) this.toast.error(e.message);
      },
    });
  }
}
