import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { UiAlert, UiButton, UiSpinner } from '../../../shared/ui';
import { CertificateDocument } from '../components/certificate-document';
import { ToastService } from '../../../core';
import type { CertificateView } from '../data-access/students.models';
import { StudentsService } from '../data-access/students.service';
import { resourceValue } from '../../../core/resource/resource-value';

/**
 * Certificado de estudio imprimible (`GET /api/certificates/:id/document`).
 * Lo usan la secretaría (`/admin/alumnos/certificados/:id`) y el portal
 * (`/portal-estudiante/certificado/:id`); la API valida la propiedad.
 * "Descargar PDF" baja la versión oficial con QR (`GET /api/certificates/:id/pdf`).
 */
@Component({
  selector: 'app-certificate-print-page',
  imports: [CertificateDocument, UiAlert, UiButton, UiSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (doc.isLoading()) {
      <div class="center"><ui-spinner size="lg" /></div>
    } @else if (doc.error(); as err) {
      <ui-alert tone="error" title="No se pudo abrir el certificado">{{ err.message }}</ui-alert>
      <p class="back">
        <button ui-button type="button" icon="arrow-left" (click)="back()">Volver</button>
      </p>
    } @else if (document(); as d) {
      <app-certificate-document [doc]="d">
        <button
          uiSheetActions
          ui-button
          type="button"
          variant="primary"
          icon="download"
          [loading]="downloading()"
          (click)="downloadPdf(d.certificate)"
        >
          Descargar PDF
        </button>
        <button
          uiSheetActions
          ui-button
          type="button"
          variant="ghost"
          icon="arrow-left"
          (click)="back()"
        >
          Volver
        </button>
      </app-certificate-document>
    }
  `,
  styles: `
    .center {
      display: flex;
      justify-content: center;
      padding: 3rem 0;
    }
    .back {
      margin-top: 1rem;
    }
  `,
})
export class CertificatePrintPage {
  private readonly students = inject(StudentsService);
  private readonly location = inject(Location);
  private readonly toast = inject(ToastService);

  /** Parámetro de ruta `:certificateId`. */
  readonly certificateId = input<string>();

  protected readonly doc = rxResource({
    params: () => Number(this.certificateId()),
    stream: ({ params }) =>
      Number.isInteger(params) && params > 0 ? this.students.certificateDocument(params) : of(null),
  });
  protected readonly document = computed(() => resourceValue(this.doc, null));

  protected readonly downloading = signal(false);

  protected downloadPdf(certificate: CertificateView): void {
    if (this.downloading()) return;
    this.downloading.set(true);
    this.students.downloadCertificatePdf(certificate).subscribe({
      next: () => {
        this.downloading.set(false);
        this.toast.success('Certificado descargado en PDF.');
      },
      error: () => this.downloading.set(false),
    });
  }

  protected back(): void {
    this.location.back();
  }
}
