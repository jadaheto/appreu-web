import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CopCurrencyPipe, UiPrintableSheet } from '../../../shared/ui';
import type { IssuedCertificate } from '../data-access/hr.models';
import { longDate, shortDate } from '../data-access/hr-ui';
import { institutionNit } from './payslip-sheet';

/**
 * Certificado laboral imprimible con el contenido congelado que devuelve la API
 * al expedirlo (incluye el código de verificación persistido).
 */
@Component({
  selector: 'app-employment-certificate-sheet',
  imports: [UiPrintableSheet, CopCurrencyPipe, UpperCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './hr-document.scss',
  template: `
    @let c = certificate().content;
    <ui-printable-sheet
      [institutionName]="c.institution.name"
      [nit]="nit()"
      [address]="c.institution.address ?? ''"
      [city]="c.institution.city ?? ''"
      [logoUrl]="c.institution.logo"
      documentTitle="Certificado laboral"
      [documentNumber]="c.verificationCode"
      [issuedAt]="'Expedido el ' + issued()"
    >
      <div uiSheetActions><ng-content select="[sheetActions]" /></div>

      <p class="paragraph heading">
        EL SUSCRITO REPRESENTANTE LEGAL DE {{ c.institution.name | uppercase }}<br />CERTIFICA:
      </p>
      <p class="paragraph">
        Que <strong>{{ c.employeeName }}</strong
        >, identificado(a) con {{ c.documentLabel }} No. <strong>{{ c.documentNumber }}</strong
        >, {{ c.currentlyEmployed ? 'labora' : 'laboró' }} en esta institución
        @if (c.hireDate) {
          desde el {{ hire() }}
        }
        @if (!c.currentlyEmployed && c.retirementDate) {
          hasta el {{ retired() }}
        }
        mediante contrato de {{ c.contractLabel }}
        @if (c.position) {
          , desempeñando el cargo de <strong>{{ c.position }}</strong>
        }
        @if (c.department) {
          en el área de {{ c.department }}
        }
        .
      </p>
      @if (c.salary !== null) {
        <p class="paragraph">
          {{ c.currentlyEmployed ? 'Devenga' : 'Devengó' }} un salario básico mensual de
          {{ c.salaryInWords }} (<strong>{{ c.salary | cop }}</strong
          >).
        </p>
      }
      <p class="paragraph">
        La presente certificación se expide a solicitud del interesado, con destino a
        {{ c.addressee || 'quien pueda interesar' }}, el {{ issuedLong() }}.
      </p>
      <p class="paragraph">Cordialmente,</p>
      <div class="signature">
        <p>{{ c.institution.rectorName || 'Representante legal' }}</p>
        <p>Representante Legal / RR. HH.</p>
        <p>{{ c.institution.name }}</p>
      </div>

      <p uiSheetFooter>
        Código de verificación: <span class="code">{{ c.verificationCode }}</span
        >. La autenticidad de este certificado puede verificarse con la institución.
      </p>
    </ui-printable-sheet>
  `,
})
export class EmploymentCertificateSheet {
  readonly certificate = input.required<IssuedCertificate>();

  protected readonly nit = computed(() => institutionNit(this.certificate().content.institution));
  protected readonly issued = computed(() => shortDate(this.certificate().content.issuedOn));
  protected readonly issuedLong = computed(() => longDate(this.certificate().content.issuedOn));
  protected readonly hire = computed(() => longDate(this.certificate().content.hireDate));
  protected readonly retired = computed(() => longDate(this.certificate().content.retirementDate));
}
