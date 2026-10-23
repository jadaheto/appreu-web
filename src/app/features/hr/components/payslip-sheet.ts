import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CopCurrencyPipe, UiPrintableSheet } from '../../../shared/ui';
import type { InstitutionProfile, PayslipDocument } from '../data-access/hr.models';
import { shortDate } from '../data-access/hr-ui';

/** `NIT-DV` del colegio. */
export function institutionNit(i: InstitutionProfile | null | undefined): string {
  if (!i?.nit) return '';
  return i.nitVerificationDigit ? `${i.nit}-${i.nitVerificationDigit}` : i.nit;
}

/**
 * Desprendible de pago imprimible (RR. HH. y portal del empleado). Muestra
 * exactamente las líneas y totales que calcula la API. Las acciones extra
 * (p. ej. "Volver") se proyectan con `[sheetActions]`.
 */
@Component({
  selector: 'app-payslip-sheet',
  imports: [UiPrintableSheet, CopCurrencyPipe, UpperCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './hr-document.scss',
  template: `
    @let d = doc();
    <ui-printable-sheet
      [institutionName]="d.institution.name"
      [nit]="nit()"
      [address]="d.institution.address ?? ''"
      [city]="d.institution.city ?? ''"
      [logoUrl]="d.institution.logo"
      documentTitle="Desprendible de pago"
      [documentNumber]="d.period.label"
      [issuedAt]="'Fecha de pago: ' + paymentDate()"
    >
      <div uiSheetActions><ng-content select="[sheetActions]" /></div>

      <dl class="facts">
        <div>
          <dt>Empleado</dt>
          <dd>{{ d.employee.fullName }}</dd>
        </div>
        <div>
          <dt>Documento</dt>
          <dd>{{ d.employee.document }}</dd>
        </div>
        <div>
          <dt>Código</dt>
          <dd class="code">{{ d.employee.code }}</dd>
        </div>
        <div>
          <dt>Período</dt>
          <dd>{{ d.period.name }}</dd>
        </div>
        <div>
          <dt>Cargo</dt>
          <dd>{{ d.employee.position || '—' }}</dd>
        </div>
        <div>
          <dt>Departamento</dt>
          <dd>{{ d.employee.department || '—' }}</dd>
        </div>
        <div>
          <dt>Contrato</dt>
          <dd>{{ d.employee.contract }}</dd>
        </div>
        <div>
          <dt>Días laborados</dt>
          <dd>{{ d.workedDays }}</dd>
        </div>
      </dl>

      <div class="cols">
        <table class="plus">
          <caption>
            + Devengados
          </caption>
          <tbody>
            @for (line of d.earnings; track line.label) {
              <tr>
                <td>{{ line.label }}</td>
                <td class="num">{{ line.amount | cop }}</td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr>
              <td>Total devengado</td>
              <td class="num">{{ d.grossTotal | cop }}</td>
            </tr>
          </tfoot>
        </table>
        <table class="minus">
          <caption>
            − Deducciones
          </caption>
          <tbody>
            @for (line of d.deductions; track line.label) {
              <tr>
                <td>{{ line.label }}</td>
                <td class="num">{{ line.amount | cop }}</td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr>
              <td>Total deducido</td>
              <td class="num">{{ d.deductionsTotal | cop }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="net" role="group" aria-label="Neto a pagar">
        <span>
          NETO A PAGAR
          <small>{{ d.netInWords }}</small>
        </span>
        <strong>{{ d.net | cop }}</strong>
      </div>

      @if (d.employerContributions.length) {
        <table class="informative">
          <caption>
            Aportes del empleador (informativo, no se descuentan)
          </caption>
          <tbody>
            @for (line of d.employerContributions; track line.label) {
              <tr>
                <td>{{ line.label }}</td>
                <td class="num">{{ line.amount | cop }}</td>
              </tr>
            }
          </tbody>
        </table>
      }

      <p uiSheetFooter>
        @if (d.employee.bank.maskedAccount) {
          Depositado en cuenta: {{ d.employee.bank.name || 'Banco' }} —
          {{ d.employee.bank.type | uppercase }} {{ d.employee.bank.maskedAccount }}
        } @else {
          Sin cuenta bancaria registrada.
        }
      </p>
    </ui-printable-sheet>
  `,
})
export class PayslipSheet {
  readonly doc = input.required<PayslipDocument>();

  protected readonly nit = computed(() => institutionNit(this.doc().institution));
  protected readonly paymentDate = computed(() => shortDate(this.doc().period.paymentDate));
}
