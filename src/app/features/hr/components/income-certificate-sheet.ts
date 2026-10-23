import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { BrandingService } from '../../../core';
import { CopCurrencyPipe, UiPrintableSheet } from '../../../shared/ui';
import type { IncomeCertificate } from '../data-access/hr.models';
import { shortDate, isoDate } from '../data-access/hr-ui';

/**
 * Resumen anual de ingresos y retenciones (informativo). La API no incluye los
 * datos de la institución en esta respuesta, así que se usa la marca del colegio.
 */
@Component({
  selector: 'app-income-certificate-sheet',
  imports: [UiPrintableSheet, CopCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './hr-document.scss',
  template: `
    @let c = certificate();
    <ui-printable-sheet
      [institutionName]="branding.schoolName()"
      [logoUrl]="branding.logoUrl()"
      documentTitle="Certificado de ingresos y retenciones"
      [documentNumber]="'Año gravable ' + c.year"
      [issuedAt]="'Expedido el ' + today"
    >
      <div uiSheetActions><ng-content select="[sheetActions]" /></div>

      <dl class="facts">
        <div>
          <dt>Empleado</dt>
          <dd>{{ c.employee.fullName }}</dd>
        </div>
        <div>
          <dt>Documento</dt>
          <dd>{{ c.employee.document }}</dd>
        </div>
        <div>
          <dt>Año gravable</dt>
          <dd>{{ c.year }}</dd>
        </div>
        <div>
          <dt>Pagos de nómina</dt>
          <dd>{{ c.payments }}</dd>
        </div>
      </dl>

      <table>
        <caption>
          Resumen de pagos anuales (año gravable
          {{
            c.year
          }})
        </caption>
        <thead>
          <tr>
            <th scope="col">Concepto</th>
            <th scope="col" class="num">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Pagos laborales gravados (devengado bruto)</td>
            <td class="num">{{ c.grossPayments | cop }}</td>
          </tr>
          <tr>
            <td>Aportes obligatorios a salud</td>
            <td class="num">{{ c.mandatoryContributions.health | cop }}</td>
          </tr>
          <tr>
            <td>Aportes obligatorios a pensión</td>
            <td class="num">{{ c.mandatoryContributions.pension | cop }}</td>
          </tr>
          <tr>
            <td>Fondo de solidaridad pensional</td>
            <td class="num">{{ c.mandatoryContributions.solidarityFund | cop }}</td>
          </tr>
          <tr>
            <td><strong>Total aportes obligatorios</strong></td>
            <td class="num">
              <strong>{{ c.mandatoryContributions.total | cop }}</strong>
            </td>
          </tr>
          <tr>
            <td>Retención en la fuente practicada</td>
            <td class="num">{{ c.withholding | cop }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>Neto pagado</td>
            <td class="num">{{ c.netPaid | cop }}</td>
          </tr>
        </tfoot>
      </table>

      <p class="note" role="note">{{ c.note }}</p>
    </ui-printable-sheet>
  `,
})
export class IncomeCertificateSheet {
  protected readonly branding = inject(BrandingService);
  readonly certificate = input.required<IncomeCertificate>();
  protected readonly today = shortDate(isoDate());
}
