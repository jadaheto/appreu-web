import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { toApiError, ToastService } from '../../../core';
import { UiAlert, UiButton, UiSpinner } from '../../../shared/ui';
import { ReportCardSheet } from '../components/report-card-sheet';
import { isAutoToasted, safeFileName, saveBlob } from '../data-access/academic.labels';
import { AssessmentService } from '../data-access/assessment.service';
import { resourceValue } from '../../../core/resource/resource-value';

/**
 * Boletín de un estudiante en un período: vista imprimible y descarga del PDF
 * generado por la API. Se usa en el portal del estudiante/acudiente y en
 * "Mis grupos" del director (la API valida el acceso).
 */
@Component({
  selector: 'app-report-card-page',
  imports: [RouterLink, UiAlert, UiButton, UiSpinner, ReportCardSheet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data.isLoading()) {
      <div class="center"><ui-spinner size="lg" label="Cargando boletín…" /></div>
    } @else if (data.error()) {
      <div class="no-print back">
        <a ui-button variant="ghost" icon="arrow-left" [routerLink]="backLink()">{{
          backLabel()
        }}</a>
      </div>
      <ui-alert tone="error" title="No se pudo abrir el boletín">{{
        data.error()?.message
      }}</ui-alert>
    } @else if (doc(); as d) {
      <app-report-card-sheet [doc]="d">
        <ng-container sheetActions>
          <a ui-button variant="ghost" icon="arrow-left" [routerLink]="backLink()">{{
            backLabel()
          }}</a>
          <button
            ui-button
            type="button"
            variant="secondary"
            icon="download"
            [loading]="downloading()"
            (click)="downloadPdf()"
          >
            Descargar PDF
          </button>
        </ng-container>
      </app-report-card-sheet>
    }
  `,
  styles: `
    .center {
      display: grid;
      place-items: center;
      padding: var(--space-8);
    }
    .back {
      margin-bottom: var(--space-4);
    }
  `,
})
export class ReportCardPage {
  private readonly assessment = inject(AssessmentService);
  private readonly toast = inject(ToastService);

  readonly studentId = input.required({ transform: numberAttribute });
  readonly periodId = input.required({ transform: numberAttribute });
  /** `data` de la ruta. */
  readonly backLink = input<string>('..');
  readonly backLabel = input<string>('Regresar');

  protected readonly data = rxResource({
    params: () => ({ studentId: this.studentId(), periodId: this.periodId() }),
    stream: ({ params }) => this.assessment.reportCard(params.studentId, params.periodId),
  });
  protected readonly doc = computed(() => resourceValue(this.data, null));
  protected readonly downloading = signal(false);

  protected downloadPdf(): void {
    const d = this.doc();
    this.downloading.set(true);
    this.assessment.reportCardPdf(this.studentId(), this.periodId()).subscribe({
      next: (blob) => {
        this.downloading.set(false);
        const name = d ? `boletin-${d.student.fullName}-${d.period.name}` : 'boletin';
        saveBlob(blob, `${safeFileName(name)}.pdf`);
      },
      error: (err: unknown) => {
        this.downloading.set(false);
        const e = toApiError(err);
        if (!isAutoToasted(e.status)) this.toast.error(e.message);
      },
    });
  }
}
