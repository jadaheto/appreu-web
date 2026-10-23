import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { CopCurrencyPipe, UiAlert, UiButton } from '../../../../shared/ui';
import { CertificatesPanel } from '../../components/certificates-panel';
import { EmploymentCertificateSheet } from '../../components/employment-certificate-sheet';
import { IncomeCertificateSheet } from '../../components/income-certificate-sheet';
import { PdfDownloadButton } from '../../components/pdf-download-button';
import { HrDocumentsService } from '../../data-access/hr-documents.service';
import { pdfFileName } from '../../data-access/hr-download';
import {
  CONTRACT_TYPE_LABELS,
  DOCUMENT_TYPE_LABELS,
  IncomeCertificate,
  IssuedCertificate,
} from '../../data-access/hr.models';
import { apiMessage, shortDate } from '../../data-access/hr-ui';
import { MyEmployeeService } from '../../data-access/my-employee.service';
import { resourceValue } from '../../../../core/resource/resource-value';

type Shown =
  { kind: 'employment'; data: IssuedCertificate } | { kind: 'income'; data: IncomeCertificate };

/** Mis certificados: laboral (con verificación) e ingresos y retenciones, imprimibles. */
@Component({
  selector: 'app-my-certificates-page',
  imports: [
    CopCurrencyPipe,
    UiAlert,
    UiButton,
    CertificatesPanel,
    EmploymentCertificateSheet,
    IncomeCertificateSheet,
    PdfDownloadButton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shown(); as doc) {
      @if (doc.kind === 'employment') {
        <app-employment-certificate-sheet [certificate]="doc.data">
          <app-pdf-download-button
            sheetActions
            variant="primary"
            [request]="employmentPdf(doc.data)"
            [fileName]="employmentFileName(doc.data)"
          />
          <button
            sheetActions
            ui-button
            variant="ghost"
            icon="arrow-left"
            (click)="shown.set(null)"
          >
            Volver
          </button>
        </app-employment-certificate-sheet>
      } @else {
        <app-income-certificate-sheet [certificate]="doc.data">
          <app-pdf-download-button
            sheetActions
            variant="primary"
            [request]="incomePdf(doc.data)"
            [fileName]="incomeFileName(doc.data)"
          />
          <button
            sheetActions
            ui-button
            variant="ghost"
            icon="arrow-left"
            (click)="shown.set(null)"
          >
            Volver
          </button>
        </app-income-certificate-sheet>
      }
    } @else {
      <div class="page-header">
        <div>
          <h1>Certificados</h1>
          <p class="page-header__subtitle">
            Expide tu certificado laboral y consulta tus ingresos del año.
          </p>
        </div>
      </div>
      @if (profile.error()) {
        <ui-alert tone="warning" title="No es posible expedir certificados">
          {{ apiMessage(profile.error()) }}
        </ui-alert>
      } @else {
        @if (data(); as e) {
          <section
            class="ui-card"
            style="margin-bottom: var(--space-6)"
            aria-label="Datos del certificado"
          >
            <h2 class="ui-card__title">Datos que se certifican</h2>
            <dl class="info">
              <div>
                <dt>Nombre</dt>
                <dd>{{ e.fullName }}</dd>
              </div>
              <div>
                <dt>Documento</dt>
                <dd>{{ docLabels[e.documentType] }} {{ e.documentNumber }}</dd>
              </div>
              <div>
                <dt>Cargo</dt>
                <dd>{{ e.position || '—' }}</dd>
              </div>
              <div>
                <dt>Fecha de ingreso</dt>
                <dd>{{ shortDate(e.hireDate) }}</dd>
              </div>
              <div>
                <dt>Tipo de contrato</dt>
                <dd>{{ contractLabels[e.contractType] }}</dd>
              </div>
              <div>
                <dt>Salario básico</dt>
                <dd class="font-mono">{{ e.baseSalary | cop }}</dd>
              </div>
            </dl>
            <p class="text-muted" style="margin-top: var(--space-4); font-size: var(--text-sm)">
              Si algún dato no es correcto, comunícate con RR. HH. antes de expedir el certificado.
            </p>
          </section>
        }
        <app-certificates-panel
          (employment)="shown.set({ kind: 'employment', data: $event })"
          (incomeReady)="shown.set({ kind: 'income', data: $event })"
        />
      }
    }
  `,
  styles: `
    dl.info {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
      gap: var(--space-4);
    }
    dl.info dt {
      font-size: var(--text-xs);
      text-transform: uppercase;
      color: var(--color-text-subtle);
    }
    dl.info dd {
      margin: 0;
      font-weight: 600;
      color: var(--color-text-strong);
    }
  `,
})
export class MyCertificatesPage {
  private readonly me = inject(MyEmployeeService);

  protected readonly apiMessage = apiMessage;
  protected readonly shortDate = shortDate;
  protected readonly docLabels: Readonly<Record<string, string>> = DOCUMENT_TYPE_LABELS;
  protected readonly contractLabels: Readonly<Record<string, string>> = CONTRACT_TYPE_LABELS;
  protected readonly profile = rxResource({ stream: () => this.me.profile() });
  protected readonly data = computed(() => resourceValue(this.profile, null));
  protected readonly shown = signal<Shown | null>(null);
  private readonly hrDocuments = inject(HrDocumentsService);

  protected employmentPdf(cert: IssuedCertificate): () => Observable<Blob> {
    return () => this.hrDocuments.documentPdf(cert.verificationCode);
  }
  protected employmentFileName(cert: IssuedCertificate): string {
    return pdfFileName('certificado-laboral', cert.verificationCode);
  }
  protected incomePdf(cert: IncomeCertificate): () => Observable<Blob> {
    return () => this.me.incomeCertificatePdf(cert.year);
  }
  protected incomeFileName(cert: IncomeCertificate): string {
    return pdfFileName('certificado-ingresos', cert.year);
  }
}
