import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CopCurrencyPipe, DateEsPipe } from '../../../shared/ui';
import { UiPrintableSheet } from '../../../shared/ui';
import { categoryLabel, formatDay, monthLabel } from '../data-access/finance-labels';
import type { ChargeDocument } from '../data-access/finance.models';

/** Cuenta (factura) de cobro informativa de un cargo, con sello "PAGADO" si no tiene saldo. */
@Component({
  selector: 'app-charge-document-sheet',
  imports: [UiPrintableSheet, CopCurrencyPipe, DateEsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let d = doc();
    <ui-printable-sheet
      [institutionName]="d.schoolName"
      [nit]="d.schoolNit"
      documentTitle="Cuenta de cobro"
      [documentNumber]="'N.º ' + d.documentNumber"
      issuedAt="Documento informativo"
    >
      <div class="row">
        <section>
          <h3>Cobrar a</h3>
          <p class="strong">{{ d.student.fullName }}</p>
          <p>
            Código <span class="font-mono">{{ d.student.code }}</span>
            @if (d.student.documentNumber) {
              · Doc. <span class="font-mono">{{ d.student.documentNumber }}</span>
            }
          </p>
          @if (d.student.gradeName) {
            <p>
              {{ d.student.gradeName
              }}{{ d.student.classroomName ? ' · ' + d.student.classroomName : '' }}
            </p>
          }
          @if (d.student.guardianName) {
            <p>Acudiente: {{ d.student.guardianName }}</p>
          }
        </section>
        <dl>
          <div>
            <dt>Fecha de emisión</dt>
            <dd>{{ fmtDay(d.issueDate) }}</dd>
          </div>
          <div>
            <dt>Vencimiento</dt>
            <dd>{{ fmtDay(d.charge.dueDate) }}</dd>
          </div>
          <div>
            <dt>Mes</dt>
            <dd>{{ month(d.charge.period) }}</dd>
          </div>
        </dl>
      </div>
      <table>
        <thead>
          <tr>
            <th scope="col">Concepto</th>
            <th scope="col">Categoría</th>
            <th scope="col" class="num">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              {{ d.conceptName }}
              <small class="muted">{{ d.charge.description }}</small>
            </td>
            <td>{{ category(d.conceptCategory) }}</td>
            <td class="num font-mono">{{ d.charge.amount | cop }}</td>
          </tr>
        </tbody>
      </table>
      <dl class="totals">
        <div>
          <dt>Subtotal</dt>
          <dd class="font-mono">{{ d.charge.amount | cop }}</dd>
        </div>
        @if (d.charge.discountAmount > 0) {
          <div>
            <dt>Descuento</dt>
            <dd class="font-mono">− {{ d.charge.discountAmount | cop }}</dd>
          </div>
        }
        @if (d.charge.taxAmount > 0) {
          <div>
            <dt>IVA ({{ d.charge.taxRate }} %)</dt>
            <dd class="font-mono">{{ d.charge.taxAmount | cop }}</dd>
          </div>
        }
        <div>
          <dt>Total</dt>
          <dd class="font-mono">{{ d.charge.netAmount | cop }}</dd>
        </div>
        <div>
          <dt>Abonos</dt>
          <dd class="font-mono">− {{ d.charge.paidAmount | cop }}</dd>
        </div>
        <div class="grand">
          <dt>Saldo a pagar</dt>
          <dd class="font-mono">{{ d.charge.pendingAmount | cop }}</dd>
        </div>
      </dl>
      @if (d.isPaid) {
        <p class="stamp" aria-label="Pagado">PAGADO</p>
      } @else if (d.charge.status === 'cancelled') {
        <p class="stamp stamp--void" aria-label="Anulado">ANULADO</p>
      }
      <div uiSheetFooter class="foot">
        <p>
          Este documento es informativo y no reemplaza la factura electrónica de venta. Impreso el
          {{ printedAt | dateEs: 'datetime' }}.
        </p>
      </div>
    </ui-printable-sheet>
  `,
  styles: `
    h3 {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 0.25rem;
    }
    .strong {
      font-weight: 700;
      font-size: 1rem;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    dl {
      display: grid;
      gap: 0.25rem;
    }
    dl > div {
      display: flex;
      justify-content: space-between;
      gap: 2rem;
    }
    dt {
      color: #64748b;
    }
    dd {
      margin: 0;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1rem;
    }
    th,
    td {
      padding: 0.5rem;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
      vertical-align: top;
    }
    th {
      font-size: 0.7rem;
      text-transform: uppercase;
      color: #64748b;
    }
    small {
      display: block;
    }
    .num {
      text-align: right;
    }
    .muted {
      color: #64748b;
    }
    .totals {
      margin-left: auto;
      max-width: 20rem;
    }
    .grand {
      border-top: 2px solid #0f172a;
      padding-top: 0.25rem;
      font-size: 1rem;
      font-weight: 800;
    }
    .stamp {
      margin: 1.5rem auto 0;
      width: fit-content;
      padding: 0.4rem 1.5rem;
      border: 3px solid #15803d;
      color: #15803d;
      font-weight: 900;
      font-size: 1.5rem;
      letter-spacing: 0.2em;
      transform: rotate(-6deg);
    }
    .stamp--void {
      border-color: #b91c1c;
      color: #b91c1c;
    }
    .foot {
      text-align: center;
      font-size: 0.75rem;
      color: #64748b;
    }
  `,
})
export class ChargeDocumentSheet {
  readonly doc = input.required<ChargeDocument>();
  protected readonly printedAt = new Date();
  protected readonly fmtDay = formatDay;
  protected readonly month = monthLabel;
  protected readonly category = categoryLabel;
}
