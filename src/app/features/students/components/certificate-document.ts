import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { APP_PATHS } from '../../../core';
import { UiPrintableSheet } from '../../../shared/ui';
import { CertificateDocumentView, usableImageUrl } from '../data-access/students.models';

/**
 * Certificado de estudio imprimible (análisis 03 §4.5). El texto lo compone la
 * API a partir del snapshot congelado al expedirlo; aquí solo se maqueta.
 */
@Component({
  selector: 'app-certificate-document',
  imports: [UiPrintableSheet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let d = doc();
    <ui-printable-sheet
      [institutionName]="d.institution.name"
      [nit]="d.institution.nit"
      [city]="d.institution.city"
      [logoUrl]="logo()"
      documentTitle="Certificado de estudio"
      [documentNumber]="d.certificate.verificationCode ?? ''"
      printLabel="Imprimir o guardar PDF"
    >
      <ng-container ngProjectAs="[uiSheetActions]"
        ><ng-content select="[uiSheetActions]"
      /></ng-container>
      <div class="doc">
        <h2 class="title">{{ d.text.title }}</h2>
        @for (p of d.text.paragraphs; track $index) {
          <p>{{ p }}</p>
        }
        <div class="sign">
          <div class="signature">
            @if (signature(); as src) {
              <img [src]="src" alt="Firma del rector(a)" />
            }
            <span class="line" aria-hidden="true"></span>
            <strong>{{ d.institution.rectorName || 'Rector(a)' }}</strong>
            <span>Rector(a)</span>
          </div>
          <p class="issued">
            Expedido el<br /><strong>{{ d.text.issuedOn }}</strong>
          </p>
        </div>
      </div>
      <p uiSheetFooter class="verify">
        @if (d.certificate.verificationCode) {
          Código de verificación:
          <strong class="font-mono">{{ d.certificate.verificationCode }}</strong>
          · Verifíquelo en <span class="font-mono">{{ verifyBase }}</span>
        }
      </p>
    </ui-printable-sheet>
  `,
  styles: `
    .doc {
      font-size: 1rem;
      line-height: 2;
      text-align: justify;
      color: #1e293b;
    }
    .title {
      text-align: center;
      font-size: 1.35rem;
      letter-spacing: 0.15em;
      margin: 1rem 0 1.5rem;
    }
    .doc p + p {
      margin-top: 1rem;
    }
    .sign {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-end;
      gap: 2rem;
      margin-top: 4rem;
      line-height: 1.4;
    }
    .signature {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 17.5rem;
      text-align: center;
    }
    .signature img {
      max-height: 80px;
      margin-bottom: -1rem;
    }
    .line {
      width: 100%;
      border-top: 1px solid #47557c;
      margin: 0.5rem 0;
    }
    .issued {
      text-align: right;
    }
    .verify {
      font-size: 0.75rem;
      color: #64748b;
    }
  `,
})
export class CertificateDocument {
  protected readonly verifyBase = `${inject(DOCUMENT).location?.origin ?? ''}/${APP_PATHS.verifyCertificate}`;

  readonly doc = input.required<CertificateDocumentView>();
  protected readonly logo = computed(() => usableImageUrl(this.doc().institution.logo));
  protected readonly signature = computed(() => usableImageUrl(this.doc().institution.signature));
}
